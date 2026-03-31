---
status: canonical
truth_domain: governance
enforced_by: .cursorrules (Tier 1), intent-loop-governance.mdc
last_verified: 2026-03-30
spec_id: shell_containment_rule
spec_version: "1.0.0"
---

# Shell containment rule (Concierge / AI OS)

## One-sentence law

**The AI OS is a conversational shell that opens intent-bound experiences inside the shell; it is not a multipage website with chat attached.**

## What the Concierge is

- **Chat-native operating shell**: one primary conversational surface.
- **Canvas is subordinate**: temporary in-shell experiences (forms, pickers, summaries) appear and clear; they are not standalone “pages” or persistent site navigation.
- **Intent drives the active experience**: utterances and explicit intent chips refine what appears; routing tables must not substitute for intent resolution where the product promises OS behavior.

## Shell containment (normative)

Unless an action is **explicitly classified** into one of the exceptions below, **all standard user actions resolve inside the active Concierge shell**:

- No `window.location` / full document navigation for product flows.
- No SPA route change **as the default** for “menu” items that are really intents (use in-shell dispatch: `openExperience` / canvas syscall / typed action).
- No persistent **website-style** menu strip that implies multipage IA for the same session.

### Exceptions (explicit classes only)

Out-of-shell navigation is allowed only when governance labels the action as:

1. **External handoff** — e.g. legal, billing portal, third-party OAuth (declared in route/action registry).
2. **Authenticated admin area** — operator tools that are intentionally separate surfaces (still governed; not mixed into anonymous public Concierge as default).
3. **Irreversible system transition** — e.g. destructive account actions with confirmation (policy-bound).
4. **Approved deep-link workflow** — registered in `LOGICAL_ROUTE_REGISTRY.md` with required context keys and gates.

Everything else **stays in-shell**.

## UX model (target)

| Phase | Behavior |
|--------|----------|
| **Neutral shell** | Short greeting + “What would you like to do today?” Optional **intent chips** (not site nav). |
| **Intent recognized** | Open an **in-shell experience** (canvas view + voice grounding). |
| **Experience active** | Actions stay inside shell + canvas; state is **experience-scoped**. |
| **Done** | Close experience → return to neutral shell (or switch intent). |
| **Return later** | Optional **resume** at intent-session layer — not “restore pinned website chrome” from storage. |

## Implementation vocabulary

- Prefer **`activeExperience` / `ActiveExperienceState`** (metadata + `CanvasRenderPayload`) over “pinned canvas” as the primary product term.
- **Do not** use `sessionStorage` to simulate persistent “pinned” navigation for standard experiences; resumability belongs to a future **intent session** store with explicit policy.

## Related

- [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md) — intent-as-loop, merge order.
- [`VOICE_FIRST_INTERFACE_PIPELINE_V1.md`](./VOICE_FIRST_INTERFACE_PIPELINE_V1.md) — forward path, canvas syscall authority.
- [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) — logical routes vs browser adapters; exceptions must be declared.
