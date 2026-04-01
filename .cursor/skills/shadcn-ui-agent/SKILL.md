# SHADCN_UI_AGENT_SKILL

**Runtime boundary:** Shadcn MCP is **design-time / Cursor / local ui_agent** only — not called by Gemini voice, swarm provisioning, or skill deployment at live runtime. Canonical: [`docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md`](../../docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md).

## Identity
**Skill ID:** `shadcn-ui-agent`
**Agent:** `ui_agent` (local_agent_plane, qwen2.5-coder:7b, operationalMode: UI_BUILDER)
**Activation:** Read this skill, then follow every section in order before dispatching to the ui_agent.

---

## Design Dependency (Required)

Before any UI generation, the ui_agent MUST read and apply:
- `.cursor/skills/ui-design-governance/SKILL.md` -- visual constants, layout rules, proficiency rubric, prohibited patterns
- `client/src/config/brand.ts` -- `ICON_SIZES`, `TOUCH_TARGETS`, `FOOTER_ZONE`, color tokens

Violation of design constants (e.g. literal `size={22}` without token import, hardcoded button heights, intent views not at full-canvas width) is treated the same as a jurisdiction violation.

---

## When to Activate This Skill

Use this skill when:
- Adding new admin screens, control-plane panels, or Design Studio views
- Creating or extending components inside `client/src/ui-core/`
- Adding new pages under `client/src/pages/admin/` or `client/src/pages/agents/`
- Reviewing a UI task that references `@/ui-core`, `SovereignButton`, `SovereignCard`, or any `Sovereign*` component
- A task involves shadcn/ui component discovery or promotion candidacy

Do **NOT** use this skill for:
- Any changes to `server/**`, `migrations/**`, or `shared/schema.ts`
- Voice pipeline components (`client/src/services/voice/**`)
- Gemini visualizer, DISC sliders, or ARCH sliders — these are locked governance surfaces
- Full migration of legacy Tailwind screens — scope is new surfaces only

---

## Governance Invariants (Non-Negotiable)

These rules are sourced directly from `docs-governance/canonical/AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`,
`docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md`, and `server/services/designStudioPromptFragments.ts`.

| Rule | Detail |
|------|--------|
| **@/ui-core is the ONLY import path** | Never `import { Button } from "@mui/material"` in feature/page code. Always `import { SovereignButton } from "@/ui-core"` |
| **Shadcn is discovery_only** | Never `import { ... } from "@/components/ui/button"` or any raw shadcn path in product code. Shadcn is only for browsing via MCP. |
| **No inline styles** | `style={{ ... }}` is forbidden. Use Tailwind classes and `@/config/brand.ts` tokens only. |
| **No raw hex colors** | Only token bundles: `light-apple`, `dark-apple`, `crystal-glass`. Import `SHELL`, `CANVAS`, `BRAND` from `@/config/brand.ts`. |
| **Framer Motion required** | All interactive card components must import `motion` from `framer-motion`. Standard entrance: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`. |
| **rounded-sui (24px)** | All primary container outer wrappers use `rounded-sui`. Never `rounded-xl` or `rounded-lg` for outer containers. |
| **review_required: true** | All ui_agent task completions are gated behind human review before merging to production. |

---

## Discovery Flow (shadcn MCP → Promotion → ui_agent)

```
1. DISCOVER
   Prefer the repo **shadcn.io catalog MCP** (stdio): `scripts/shadcn-io-catalog-mcp.ts` → tools
   `shadcn_io_search`, `shadcn_io_list`, `shadcn_io_get`, `shadcn_io_about` (index from
   [shadcnio/react-shadcn-components](https://github.com/shadcnio/react-shadcn-components) README + ai/panel, ai/canvas).
   The remote `https://www.shadcn.io/api/mcp` URL often returns **405** with Cursor SSE — do not rely on it.
   Optional second server: official ui.shadcn.com MCP (`npx shadcn@latest mcp`) under a different server name if needed.
   This is READ-ONLY discovery. No output from discovery goes directly to product code.

2. EVALUATE
   Assess the candidate against gateway-sdk-manifest.yaml.
   Check: does an equivalent Sovereign* wrapper already exist in client/src/ui-core/?
   If yes → use the existing wrapper. Do not re-introduce the raw shadcn version.

3. PROMOTE (human-gated)
   If a genuinely new component is needed:
   a. Open a task to add an entry to registry-yaml/gateway-sdk-manifest.yaml
      with promotion_status: under_review
   b. Create a Sovereign* wrapper in client/src/ui-core/ that wraps the MUI or
      shadcn primitive and applies Sovereign tokens
   c. Only after the wrapper exists does ui_agent use it in product code

4. GENERATE
   Dispatch to ui_agent via POST /api/local-agent/task with taskType: "ui"
   The agent imports exclusively from @/ui-core.
   Output contract: { files_touched, assumptions, blockers, result }
   All results carry review_required: true.
```

---

## Dispatching a ui_agent Task

```typescript
// POST /api/local-agent/task
{
  "agentRoleType": "ui_agent",
  "siteConfigId": "<site-config-id>",
  "taskType": "ui",
  "prompt": "Create a SovereignCard-based admin panel at client/src/pages/admin/MyPanel.tsx
             using @/ui-core imports only. No inline styles. No raw MUI. No raw shadcn.",
  "context": {
    "targetFile": "client/src/pages/admin/MyPanel.tsx",
    "existingComponents": ["SovereignCard", "SovereignButton", "SovereignInput"]
  }
}
```

The route will:
1. Run `checkJurisdiction` — blocks if prompt references `server/**`, voice files, or forbidden patterns
2. Load RAG context from `localAgentKnowledgeContext` (taskType: "ui")
3. Call qwen2.5-coder:7b with the governed system prompt
4. Parse structured output `{ files_touched, assumptions, blockers, result }`
5. Store `raw_model_output`, `parse_error`, `files_touched_json`, `review_required: true`
6. Return the result with `reviewRequired: true`

---

## ui_agent Jurisdiction

**Allowed domains:**
- `client/src/ui-core/**`
- `client/src/pages/**`
- `client/src/components/**`
- `client/src/config/**`
- `client/src/hooks/**`
- `client/src/lib/**`

**Forbidden domains:**
- `server/**`
- `migrations/**`
- `shared/schema.ts`
- `client/src/services/voice/**`
- `client/public/clear-voice-processor.js`

**ui_agent-specific violation patterns** (checked in `checkJurisdiction`):
- Inline style reference: `style={{` in prompt → `ui_inline_style_violation`
- Raw MUI import: `@mui/material` in prompt → `ui_raw_mui_import_violation`

---

## Source of Truth References

| Document | Purpose |
|----------|---------|
| `docs-governance/canonical/AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` | Complete Design Studio spec and 8-phase pipeline |
| `docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md` | UI governance rules for admin/control-plane surfaces |
| `registry-yaml/gateway-sdk-manifest.yaml` | Governed component list, promotion status per component |
| `server/services/designStudioPromptFragments.ts` | Compiled prompt fragments for phase-aware generation |
| `client/src/ui-core/index.ts` | Barrel export of all Sovereign* wrappers |
| `client/src/config/brand.ts` | Token source of truth (SHELL, CANVAS, BRAND, DISC_COLORS, ARCH_COLORS) |
| `tests/local-agent-aptitude.ts` | Gold test suite — UI_ category cases validate jurisdiction |

---

## Prohibited Actions (Will Cause Violations)

- Calling `style={{ backgroundColor: '#...' }}` — inline style, governance violation
- Importing `@mui/material` directly — raw MUI, governance violation
- Importing `@/components/ui/button` or any raw shadcn path — discovery_only violation
- Touching `server/routes/**` or `migrations/**` — forbidden domain
- Modifying ConciergePanel shell dimensions (56px/64px/110px fixed) — brand lockdown violation
- Adding voice pipeline code — sovereign voice lockdown violation
