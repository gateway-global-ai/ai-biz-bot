# Shared Canvas V1 — Canvas API contract (Concierge / voice tools)

> **⚠️ DEPRECATION NOTICE (Canvas Control Syscall Layer — v1.0)**
>
> The legacy `show_canvas` Gemini tool path and `shared_canvas` tool routing are in the **adapter phase** per `canvas_control.md §20`.
> All new canvas surfaces MUST use the **Canvas Control Syscall Layer**:
> - Endpoint: `POST /api/canvas-control` with a `CanvasSyscallEnvelope`
> - Canvas state is owned by `VoiceTurnOrchestrator`, not Gemini tool calls
> - `setPinnedCanvas(msg.metadata)` is permanently banned (SYSTEM_MANIFEST.md — Single Mutation Path Rule)
>
> **Migration path:** `transcript.final` → `VoiceTurnOrchestrator.handleFinalTranscript()` → `canvas.resolve` syscall → `canvas.render` syscall → `SpeechGroundingContext` → Gemini narrates.
>
> See: [`shared/canvasViewContract.ts`](../../shared/canvasViewContract.ts), [`server/routes/canvasControlRoutes.ts`](../../server/routes/canvasControlRoutes.ts)

**Status:** Legacy — adapter phase active, removal pending `p5-deprecate` confirmation.
**Primary implementation:** [`client/src/components/voice/tools/SharedCanvasPanel.tsx`](../../client/src/components/voice/tools/SharedCanvasPanel.tsx)
**Tool routing:** [`client/src/components/voice/tools/ToolRouter.tsx`](../../client/src/components/voice/tools/ToolRouter.tsx) (`toolType === 'canvas_control'` is the new path; `'shared_canvas'` is the legacy adapter)
**Model tool:** `show_canvas` in [`server/config/geminiToolDeclarations.ts`](../../server/config/geminiToolDeclarations.ts) — **LEGACY ADAPTER, tagged for removal**

---

## 1. Core concept

**What it is:** The **shared canvas** is the white-zone panel inside Concierge where the agent can show **structured** content (lists, schedules, FAQs, checklists) while speaking. It pairs **voice** (sequential, attention-heavy) with **visual** (parallel scan) bandwidth.

**When to use**

| Channel | Use shared canvas when… |
|--------|-------------------------|
| Voice + Concierge | Presenting **multi-item** information (menus, pricing rows, time slots, FAQs, checklists). |
| Chat transcript alone | Short answers are fine; use canvas when the user would benefit from **scanning** while listening. |

**When *not* to use it**

- Single-sentence answers.
- Internal reasoning, chain-of-thought, or debug traces (**forbidden** on customer and marketing-demo surfaces — see rules).
- Replacing mandatory secure forms when policy requires a dedicated intake view (`VIEW_REGISTRY` / `ManualDataInput`).

**Runtimes (do not confuse)**

| Runtime | Canvas mechanism |
|--------|-------------------|
| **Concierge + Gemini Live** | Tool metadata → `ToolRouter` → `SharedCanvasPanel` (this doc). |
| **os-core** | [`SharedCanvasProvider`](../../os-core/src/shell/SharedCanvasProvider.tsx) — **separate** stack; not covered by `canvas_type` below. |

---

## 2. Canonical types (from code)

`metadata.canvas_type` **must** be one of:

`service_menu` | `schedule` | `pricing_table` | `faq_list` | `intake_checklist` | `business_summary` | `custom_card`

**Top-level metadata** (matches `SharedCanvasPanel` + Gemini declaration):

| Field | Required | Type / notes |
|-------|----------|----------------|
| `canvas_type` | Yes | Union above |
| `title` | Yes | string — header |
| `subtitle` | No | string |
| `items` | Yes | array of **CanvasItem** (may be empty array; avoid empty UX — see rules) |
| `cta_label` | No | string — bottom button label |
| `cta_action` | No | `book` \| `call` \| `form` \| `link` — paired with `cta_label` |
| `accent_color` | No | `indigo` \| `emerald` \| `amber` \| `rose` (default `indigo`) |

**CanvasItem** (each element of `items`):

| Field | Required | Description |
|-------|----------|-------------|
| `label` | Yes* | *Gemini schema marks all item fields optional; UI assumes at least `label` for sensible rendering. |
| `value` | No | Answer, slot, or secondary line |
| `description` | No | Supporting copy |
| `price` | No | e.g. `"$49/mo"` |
| `duration` | No | e.g. `"30 min"` |

Server tool declaration required keys: `canvas_type`, `title`, `items` ([`geminiToolDeclarations.ts`](../../server/config/geminiToolDeclarations.ts)).

---

## 3. Per-type reference

### 3.1 `service_menu`

- **Purpose:** List services or options the user can tap; selection sends context back via voice (`onTriggerSpeech`).
- **Required:** `canvas_type`, `title`, `items` (each with at least `label`).
- **Optional:** `subtitle`, `cta_*`, `accent_color`, per-item `price`, `duration`, `description`.
- **Render:** [`ServiceMenuItem`](../../client/src/components/voice/tools/SharedCanvasPanel.tsx) rows; tap triggers `handleServiceSelect`.
- **Example payload:**

```json
{
  "canvas_type": "service_menu",
  "title": "Our services",
  "subtitle": "Tap one to hear more",
  "items": [
    { "label": "Haircut", "price": "$35", "duration": "45 min", "description": "Cut and style" },
    { "label": "Color", "price": "$120" }
  ],
  "cta_label": "Book now",
  "cta_action": "book",
  "accent_color": "indigo"
}
```

---

### 3.2 `schedule`

- **Purpose:** Time slots with per-row **Book** action.
- **Required:** `canvas_type`, `title`, `items` (`label` = slot label).
- **Optional:** `subtitle`, `cta_*`, `accent_color`, item `description`.
- **Render:** [`ScheduleItem`](../../client/src/components/voice/tools/SharedCanvasPanel.tsx) + Book → `onTriggerSpeech` with slot text.

```json
{
  "canvas_type": "schedule",
  "title": "Available times",
  "items": [
    { "label": "Tue 2:00 PM", "description": "60 min slot" },
    { "label": "Wed 10:00 AM" }
  ],
  "accent_color": "emerald"
}
```

---

### 3.3 `pricing_table`

- **Purpose:** Same **row layout** as `service_menu` in the current implementation (list with optional price/duration).
- **Required:** `canvas_type`, `title`, `items`.
- **Optional:** Same as service_menu.
- **Render:** Shared with `service_menu` branch in `SharedCanvasPanel`.

```json
{
  "canvas_type": "pricing_table",
  "title": "Plans",
  "items": [
    { "label": "Starter", "price": "$49/mo", "description": "Voice + chat" },
    { "label": "Pro", "price": "$99/mo" }
  ],
  "cta_label": "Help me choose",
  "cta_action": "form",
  "accent_color": "amber"
}
```

---

### 3.4 `faq_list`

- **Purpose:** Expand/collapse FAQ rows (`value` / `description` shown when open).
- **Required:** `canvas_type`, `title`, `items`.
- **Optional:** `subtitle`, `cta_*`, `accent_color`.
- **Render:** [`FaqItem`](../../client/src/components/voice/tools/SharedCanvasPanel.tsx).

```json
{
  "canvas_type": "faq_list",
  "title": "Common questions",
  "items": [
    { "label": "Hours?", "value": "Mon–Sat 9–6" },
    { "label": "Parking?", "description": "Free lot behind the building" }
  ]
}
```

---

### 3.5 `intake_checklist`

- **Purpose:** Checklist; toggles call `onContextUpdate` with bracketed checklist text (voice context).
- **Required:** `canvas_type`, `title`, `items`.
- **Optional:** `subtitle`, `cta_*`, `accent_color`.
- **Render:** [`ChecklistItem`](../../client/src/components/voice/tools/SharedCanvasPanel.tsx).

```json
{
  "canvas_type": "intake_checklist",
  "title": "Before we start",
  "items": [
    { "label": "Confirm your phone number" },
    { "label": "Review cancellation policy", "description": "24h notice" }
  ]
}
```

---

### 3.6 `business_summary`

- **Purpose:** High-level summary cards (same row component as menu/pricing in code).
- **Required:** `canvas_type`, `title`, `items`.
- **Optional:** Full item fields + CTA.
- **Render:** `ServiceMenuItem` branch.

```json
{
  "canvas_type": "business_summary",
  "title": "About us",
  "subtitle": "Quick facts",
  "items": [
    { "label": "Founded", "value": "2018" },
    { "label": "Specialty", "description": "Family-owned bakery" }
  ],
  "cta_label": "Get directions",
  "cta_action": "link"
}
```

---

### 3.7 `custom_card`

- **Purpose:** Flexible list-style content when no other type fits (same row renderer as menu).
- **Required:** `canvas_type`, `title`, `items`.
- **Optional:** Same as above.
- **Render:** `ServiceMenuItem` branch.

```json
{
  "canvas_type": "custom_card",
  "title": "Details",
  "items": [{ "label": "Note", "description": "Anything structured and scannable" }]
}
```

---

## 4. Mapping layer (governance ↔ runtime ↔ tool)

| Layer | Artifact | Role |
|-------|----------|------|
| Governance | [`VIEW_REGISTRY.md`](../../docs-governance/canonical/VIEW_REGISTRY.md) — `shared_form_canvas` | Declares view category, context keys, actions (`submit_tool_result`, `cancel_tool`), policy gates for PII. |
| Runtime UI | `SharedCanvasPanel` | Renders `metadata` into the Concierge canvas zone. |
| Tool routing | `ToolRouter` `case 'shared_canvas'` | Dispatches tool UI from voice message `metadata.tool_type`. |
| Agent / model | `show_canvas` tool | LLM supplies JSON matching the declaration; client receives it as tool metadata. |
| Server ack | [`toolHandler.ts` `show_canvas`](../../server/services/toolHandler.ts) | Acknowledges execution (does not re-render canvas — client owns UI). |

---

## 5. Rules (product + UX)

1. **No reasoning on canvas** — Do not stream model chain-of-thought, tool debug, or “thinking” blocks into `SharedCanvasPanel`. Marketing-demo and public surfaces must stay **customer-safe** (see [`DEMO_SURFACE_V1_SLICE.md`](../product/DEMO_SURFACE_V1_SLICE.md)).
2. **Match intent** — Canvas content should reflect what the agent is **saying** (same topic; avoid contradictory titles vs spoken script).
3. **Avoid empty shells** — Prefer at least one meaningful `items[]` row; empty list feels broken.
4. **Actionable CTAs** — When the next step is book / call / form / link, set `cta_label` + `cta_action` so the user can tap instead of guessing.
5. **Complement `customer_ready_v1`** — Readiness guarantees a **response path**; canvas guarantees **structured quality** of what appears on screen during that response.

---

## 6. Relation to readiness

- **`customer_ready_v1`** ([`CUSTOMER_READY_V1.md`](../product/CUSTOMER_READY_V1.md)) — Site + identity + response path exist so the agent can answer.
- **`SHARED_CANVAS_V1` (this doc)** — How the agent should **package** multi-item answers when using `show_canvas` / `shared_canvas`.

---

## Document history

| Date | Notes |
|------|--------|
| 2026-03-25 | Initial V1 contract from `SharedCanvasPanel` + `geminiToolDeclarations` |
