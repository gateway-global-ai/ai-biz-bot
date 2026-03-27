# Intent-driven shared canvas

Version: 1.1  
Status: Normative (customer entry UX + canvas handoff + menu synergy)

## Purpose

Describe how **customer-facing** surfaces (QR scan, `/biz/:slug`, `/agent/:slug`) move from **welcome** → **intent** → **voice/canvas** without asking the user to choose an abstract “OS menu” first. Platform marketing (`platform_landing`) may use a different idle pattern; see [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md).

## Intent + dynamic menus (synergy)

This spec and [AIOS_BUSINESS_PLAN_WIRING.md](./AIOS_BUSINESS_PLAN_WIRING.md) are **one story**:

1. **Intent-first** (this doc): The first screen is **not** a naked category tree — it is **welcome + “what brings you in?”** plus **actionable** [`OSMenuList`](../client/src/components/os/OSMenuList.tsx) (see §Idle canvas modes). Menu rows behave as **intent chips** routed to views/tools.
2. **Dynamic menus** (business plan / wiring doc): Long-term, menu structure comes from **owner-defined or vertical templates** (`menuTree` onboarding, persisted JSON) mapped to `OSMenuItem[]` — same renderer, data-driven source.
3. **Presentation rules** (shared): [`menuPresentationRules.ts`](../shared/menuPresentationRules.ts) applies **after** items exist: split if too many top-level options, **voice lists top N** before “more options” — so intent prompts and the visual list stay aligned.

**Today:** `useOSMenu` supplies **templates** + skill gates; `IntentFirstIdleChrome` adds the intent frame. **Next:** feed merged menu output through `menuPresentationRules` for voice copy and overflow UI.

See §Recommended wiring order in [AIOS_BUSINESS_PLAN_WIRING.md](./AIOS_BUSINESS_PLAN_WIRING.md).

## Product framing

- **Buyable experience:** AI Front Desk — QR, voice (PTT), chat, forms, shared canvas.
- **Expansion:** AI OS, governance, multi-agent — after the first win, not as the hero headline.

## Journey (logical)

1. **Entry:** QR or link opens the shell (Concierge) with **dark shell / white canvas** invariants.
2. **Welcome:** Short greeting using business name from `site_configs` / `BusinessContext`.
3. **Identity layer (instant):** “Returning” vs “new” is **not** a personality claim — it is a **session** signal:
   - Existing customer session token (if any), Nova verification completion, or anonymous visitor.
   - **Do not** block voice on identity unless policy requires it (see intake / verification policy routes).
4. **Intent resolution:** First user action (tap menu item or voice utterance) **routes** to:
   - onboarding / intake form (when policy says so),
   - scheduling (when booking skill active),
   - general Q&A (concierge).
   - **Routing** is governed by agent policy + intake policy + communication governance — not raw UI strings.
5. **Shared canvas:** When the model/tool path uses `shared_canvas` ([`SharedCanvasPanel`](../client/src/components/voice/tools/SharedCanvasPanel.tsx)), structured lists **replace** ad-hoc prose for pricing, schedules, or checklists. **Execution-plane** voice code stays thin; **tool metadata** carries content.

## Idle canvas modes

| Mode | When | Idle content |
|------|------|----------------|
| `platform_marketing` | `business.id` is `platform_landing` (or equivalent) | Marketing idle (`idleContent` or OS overlay) — no “customer entry” banner. |
| `customer_entry` | Real business / public agent slug | **Intent-first chrome:** welcome + “What brings you in today?” **plus** actionable [`OSMenuList`](../client/src/components/os/OSMenuList.tsx) (intent chips are menu items, not decoration). |

See §Idle Canvas Modes in [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md).

## Forms and prefill

- **Principle:** “The system fills itself out with you” — server/tool metadata may include `prefill` / `initialValues` for manual inputs; **only missing fields** are emphasized in the prompt.
- **Client:** [`ManualDataInput`](../client/src/components/voice/tools/ManualDataInput.tsx) accepts optional initial value from tool metadata when `ToolRouter` passes `metadata.prefill` or `metadata.initialValue`.
- **Server:** Tool builders and prompt compiler own field lists — not UI.

## Related

- [AIOS_BUSINESS_PLAN_WIRING.md](./AIOS_BUSINESS_PLAN_WIRING.md) — maps `AIOS_BUSINESS_PLAN.md` (agents, Safe Mode, dynamic menus) to code and gaps  
- [VOICE_CONCIERGE_OPENING_PROTOCOL.md](./VOICE_CONCIERGE_OPENING_PROTOCOL.md)  
- [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md)  
- [VIEW_REGISTRY.md](./VIEW_REGISTRY.md) — `intent_entry`, `shared_form_canvas`  
- [EXECUTION_PLANE_BOUNDARY_SPEC.md](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
