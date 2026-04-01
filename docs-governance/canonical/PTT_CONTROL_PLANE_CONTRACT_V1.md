---
status: canonical
truth_domain: architecture
enforced_by:
  - execution-plane-boundary.mdc
  - sovereign-chat-lockdown.mdc
  - brand-tokens.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-31
aliases:
  - ROUTE_AUTHORITY_HIERARCHY_V1
  - ENTRY_POINT_AUTHORITY_V1
---

# PTT Control Plane Contract v1

## Purpose

Define PTT as the **governed turn initiator** of the AI OS — the state manager, governance tool, and control-plane entry point at the human boundary.

PTT is not a UI button. It is where user intent becomes a governed turn, where state transitions become explicit, and where the control plane decides what the system is allowed to do next.

## Companion artifacts

| Artifact | Location |
|----------|----------|
| TypeScript types | `shared/pttTurnContract.ts` |
| Entry-point registry | `registry-yaml/entry-points.yaml` |
| Session node contract | `docs-governance/canonical/PTT_SESSION_NODE_V1.md` |
| Intent loop governance | `docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md` |
| Canvas OS tool mandate | `docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md` |
| Footer slot contract | `.cursorrules` § Footer Slot Contract |

---

## 1. Turn states

```
idle -> listening -> processing -> resolving -> rendering -> speaking -> idle
```

| State | Description |
|-------|-------------|
| `idle` | PTT not pressed; system awaiting user intent |
| `listening` | PTT held; audio capture active; partial transcripts flowing |
| `processing` | PTT released; final transcript captured; system classifying |
| `resolving` | Intent loop running — actor/lifecycle/domain resolution, policy evaluation, view/action derivation |
| `rendering` | Canvas syscall committed; UI state transitioning to committed view |
| `speaking` | Grounded speech playing; model narrating within committed canvas state only |

Return to `idle` after speech completes. Audit record persisted at boundary.

### State ownership

The `VoiceTurnOrchestrator` is the sole owner of turn state transitions. No other component may advance, skip, or reset state.

---

## 2. Ingress envelope

Every PTT turn produces a structured envelope before the model gets authority:

```typescript
interface PttTurnEnvelope {
  turnId: string;
  sessionId: string;
  siteConfigId: string;
  actorClass: IntentLoopActorClass;
  actorRole?: string;
  channel: 'voice_ptt';
  transcript: string;
  currentViewId: string | null;
  lifecycleStage: IntentLoopLifecycleStage | IntentLoopManagementStage;
  securityLevel: 'anonymous' | 'phone_verified' | 'admin';
  visitorId?: string;
  entryMode: EntryPointMode;
  siteRuntimeRef: string;
  timestamp: number;
}
```

The envelope carries everything the control plane needs to constrain the turn. The model never sees the raw envelope — it sees the policy-filtered context derived from it.

---

## 3. Policy handoff

The turn envelope passes through these stages in order:

1. **Intent observation** — A/L/D state vector resolution
2. **Role/journey merge** — actor class + lifecycle stage
3. **Policy evaluation** — allowed views, allowed actions, knowledge levels, entitlements
4. **Canvas resolve/render** — committed view state
5. **Grounded speech constraints** — model narrates within committed state only

### Governed outcomes

Each turn resolves to exactly one governed outcome:

| Outcome | Description |
|---------|-------------|
| `navigate` | Move to a different view |
| `inspect` | Display data without mutation |
| `clarify` | Ask the user for more information |
| `mutate` | Execute a state change (requires policy authorization) |
| `escalate` | Route to a higher authority or different agent |
| `refuse` | Deny the request with explanation |
| `handoff` | Transfer to human or external system |

These outcomes are not inferred loosely by the model. They are resolved by the OS through policy, allowed actions, and current state.

---

## 4. Canvas synchronization covenant

This covenant is inviolable. Breaking it breaks the OS.

1. PTT commits the turn to the state machine
2. Canvas resolves and renders the committed view
3. Model narrates **within** the committed canvas state only
4. Speech grounding context is sent **after** canvas render, never before
5. If canvas render fails, speech degrades to safe acknowledgment — never hallucinates a view that did not render

The purpose: what the user sees and what the user hears must describe the same committed state. No divergence.

---

## 5. Interruption rules

| Rule | Description |
|------|-------------|
| One active turn | Only one turn may be active at a time |
| Barge-in | During `speaking`, a new PTT press cancels current speech and returns to `idle` |
| No overlap | Overlapping intents are structurally impossible — PTT serializes them |
| Timeout | `processing` state times out to `idle` after configurable window (prevents hung turns) |
| Retry | Transient failures may retry a bounded number of times, then degrade to `idle` with safe message |

---

## 6. Audit requirements

Every turn persists:

| Field | Description |
|-------|-------------|
| `turnId` | Unique identifier for this turn |
| `sessionId` | Session container |
| `actorClass` | Resolved actor |
| `transcript` | Raw user input |
| `resolvedViewId` | What canvas view was committed |
| `resolvedActions` | What actions were allowed/executed |
| `policyOutcome` | Which governed outcome was selected |
| `violations` | Any policy violations detected (may be empty) |
| `evidenceRefs` | Links to tool calls, knowledge items used |
| `durationMs` | Time from `listening` to `idle` |
| `timestamp` | ISO timestamp |

---

## 7. Internal command mode vs customer mode

Same loop. Different actor context.

| Mode | Actor class | Policy gates | Entry point |
|------|-------------|--------------|-------------|
| Customer | `customer` | Public entitlements, tenant config | `/ptt/:domain/public` or `/ptt/:domain/public-splash` |
| Operator | `management` or `employee` | `cmd.*` gates, internal view/action registry | `/ptt/gateway/public-gate` |

The PTT interface does not change between modes. The envelope changes — `actorClass`, `securityLevel`, `entryMode` — and the policy plane constrains accordingly.

---

## 8. Route authority hierarchy

This is not navigation depth. It is an **authority hierarchy**.

> **Levels 0 and 1 define the system. Levels 2 through 4 express the system.**

### 8.1. The five authority levels

```
L0 — Identity Authority     PROTECTED. No agent-generated mutation.
L1 — System Authority        PROTECTED. No agent-generated mutation.
L2 — Domain Category         Governed expansion allowed.
L3 — App Surface             Agent-buildable with review.
L4 — Task Surface            Primary autonomous expansion layer.
```

### 8.2. Level definitions

**L0 — Identity Authority (PROTECTED)**

Defines who the actor is. If agents can mutate identity semantics, the OS loses trust.

Contains: authenticated actor, actor class resolution, role mapping, tenant/site scope (`siteConfigId`), session binding.

Runtime path: `UnifiedOtpForm` -> phone -> OTP -> verify -> `customer_accounts` row. Admin path: same OTP -> `admin_users` -> `resolveActorClass` -> operator mode.

**L1 — System Authority (PROTECTED)**

Defines the system's top-level ontology — the primary intent map of the OS.

Contains: core system domains (the 4 menu categories), top-level command structure, global control surfaces (the 3 footer controls), system menu frame, entry-point class definitions.

The 4 permanent menu categories: Canvas & Personalization, Share & Connect, Session, Agent.

The 3 footer controls: Mute, Overlay toggle (Eye), Screen resizer.

**L2 — Domain Category (governed expansion)**

Items within an L1 category. Initial set defined by architect. Coding agents can add new items to existing categories, review-gated.

**L3 — App Surface (agent-buildable with review)**

Concrete application surfaces on the canvas opened by L2 items. Specific views with routes, actions, and data displays.

**L4 — Task Surface (primary expansion layer)**

Drill-downs, detail views, forms, wizards, task actions, workflow-specific UI. Highest expansion freedom for the coding swarm.

### 8.3. Governance rules

**Protected levels (L0-L1):**

- No coding agent direct mutation
- No autonomous generation
- No promotion without architect review
- Changes require doctrine/constitution alignment
- Immutable except by explicit architect/governance task

**Expandable levels (L2-L4):**

- Coding agents may propose and build
- Must use registry-backed routes/views/actions
- Must pass review gates
- Must stay within `allowed_domains` jurisdiction
- Must produce `LocalAgentOutput` structured evidence

### 8.4. Jurisdiction matrix

| Level | Who writes | Who expands | Review |
|-------|-----------|-------------|--------|
| L0 Identity Authority | Architect | Nobody | N/A — locked |
| L1 System Authority | Architect | Nobody | N/A — locked |
| L2 Domain Category | Architect (initial) | `coding_agent` | Required |
| L3 App Surface | Architect (initial) | `coding_agent` + `ui_agent` | Required |
| L4 Task Surface | Agents | `coding_agent` + `ui_agent` | Required |

---

## 9. Entry-point authority

The PTT entry point is the only canonical entry point. Everything else is deprecated.

### 9.1. Three entry-point classes

```
/ptt/:domain/public          Direct public entry. No auth, no splash.
/ptt/:domain/public-splash   Public entry with branded intro layer. No auth.
/ptt/:domain/public-gate     Publicly reachable, auth-gated before runtime.
```

These are L1 System Authority — protected, not agent-mutable.

### 9.2. Entry-point behavior

**`/ptt/:domain/public`** — Direct public entry. Bypass splash, bypass auth. Load domain runtime immediately. Resolve to start view or idle command surface.

**`/ptt/:domain/public-splash`** — Public entry with branded intro. Render tenant-configured splash first. Optional `auto_continue_seconds` for timed auto-dismiss. Then enter same public runtime.

**`/ptt/:domain/public-gate`** — Auth-gated entry. Route is externally visible (shareable URL, QR-codeable). Tenant configures auth requirement before runtime access.

Auth strength levels:

| Strength | Method | Use case |
|----------|--------|----------|
| Light | OTP only | Low-risk guest access |
| Standard | OTP + tenant record match | Customer account surfaces |
| Strong | Nova Verify / 123CheckMe | Billing, sensitive data, internal tools, operator portals |

### 9.3. Entry-point resolution chain

```
browser path
  -> entry-point registry lookup
    -> resolve entry_mode (public | public_splash | public_gate)
    -> resolve domain (siteConfigId / slug)
    -> resolve splash config (if splash mode)
    -> resolve gate policy (if gate mode)
    -> resolve initial logical_route_id
    -> resolve linked_view_id
    -> boot PTT runtime with resolved context
```

Browser paths are adapters. The entry-point registry is authority.

### 9.4. Entry-point rules

- Entry-point definitions are L1 System Authority — protected, not agent-mutable
- The three entry-point classes (`public`, `public_splash`, `public_gate`) are canonical and fixed
- Tenants configure which classes their domain exposes, plus splash and gate options
- No coding agent may invent a new entry-point class
- No coding agent may create browser routes outside `/ptt/:domain/*`
- Entry points resolve into the logical route registry, not directly into components

### 9.5. Relationship between hierarchies

**Hierarchy A — Authority Depth** (what you can do once inside):

L0 Identity Authority -> L1 System Authority -> L2 Domain Category -> L3 App Surface -> L4 Task Surface

**Hierarchy B — Entry-Point Mode** (how you enter):

`public` -> `public_splash` -> `public_gate`

Entry-point mode determines: whether auth is required before runtime boot, what the initial view is, what actor class is assumed before auth, what policy gate applies at the door.

Authority hierarchy determines: what the actor can see and do once inside the runtime, which L2-L4 surfaces are available for their role.

**Entry points decide how a user enters the OS. Views decide what they see. Policy decides what they can do.**

---

## 10. Footer slot contract

The PTT footer is L1 System Authority. Fixed at 110px height, `bg-[#0f172a]`.

### Layout

```
| LEFT 20%          | CENTER 50%      | RIGHT 20%          |
| Mute | Overlay Eye | [  PTT BUTTON  ]| Screen Size | Menu |
```

### Slot residents

| Slot | Icon | Function | Authority |
|------|------|----------|-----------|
| Left 1 | Mute | Real-time audio toggle | L1 — permanent |
| Left 2 | Eye | Overlay toggle — show/hide canvas helper UI | L1 — permanent |
| Center | PTT | Governed turn initiator — min 50% width | L1 — permanent |
| Right 1 | Maximize | Screen resizer — floating/fixed/fullscreen cycle | L1 — permanent |
| Right 2 | Menu | 1-to-many — identity gate (anon: OTP) or menu overlay (auth) | L1 — permanent |

### Menu button behavior

- **Anonymous user taps Menu**: OTP login flow renders on canvas (not a separate page). On success, menu opens automatically.
- **Authenticated user taps Menu**: Frosted overlay on canvas with L1 category sections (Canvas & Personalization, Share & Connect, Session, Agent).

### Identity gate principle

> **Experience is free, persistence is identity-gated.**

Browse, preview, and converse without logging in. The moment a user wants to keep something (save background, add to favorites, persist chrome settings), the system asks who they are.

---

## 11. Absolute prohibitions

- NEVER allow a coding agent to mutate L0 or L1 artifacts
- NEVER allow a model to free-run without a governed turn boundary
- NEVER send speech grounding context before canvas render is committed
- NEVER create browser routes outside `/ptt/:domain/*` for new development
- NEVER bypass the ingress envelope — every PTT turn must produce one
- NEVER allow overlapping turns — PTT serializes intent
- NEVER treat the PTT footer as a flexible layout — slot residents are L1 permanent
- NEVER invent a new entry-point class beyond `public`, `public_splash`, `public_gate`
