---
name: intent-driven-canvas
description: Intent-first customer idle canvas + shared form/canvas prefill — governed UX for QR and public agents.
---

# Intent-driven shared canvas

## When to use

- Changing **customer-facing** Concierge idle UX (not `platform_landing` marketing).
- Adding **shared canvas** or **manual input** tool behavior and prefill.
- Before editing [`APP_SHELL_CONTRACT.md`](../../docs-governance/APP_SHELL_CONTRACT.md) or [`VIEW_REGISTRY.md`](../../docs-governance/VIEW_REGISTRY.md).

## Source of truth

1. [`docs-governance/INTENT_DRIVEN_CANVAS_SPEC.md`](../../../docs-governance/INTENT_DRIVEN_CANVAS_SPEC.md) — journey, idle modes, forms.
2. [`docs-governance/VIEW_REGISTRY.md`](../../../docs-governance/VIEW_REGISTRY.md) — `intent_entry`, `shared_form_canvas`.
3. Client: [`IntentFirstIdleChrome.tsx`](../../../client/src/components/os/IntentFirstIdleChrome.tsx), [`ConciergePanel.tsx`](../../../client/src/components/chat/ConciergePanel.tsx) idle branch.

## Hard rules

- **Do not** remove `OSMenuList` on idle — intent-first is **chrome + menu**, not menu deletion.
- **Do not** change Gemini Live / `server/geminiVoice.ts` for this feature.
- **Do not** put long system prompts in UI — use compiler / site config per prompt governance.

## Quick test

- Open `/biz/ai-biz-bots` (or `VITE_PUBLIC_DEMO_SLUG`) or a real `/biz/:slug`: idle canvas shows welcome line + menu.
- Open `/` platform home: no customer-entry chrome on platform concierge (marketing overlay handles entry).
