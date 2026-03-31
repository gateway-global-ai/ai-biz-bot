---
status: canonical
truth_domain: governance
enforced_by: brand-tokens.mdc, canvas-os-tool-mandate.mdc, VISUAL_INTEGRITY_GOVERNANCE_V1.md
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
---

# Style Approval Policy (v1)

## Purpose

**Style** is a separate approval plane from **components** (`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`). A component can be approved while a **styling pattern** is not. This policy defines **approved** vs **forbidden** style dimensions for governed OS surfaces.

## Layer 1 — Design tokens (canonical sources)

| Source | Role |
|--------|------|
| [`client/src/config/brand.ts`](../../client/src/config/brand.ts) | `SHELL`, `CANVAS`, `BRAND`, `CANVAS_BG_CLASSNAME`, DISC/ARCH |
| [`@gateway/design-tokens`](../../packages/design-tokens/README.md) | Re-export / future single import path for apps |
| [`client/src/index.css`](../../client/src/index.css) | Scoped CSS variables (e.g. `.telephony-canvas` — `--background`, `--foreground`, `--primary`, …) |

New semantic colors for **canvas** must be added to tokens + this policy before use in production.

## Approved patterns

| Category | Rule |
|----------|------|
| **Spacing** | Tailwind scale aligned to OS (e.g. `p-4`, `gap-3`); no arbitrary `p-[13px]` without waiver |
| **Radius** | `rounded-sui` / `rounded-2xl` per Jason Standard; outer canvas cards use governed radius |
| **Shadow** | Token-level or design-system presets only |
| **Motion** | Framer Motion with presets from governance skill; no random spring on canvas without registry |
| **Semantic colors** | `slate-*`, `indigo-*` (primary electric), `emerald-*` success — see `brand-tokens.mdc` |

## Forbidden (governed surfaces)

| Pattern | Reason |
|---------|--------|
| React `style={{ ... }}` for **presentation** | Use tokens / `CANVAS_BG_CLASSNAME` / CSS vars — see `VISUAL_INTEGRITY_GOVERNANCE_V1.md` |
| Arbitrary hex in JSX / class strings | Except via imported token constants |
| `bg-[#rrggbb]` literal arbitrary values | Use token-derived classes |
| One-off absolute positioning for canvas “layout invention” | Use approved layout components (SDK) |
| Purple as primary brand | Reserved per `brand-tokens.mdc` |

## Enforcement (current vs future)

| Mechanism | Status |
|-----------|--------|
| Grandfather baseline (`visual-integrity-inline-style-baseline.json`) | **Active** (CI) |
| Regex anti-artboard on changed files | **Active** |
| **ESLint** rule for `style={{` in new files | Planned |
| **Import lint**: canvas paths may only import `@gateway/canvas-sdk` + tokens | **Planned** — see `UI_COMPONENT_APPROVAL_REGISTRY_V1.md` |

## Related

- [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](./VISUAL_INTEGRITY_GOVERNANCE_V1.md)
- [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md)
