# Canvas Bandwidth Doctrine

Reference document for the **Programmatic Sales Engine** skill on the Gateway Global AI OS. This doctrine defines how voice, canvas, and channel escalation work together to maximize effective communication bandwidth while staying within governance (VIEW_REGISTRY, ARCH, skills, and execution-plane boundaries).

---

## 1. The Bandwidth Principle

### Dual channels

- **Voice** is the **attention channel**. It is sequential (one utterance at a time), ephemeral (hard to re-scan), and narrow-band (limited working memory for lists, numbers, and spatial relationships). Listeners cannot “scroll back” without asking for repetition.

- **Canvas** is the **information channel**. It is parallel (scan multiple fields at once), persistent (visible until dismissed or replaced), and wide-band (tables, images, forms, structured layouts). Users can verify, compare, and correct without burdening the audio channel.

### Phone lines as entry, not destination

- **Phone lines are entry points, not destinations.** PSTN and similar narrowband entry should route the customer toward higher-bandwidth experiences where appropriate, not trap the entire journey in audio-only mode when the task demands structure or visuals.

### Agent responsibility

- The agent’s job is to **maximize communication bandwidth** by **pairing voice with canvas Views** when the task benefits from both: voice for rapport, pacing, and confirmation; canvas for data density, comparison, and capture.

### Governance of Views

- **Views** are not arbitrary UI. They are **governed UI states** declared in [`docs-governance/VIEW_REGISTRY.md`](../../../../docs-governance/VIEW_REGISTRY.md), with required context keys, categories, and allowed actions. Canvas behavior must map to declared views and contracts, not ad-hoc components invented at runtime.

---

## 2. ARCH Token Enforcement and View Escalation

### ARCH as per-agent budget

- **ARCH** (Acknowledge / Reflect / Context / Handoff) defines **per-section token budgets** per agent. It constrains how much prose the system may emit in each conversational move before it must change shape (shorter text, structured output, or UI).

### When budget is exceeded: render a View

- When a response would **exceed the ARCH budget**, the agent **must** move dense or structured content to a **View** (canvas or other declared surface) rather than reading long lists or tables aloud.

### Enforcement surfaces

- **`archEnvelopeValidator.ts`** (`server/services/archEnvelopeValidator.ts`) enforces ARCH constraints on **text paths**, with **deterministic fallback or replacement** when envelopes violate policy.

- **`outputContract.maxSentences`** enforces **voice brevity** per conversation phase so spoken output stays within the intended attention budget.

### Domains where escalation is critical

Escalation to canvas (or equivalent Views) is especially critical for:

- **Travel**: flight and hotel lists with thumbnails, fare rules, and comparison dimensions.
- **E-commerce**: product catalogs, variants, and imagery.
- **Service businesses**: service menus, packages, and add-ons.
- **Pricing**: tables, matrices, and structured breakdowns.

### Operator control

- **Business owners configure ARCH profiles per agent** to control communication style (how much reflection, how much context, when to hand off) while the platform enforces hard limits and deterministic validation.

---

## 3. Channel Escalation as Pre-Decided Skills

### Skills vs. runtime improvisation

- **Channel selection** is codified as **skills** in `siteConfigs.config.skills`, **not** as unconstrained agent runtime reasoning about “maybe I should text them a link.”

- This **separates system reasoning from guest reasoning**:
  - **System reasoning** (channel choice, View selection, format, token budget) is **pre-decided by developers and operators** via registries, skills, and contracts.
  - **Guest reasoning** (rapport, discovery, qualification, objection handling, closing) uses the agent’s **full cognitive budget** within those rails.

### Channel escalation skill: Phone to SMS to Canvas

When a customer calls a phone line:

1. **Capture caller identity** from PSTN/Twilio (caller ID and policy-compliant handling of consent and opt-in).
2. **Send an SMS invite** to that number (where permitted): e.g. continue the conversation with `[Business]` at `[link]`.
3. **Customer opens** the web/canvas experience for **full bandwidth** (forms, menus, confirmations).
4. **Phone may remain** as fallback or parallel channel, but the **target state** is the governed canvas experience when the skill applies.

### View-oriented skills (pre-decided examples)

| Skill id (conceptual) | Role |
|----------------------|------|
| `channel_escalation` | Phone to SMS invite to web canvas. |
| `canvas_pricing` | Pricing and packages **always** render on `SharedCanvasPanel` (or equivalent declared View), not as long spoken lists. |
| `canvas_confirmation` | Bookings and appointments **always** use canvas **form** Views for capture and verification. |
| `canvas_demo` | Demos use canvas for interactive or visual content; **voice narrates** without carrying the entire information load. |

Exact skill names and payloads must align with site config schema and governance docs; the table describes **intent**, not a license to bypass registry validation.

---

## 4. Token Governance in Multi-Modal Operation

When **voice and canvas** are active together:

- **Voice**: Short, tight output bounded by **`outputContract.maxSentences`** (and ARCH sections). Spoken text should **orient and confirm**, not duplicate the canvas.

- **Canvas**: **Structured View rendering**—prefer **schema-validated JSON** and declared View payloads over free-form prose rendered as walls of text in the shell.

- **Example**: Voice says something like “Here’s your pricing breakdown—on your screen you’ll see the line items” while the canvas renders the **pricing table View**. The user **verifies** on screen; the model does not burn tokens enumerating every row aloud.

- **Economics**: Spoken **LLM tokens** are relatively **expensive** and **error-prone** for dense data; **canvas rendering** of structured data is comparatively **cheap** and **reviewable**. Multi-modal design should exploit that asymmetry deliberately.

---

## 5. Existing Infrastructure (Gateway Global AI OS)

Use these hooks and components as the **canonical wiring** for bandwidth-aware behavior:

- **`shouldRecommendCanvasHandoff`** in `server/services/conversationGrounding.ts`: Deterministic hook that evaluates whether the channel is **narrowband** and the **task** needs **structured or visual** content—signal for recommending canvas handoff without ad-hoc prompt hacks.

- **`SharedCanvasPanel`** (`client/src/components/voice/tools/SharedCanvasPanel.tsx`): Renders **structured content** from **tool metadata** into the shared canvas zone.

- **`ManualDataInput`** (`client/src/components/voice/tools/ManualDataInput.tsx`): Form inputs with **optional prefill** from context, keeping sensitive or detailed capture off pure voice where appropriate.

- **View categories** (see VIEW_REGISTRY.md): `menu`, `form`, `controller`, `inspector`, `confirmation`, `refusal`, `ptt_first`, `intent_entry`, `shared_form_canvas`, and other declared categories define what the shell may show and how actions attach.

- **`docs-governance/INTENT_DRIVEN_CANVAS_SPEC.md`**: Customer entry UX pattern (welcome to intent selection to voice/canvas pairing).

- **`docs-governance/APP_SHELL_CONTRACT.md`**: **Shell vs. canvas** zone separation and layout obligations so bandwidth strategy does not violate shell governance (e.g. PTT-first, zone colors, footer slots).

---

## 6. View Design Rules for Sales Phases

### Phase-level canvas hints

- Every **funnel phase** should declare a **`canvasViewHint`** (or equivalent governed field) describing **what the canvas shows** in that phase—menu, demo asset, pricing table, confirmation form, etc. This keeps sales flow **inspectable** and **consistent** across agents and industries.

### Phase guidance

| Phase | Canvas role (typical) |
|-------|------------------------|
| **Capture** | Welcome plus **intent menu** (`OSMenuList` or declared menu View with business-specific items). |
| **Demo** | Sample interactions, before/after scenarios, testimonials—**visual or structured** where possible; voice summarizes. |
| **Pricing** | Plan comparison, feature matrix, ROI or calculator Views—**never** rely on reading full matrices aloud. |
| **Confirmation** | Booking form, payment summary, **next-steps checklist**—explicit verification on canvas. |

### Governance

- Views are **governed**: **no ad-hoc rendering** of business-specific layouts outside declared Views; **no component-level business logic** that bypasses action registry, schema anchors, and prompt compiler boundaries.

---

## 7. Grounding Theory Foundation

This section ties OS behavior to **communication and grounding** research (see also `user_uploads/prompt_shape_behavior.md` in-repo notes).

### Shared visual workspace

- **Grounding theory**: A **shared visual workspace** lowers the **cost of achieving common ground**—both parties can point to the same structure (literally or figuratively) without repeated verbal repair (“the second one—no, the other second one”).

### Context window vs. UI

- When **context** exceeds what voice or short text can hold in working memory, **switching to UI** increases **effective bandwidth** and reduces **repair** (clarification loops, misheard numbers, wrong option selected).

### Narrowband audio

- **Narrowband PSTN audio** (roughly **300–3400 Hz**) is “low bandwidth” in part because it is **frequency-limited**, which affects intelligibility and fatigue; even with perfect ASR, the **attention channel** remains sequential and ephemeral.

### Reviewability

- The **canvas** provides **reviewability** and **structured verification**—checkboxes, totals, dates, names—that **voice alone** cannot match. Designing for canvas is not cosmetic; it is **cognitive load management** and **error reduction**.

---

## Summary

**Maximize bandwidth** by pairing **voice** (attention, sequential) with **canvas Views** (information, parallel). Enforce **ARCH** and **`maxSentences`** on voice; push lists, images, and forms to **declared Views**. Encode **channel and canvas behavior** as **pre-decided skills** in site config, not as unconstrained model improvisation. Use **existing services and components** (`conversationGrounding`, `SharedCanvasPanel`, `ManualDataInput`, VIEW_REGISTRY, INTENT_DRIVEN_CANVAS_SPEC, APP_SHELL_CONTRACT) as the implementation spine. Ground the approach in **shared workspace theory**: less repair, clearer common ground, better outcomes for sales and service funnels.
