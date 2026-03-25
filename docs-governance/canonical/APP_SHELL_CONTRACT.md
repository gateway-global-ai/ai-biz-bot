---
status: canonical
truth_domain: ui
enforced_by: brand-tokens.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---
# App Shell Contract

## Purpose
Define the persistent operating surface for the OS. The shell owns layout, mode switching, context display, and conversational navigation. It does not own business logic.

**Related:** [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) (shell vs canvas tokens and `@/ui` contract).

## `App.tsx` rule
`App.tsx` may bootstrap the OS. It may not define the OS.

Allowed in `App.tsx`:
- providers
- router mount
- shell mount
- global bootstrapping

Forbidden in `App.tsx`:
- business logic
- prompt logic
- giant route trees
- deployment-specific branching
- domain orchestration

## Persistent shell elements
- `ContextBar`
- breadcrumb stack
- `ConversationalNavController`
- `ChatOSContainer`
- primary canvas
- persistent PTT surface

## Shell modes
- `menu`
- `view`
- `confirmation`
- `refusal`
- `ptt_first`

## Mode transitions
- `menu -> view`
- `view -> confirmation`
- `confirmation -> execution`
- `execution -> result`
- `result -> menu`
- `menu -> refusal`
- `view -> refusal`

## Rules
- Shell elements remain mounted during logical routing.
- Browser URL changes do not unmount the shell.
- The conversational controller may not invent routes; it must use resolver outputs.
- The chat container renders shared UI state through governed view contracts.

---

## Zone Invariants (Non-Negotiable)

### Shell Zones — Always Dark (`#0f172a`)

The following elements use `SHELL.bg` from `client/src/config/brand.ts` unconditionally:

- **Header** — ClearVoice AI logo + connection dot
- **Visualizer band** — voice wave bars + connection status
- **PTT footer** — button row + status bar

These zones NEVER change color based on `isSovereign`, `ownerMode`, `role`, `shellMode`, or any other conditional. They are dark by definition.

### Canvas Zone — Always White (`#ffffff`)

The content area (between visualizer and footer) uses `CANVAS.bg` unconditionally. No conditional based on `isSovereign` or `plan`.

### Logo Invariant

The ClearVoice AI logo (`clear_voice_ai_dark_sm.png`) renders unconditionally in the header. It is NEVER replaced by generic text, role icons, or "Command Center" labels. The logo is a permanent brand element.

---

## Footer Slot Contract

```
[  Mute   ] [  Share  ] [     PTT BUTTON (50%)     ] [  Reconnect  ]
  ← 20% →                   ← center, min 140px →      ← 20% →
```

**Left 20%:** Two permanent slots — Mute icon + Share/QR icon.
- Both are always visible and always functional.
- Adding a button adds to the left cluster. It never displaces an existing slot.

**Center:** PTT button.
- Minimum 50% of footer width.
- Minimum 140px wide, maximum 220px.
- Must have 3D depth: `shadow-[0_4px_0_rgba(0,0,0,0.5)]` at rest, elevated when active.

**Right 20%:** Reconnect button — always present.

---

## Idle Canvas Rule

When `messages.length === 0` (no conversation yet), the canvas must render actionable content — specifically `<OSMenuList>` with items from `useOSMenu(role, isAuthenticated)`.

The canvas must NOT display only decorative elements (blobs, connection orbs, or standalone `<AIOSMark />`) when idle. A decorative element may accompany `OSMenuList`, not replace it.

### Idle canvas modes (platform vs customer entry)

Intent-first UX **does not** remove the menu — it **frames** it.

- **`customer_entry`** (public business / `/agent/:slug` / `/biz/:slug` where `business.id` is not `platform_landing`): The canvas **may** render a short **intent-first chrome** above `OSMenuList`: welcome line + "What brings you in today?" (or equivalent). The menu remains **actionable** (`OSMenuList`); optional copy is not a substitute for menu items.
- **`platform_marketing`** (`platform_landing` or `idleContent` supplied by parent): Parent may replace the default idle canvas entirely (e.g. homepage OS overlay). **Do not** apply customer-entry chrome on the platform marketing surface.

**Normative detail:** [INTENT_DRIVEN_CANVAS_SPEC.md](./INTENT_DRIVEN_CANVAS_SPEC.md).

---

## Breadcrumb Prohibition

No breadcrumb navigation element is registered in the View Registry or Action Registry. Do not render breadcrumbs in the canvas. The canvas uses voice-first menu navigation via `OSMenuList`, not breadcrumb path display.
