---
name: Phase 0 — Google Workspace MCP integration
overview: "**Blocking PR** — Replace or supersede the broken vendored Workspace MCP path with a **working, documented** operator integration (recommended **[taylorwilsdon/google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp)**), **index tool tiers and capabilities**, and connect them to **planning intake** (HOW: which Workspace surfaces agents need). Agents cannot accomplish real tasks without Workspace access. Completes before Phase 1 of [dcp_intent_loop_dogfood.plan.md](dcp_intent_loop_dogfood.plan.md)."
todos:
  - id: p0-ws-eval-adr
    content: "docs-governance/artifacts/WORKSPACE_MCP_SERVER_CHOICE_V1.md — uvx/OAuth, read-only + core tier default; vs vendored mcp-servers/google-workspace"
    status: pending
  - id: p0-ws-mcp-json
    content: "Document operator .cursor/mcp.json launch (gitignored); update mcp.example.json commented block"
    status: pending
  - id: p0-ws-runbook
    content: "Extend MCP_SETUP.md — Python 3.10+, uv/uvx, GOOGLE_OAUTH_*; security note (prompt injection, mail); link WORKSPACE_MCP_PLANE_BOUNDARY_V1"
    status: pending
  - id: p0-ws-index
    content: "Index tool tiers / APIs in artifact or REPO_KNOWLEDGE stub — what Workspace enables for agent HOW planning"
    status: pending
  - id: p0-ws-vendored
    content: "After validation — archive or README pointer on vendored google-workspace Node path; no silent dist/index.js dependency"
    status: pending
  - id: p0-ws-verify
    content: "Smoke: Cursor connects; at least one read-only tool path works with test OAuth"
    status: pending
isProject: false
---

# Phase 0 — Google Workspace MCP (distinct PR)

**Parent plan:** [dcp_intent_loop_dogfood.plan.md](dcp_intent_loop_dogfood.plan.md) — this track is **Phase 0B** and **blocks** downstream agent/workflow work until **done** (alongside Phase 0A UI).

**Strategic premise:** **Agents cannot complete real work** without **Google Workspace** (mail, calendar, docs, drive, etc.) exposed through a **stable MCP** with clear **permissions and indexing** for planning. The current **`dist/index.js` missing** vendored path is unacceptable as the long-term story.

## Scope (in)

- **ADR or artifact** `WORKSPACE_MCP_SERVER_CHOICE_V1.md` — Compare vendored Node workspace vs **[taylorwilsdon/google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp)**; document **`uvx workspace-mcp`** (or upstream’s recommended install), **`--read-only`**, **`--tool-tier core`** defaults, OAuth env vars (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`).
- **[`WORKSPACE_MCP_PLANE_BOUNDARY_V1.md`](docs-governance/canonical/WORKSPACE_MCP_PLANE_BOUNDARY_V1.md)** — Confirm operator-only; no voice/customer runtime wiring without governed proxy.
- **Runbook** — Prerequisites (Python 3.10+, uv), Google Cloud OAuth desktop app, enabled APIs; link upstream security section.
- **Planning linkage** — Short table: **capability** (e.g. “read inbox”) → **tool tier** → **planning HOW field** so agent builders declare Workspace needs explicitly.
- **Vendored folder** [`mcp-servers/google-workspace/`](mcp-servers/google-workspace/) — After adoption: README **deprecated** or archive pointer; no undocumented dual source of truth.

## Scope (out)

- **CI calling live Google APIs on every PR** — non-goal.
- **Wiring Workspace into Gemini voice or customer canvas** — forbidden without separate governed task.
- **shadcn.io / UI MCP** — **Phase 0A** ([phase0_ui_mcp_shadcn_integration.plan.md](phase0_ui_mcp_shadcn_integration.plan.md)).

## Success criteria (handoff)

- Operator can run Workspace MCP from documented command; **read-only** path verified.
- Planning docs reference **which Workspace capabilities** map to agent HOW.
- Parent plan Phase 0B signed off; proceed **Phase 1** per parent order.

## Sub-agent prompt (one-liner)

You are executing **Phase 0B** only: **Google Workspace MCP** adoption, ADR, runbook, OAuth/smoke verification, vendored path resolution. No shadcn.io scope. Follow [WORKSPACE_MCP_PLANE_BOUNDARY_V1](docs-governance/canonical/WORKSPACE_MCP_PLANE_BOUNDARY_V1.md) and upstream security guidance.
