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

## Related rules

- `.cursor/rules/brand-tokens.mdc`
- `.cursor/rules/canvas-os-tool-mandate.mdc`
- `.cursor/rules/governed-ui-sdk.mdc`
