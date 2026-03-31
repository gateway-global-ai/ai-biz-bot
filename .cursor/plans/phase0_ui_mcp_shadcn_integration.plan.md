---
name: Phase 0 — UI MCP + shadcn.io integration
overview: "**Blocking PR** — Install and run the governed **design-time UI stack** (shadcn.io HTTP MCP, docs, skill↔component matrix, planning cross-links) so the system has a **indexed, repeatable UI path** before other agent/workflow work. Operator canvas and promotion rules stay per SHADCN_MCP_PLANE_BOUNDARY. Completes before Phase 1 of [dcp_intent_loop_dogfood.plan.md](dcp_intent_loop_dogfood.plan.md)."
todos:
  - id: p0-ui-mcp-config
    content: ".cursor/mcp.example.json + MCP_SETUP — shadcn.io URL https://www.shadcn.io/api/mcp; remove/comment @shadcn-ui/mcp-server; SerpApi via doppler mcp:generate"
    status: pending
  - id: p0-ui-governance-docs
    content: "docs-governance/artifacts/SHADCN_IO_OPERATOR_INTEGRATION_V1.md + optional SHADCN_IO_SKILL_COMPONENT_MATRIX_V1.md; React AI Canvas as in-canvas component; link shadcn-ui-agent skill"
    status: pending
  - id: p0-ui-index-catalog
    content: "Index shadcn.io AI catalog (curated map); connect matrix to Track 1b planning HOW + VIEW/ACTION/UI registries crosslinks"
    status: pending
  - id: p0-ui-sanitize-draft
    content: "user_uploads/ui-control_plane.md — strip cite placeholders OR note superseded sections; title vs filename disambiguation"
    status: pending
  - id: p0-ui-verify
    content: "Operator verification — Cursor lists shadcn MCP tools; npm run governance:visual-integrity if client paths touched"
    status: pending
isProject: false
---

# Phase 0 — UI MCP / shadcn.io integration (distinct PR)

**Parent plan:** [dcp_intent_loop_dogfood.plan.md](dcp_intent_loop_dogfood.plan.md) — this track is **Phase 0A** and **blocks** DCP-lite, intent loop completion, dogfood, and inventory until **done** (alongside Phase 0B Workspace).

**Strategic premise:** The platform does not function for real work without **UI wired through governed discovery → registry → canvas**. This PR makes the **shadcn.io MCP** and **documented UI resource index** operational and **connected to planning intake** (HOW + views/surfaces), not a side quest.

## Scope (in)

- **[`.cursor/MCP_SETUP.md`](.cursor/MCP_SETUP.md)** — Runbook steps for **SerpApi** (`doppler run -- npm run mcp:generate`) and **shadcn.io** HTTP MCP per [shadcn.io MCP for Cursor](https://www.shadcn.io/mcp/cursor).
- **[`.cursor/mcp.example.json`](.cursor/mcp.example.json)** — `url` for shadcn.io; legacy `npx @shadcn-ui/mcp-server` deprecated/commented.
- **`docs-governance/artifacts/SHADCN_IO_OPERATOR_INTEGRATION_V1.md`** — Non-affiliation note, design-time-only plane, promotion to `@/ui-core`, operator prompt patterns.
- **Optional** `SHADCN_IO_SKILL_COMPONENT_MATRIX_V1.md` — v1 skill category ↔ shadcn.io component families; links to [VIEW_REGISTRY](docs-governance/canonical/VIEW_REGISTRY.md), [ACTION_REGISTRY](docs-governance/canonical/ACTION_REGISTRY.md), [UI_COMPONENT_APPROVAL_REGISTRY_V1](docs-governance/canonical/UI_COMPONENT_APPROVAL_REGISTRY_V1.md).
- **Track 1b linkage** — Explicit statement that planning intake **HOW** must reference this matrix + registries before implementation PRs.
- **Draft cleanup** — [`user_uploads/governance_docs_3_29/ui-control_plane.md`](user_uploads/governance_docs_3_29/ui-control_plane.md): remove `cite` / `image_group` placeholders or add banner “sections TBD — see SHADCN_IO_OPERATOR_INTEGRATION_V1”.

## Scope (out)

- **Voice hot path / geminiVoice.ts** — forbidden per voice lockdown.
- **Customer runtime MCP calls** — unchanged; still registry + syscalls at runtime.
- **Google Workspace MCP** — **Phase 0B** separate PR ([phase0_google_workspace_mcp.plan.md](phase0_google_workspace_mcp.plan.md)).

## Success criteria (handoff)

- New clone can follow `MCP_SETUP.md` and get **SerpApi + shadcn.io** MCP healthy (Reload Window).
- Governance artifacts exist; skill matrix v0 indexes **functionality** for planning phase.
- Parent plan Phase 0 checklist signed off; then proceed to **Phase 1** per parent **Suggested implementation order**.

## Sub-agent prompt (one-liner)

You are executing **Phase 0A** only: governed **shadcn.io MCP + UI artifact index + planning cross-links**. No Workspace. No intent-loop code changes unless required for doc links. Follow [CANVAS_OS_TOOL_MANDATE_V1](docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md) and [SHADCN_MCP_PLANE_BOUNDARY_V1](docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md).
