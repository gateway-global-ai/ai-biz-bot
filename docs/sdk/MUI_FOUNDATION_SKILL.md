# MUI Foundation Skill (Sovereign AI OS)

**Purpose:** Cursor/agent skill specification for adopting **Material UI Community** as the **single approved base kit** for **new** admin and control-plane surfaces, behind a thin **Sovereign UI layer** (`ui-core`), without full-repo migration or UI drift.

**Canonical outputs (run the skill → produce/update):**

| Artifact | Path |
|----------|------|
| Foundation plan | [`docs/ux/SOVEREIGN_UI_FOUNDATION_PLAN.md`](../ux/SOVEREIGN_UI_FOUNDATION_PLAN.md) |
| Component map | [`docs/ux/SOVEREIGN_UI_COMPONENT_MAP.yaml`](../ux/SOVEREIGN_UI_COMPONENT_MAP.yaml) |
| UI governance rules | [`docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md`](../ux/SOVEREIGN_UI_GOVERNANCE_RULES.md) |
| This spec | `docs/sdk/MUI_FOUNDATION_SKILL.md` |

**Cursor skill entry:** [`.cursor/skills/mui-foundation/SKILL.md`](../../.cursor/skills/mui-foundation/SKILL.md)

---

## Directive (spawn prompt — short)

Spawn a governed MUI Foundation Skill using **Material UI Community** as the approved base kit for **new** admin/control-plane surfaces. Draft a thin Sovereign UI layer (`ui-core`), wrapped v1 components, domain control-plane widgets, UI governance rules, and an adoption plan that **avoids raw MUI sprawl**, **avoids full repo migration**, **preserves brand identity**, and **preserves domain visualizations** (Gemini visualizer, DISC/behavioral IS, orchestration visuals) as **domain layer** — integrate or re-skin only; do not replace with generic MUI.

---

## Non-negotiable rules

1. **MUI Community only** for v1 base (`@mui/material` + Emotion peers). Optional: `@mui/x-data-grid` Community when a real table need exists.
2. MUI does **not** replace governance, shell contracts, view/action registry, or meta-prompt law.
3. After `ui-core` exists: **no raw `@mui/*` imports** in app routes/pages under the control-plane policy (see governance doc).
4. **Thin wrappers** — not a second full design system.
5. Preserve **logo and sovereign brand tokens** where shell/canvas rules apply ([`client/src/config/brand.ts`](../../client/src/config/brand.ts), [`brand-tokens.mdc`](../../.cursor/rules/brand-tokens.mdc)).
6. Optimize for **clarity, speed, operational trust** — not novelty.
7. **No full migration** of legacy Tailwind/shadcn surfaces unless a screen is explicitly in scope.
8. **Domain visualizations are sacred:** Concierge **visualizer band**, Gemini-adjacent UX, **DISC / behavioral** showcases (e.g. `DiscVisualizer`), orchestration/system-state visuals — **treat as domain components**; **do not** rewrite as generic MUI charts. Optional wrap for layout consistency only.

---

## v1 packages

```bash
npm install @mui/material @emotion/react @emotion/styled
# Only when a concrete table need exists:
# npm install @mui/x-data-grid
```

**MUI X Charts** (e.g. [`@mui/x-charts` quickstart](https://mui.com/x/react-charts/quickstart/#installation)): add **only** if a control-plane screen needs charts and team accepts the extra peer surface; prefer **wrapping** under `ui-core` if adopted. Not default v1.

---

## Skill outputs — required sections (per artifact)

Each artifact must include: **purpose**, **scope**, **required rules**, **recommended structure**, **blocked / deferred**, **v1 vs later**.

---

## Success condition

A clear, governed plan for a thin MUI-based Sovereign UI layer usable for **new** admin/control-plane work **without** a second unmanaged design system **and** without destroying **domain-specific** visualization components.

---

## Execution constraints (skill run)

- Draft **architecture and file plan**; optional minimal code only if explicitly requested in the same task.
- Do not rewrite broad UI surfaces.
- Do not migrate the whole repo.
- Do not build a large component catalog in one pass.
