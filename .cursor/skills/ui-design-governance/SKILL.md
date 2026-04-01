---
name: ui-design-governance
description: Governed customer-facing UI for agents — empty states, canvas, tokens, and proficiency bar for “beautiful by default” surfaces.
---

# UI Design Governance (Agent Skill)

Use this skill when building or reviewing **customer-facing** UI (Concierge canvas, idle shells, intent chips, governed views). Goal: interfaces pass **visual proficiency** — clear hierarchy, legible contrast, no developer cruft (CLI strings, ad-hoc hex), **centered empty states** where appropriate.

## Non-negotiables

1. **Brand tokens** — Zone backgrounds and canvas text from `client/src/config/brand.ts` (`SHELL`, `CANVAS`, `BRAND`). No purple-as-primary; canvas zone stays white per existing rules.
2. **Canvas OS mandate** — `docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md` + `VISUAL_INTEGRITY_GOVERNANCE_V1.md`. Prefer `@/components/ui/*` (shadcn/Radix) + tokens over bespoke CSS.
3. **Empty / idle states** — Mirror **ChatGPT-style** patterns: **vertically and horizontally centered** content in the canvas, one primary headline, **minimal** helper copy (avoid stacked “explainer” paragraphs). Suggestion actions = **short chips** or a tight grid; no “section headers” like “Try an intent” unless product explicitly requires it.
4. **No install/CLI copy** in customer UI — Design-time `npx shadcn …` belongs in docs or dev tools only.
5. **Proficiency test mindset** — If a surface looks like a wireframe, a terminal dump, or top-left aligned “documentation,” it fails. Ship centered layout, readable type scale (`text-xl`–`text-2xl` for primary title on idle), and consistent spacing (`gap-6`–`gap-8` between blocks).

## Patterns (reference implementations)

- **Platform idle shell** — `IntentFirstIdleChrome` + `ShellIntentChips` inside `ConciergePanel` (centered flex column, `max-w-2xl`).
- **AI OS simple shell** — `AiOsIdleCanvas` (logo + headline + search row, centered).
- **Background picker** — `ShadcnBackgroundPickerView` (shadcn `Accordion` + `Button`, light theme on white canvas).

## When automating for “agents building UI”

- **Beautiful in production** means **governed views**: `viewId` + typed payloads + registry-backed renderers + promoted components — **not** free-form HTML from models. Keep that distinction hard; otherwise “polish” becomes a loophole for drift.
- New primitives go through **registry / approval** (`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`) and **Shadcn MCP** promotion path when adding palette components.

## Idle / empty state — acceptance rubric

Use this checklist for **code review**, **screenshot review**, and **agent self-check** before shipping or merging idle/empty UI. Visual sloppiness is a **product reliability** issue, not taste.

| # | Requirement |
|---|-------------|
| 1 | Content is **vertically and horizontally centered** within the canvas (empty canvas is a moment of orientation, not a dashboard). |
| 2 | **One primary headline** only (scale discipline: e.g. `text-xl`–`text-2xl` range for idle). |
| 3 | **At most one** secondary line of context (referrer, welcome subtitle). |
| 4 | **No helper paragraphs** unless required for task completion or compliance; voice-first shells should not sound nervous or over-explain at rest. |
| 5 | Starter chips are **visually grouped and centered**; chips speak for themselves — no redundant section labels (“Try an intent”). |
| 6 | **Menu grid** (OS menu, etc.) uses the **same content width** as the stack above (e.g. `max-w-2xl mx-auto w-full`) so the shell is not fragmented. |
| 7 | **No implementation language** visible to end users (CLI, install commands, internal slugs). |
| 8 | **QR / transfer** and other idle variants follow the **same compositional contract** as the default idle shell (one branch must not feel like a different product). |
| 9 | Voice / on-screen copy **matches affordances** (what you can do = what the UI shows). |
| 10 | **Screenshot pass** at **desktop and mobile** widths before release. |

**Failure mode:** “Technically rendered” without meeting the rubric = **proficiency failure**, not a subjective nit.

## Hard Design Constants

All layout and sizing decisions MUST use governed tokens from `client/src/config/brand.ts`. Using literal pixel values is a governance violation equivalent to hardcoding hex colors.

### Icon Sizes (import `ICON_SIZES` from `@/config/brand`)

| Token | Value | Usage |
|-------|-------|-------|
| `footerControl` | 24px | Footer slot buttons (chat, visual, menu) |
| `footerPrimary` | 28px | PTT mic icon (primary action) |
| `menuItem` | 22px | System menu list items |
| `canvasControl` | 20px | In-canvas controls (close, back, settings) |
| `statusIndicator` | 14px | Connection dots, status badges |

### Touch Targets (import `TOUCH_TARGETS` from `@/config/brand`)

| Token | Value | Usage |
|-------|-------|-------|
| `footerButton` | 48px | Footer button containers (WCAG AAA mobile) |
| `menuItem` | 44px | Menu list row minimum height |
| `chip` | 36px | Intent chips, suggestion chips |

### Footer Zone (import `FOOTER_ZONE` from `@/config/brand`)

| Token | Value | Usage |
|-------|-------|-------|
| `height` | 120px | Total footer zone height -- constitutional |
| `statusStripHeight` | 24px | Logo + connection status strip |
| `logoHeight` | 36px | Clear Voice AI logo in status strip |
| `slotWidthPercent` | 22/46/16 | Left/Center/Right slot allocation |

### Visualizer Zone (import `VISUALIZER_ZONE` from `@/config/brand`)

| Token | Value | Usage |
|-------|-------|-------|
| `ringRadiusFactor` | 0.28 | Circular pulse ring radius as fraction of min(w,h) |
| `logoSize` | 140px | AIOS logo SVG size inside visualizer |
| `logoOpacity` | 0.85 | AIOS logo opacity |

### Sovereign UI Component Library

All UI surfaces must use Sovereign wrappers from `@/ui-core` — never raw shadcn or MUI imports.
Design token files live in `client/src/ui-core/tokens/`: `designTokens.ts`, `componentTokens.ts`, `motionTokens.ts`.
See `.cursor/rules/sovereign-ui-sdk.mdc` for the full governance rule.

### Footer Button Contract

Every footer button MUST have:
1. An icon at `ICON_SIZES.footerControl` (or `footerPrimary` for PTT)
2. A text label below the icon: `text-[10px] font-medium uppercase tracking-wider`
3. A container at minimum `TOUCH_TARGETS.footerButton` (48px) height
4. No `h-12`, `h-14`, or other hardcoded heights

### Canvas Intent View Rules

- Intent views (triggered by chips, voice, or menu) render at **100% W x 100% H** of the canvas content zone
- When active, ALL idle chrome (helper panels, chips, accordion cards, OS menu) is hidden
- No `<details>` accordion cards on the idle canvas for controls that exist in the system menu
- Each intent view has a single close/back affordance at `ICON_SIZES.canvasControl`

### Prohibited Patterns

| Pattern | Violation |
|---------|-----------|
| `size={22}` or any literal pixel value on icons | `ungoverned_icon_size` |
| `h-12`, `h-14` hardcoded button heights | `ungoverned_touch_target` |
| `max-w-2xl` on intent overlay containers | `intent_view_not_fullscreen` |
| `<details>` accordion duplicating system menu controls | `duplicate_control_surface` |
| Footer button without text label | `missing_button_label` |

## Related rules

- `.cursor/rules/brand-tokens.mdc`
- `.cursor/rules/canvas-os-tool-mandate.mdc`
- `.cursor/rules/governed-ui-sdk.mdc`
- `.cursor/rules/canvas-intent-views.mdc`
