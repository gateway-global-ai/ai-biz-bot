---
status: canonical
truth_domain: governance
enforced_by: operator discipline, execution-plane boundary (no voice path); optional future proxy TBD
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
---

# Google Workspace MCP — Data / Tooling Plane vs OS UI (v1)

## One-sentence truth

**Google Workspace MCP is a data and API tooling plane for operators and developers (e.g. Cursor, Gemini CLI), not a product UI-generation plane and not a substitute for registered canvas surfaces.**

Not every MCP server belongs in the same conversation as Shadcn MCP or canvas governance: **MCP names a transport for tools**, not a single product capability.

## Three planes (do not conflate)

| Plane | What it is | Examples |
|-------|------------|----------|
| **Design-time UI** | Component discovery and governed promotion | [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](./SHADCN_MCP_PLANE_BOUNDARY_V1.md), `@gateway/canvas-sdk`, [`UI_COMPONENT_APPROVAL_REGISTRY_V1.md`](./UI_COMPONENT_APPROVAL_REGISTRY_V1.md) |
| **Workspace / Google APIs** | Read/write Gmail, Drive, Calendar, Docs, Sheets, Chat, etc. via MCP tools | Vendored server: [`mcp-servers/google-workspace/`](../../mcp-servers/google-workspace/README.md); external servers (e.g. community Workspace MCPs) are the same *class*: **API access**, not React/canvas emission |
| **Canvas / runtime customer OS** | Governed surfaces only | [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md), typed payloads, `canvas.*` syscalls, validators — [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) |

## Risk boundary: tool access ≠ runtime capability

Usefulness of Workspace MCP in **internal** dev or operator flows does **not** imply it may be reached from:

- Gemini **voice** runtime or hot paths ([`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md))
- **Customer-facing** agents as an automatic dependency
- **Swarm-generated** or **autonomous production** UI without an explicit design

**Approved posture today:** Workspace MCP is **internal operator/developer tooling** for Google API access unless and until the platform adds a **governed server-side proxy**, **explicit policy**, and **reviewed** exposure — same class of gate as any other third-party tool surface.

Do not assume “we have MCP in the repo” means “agents at runtime may call Google Workspace through MCP.”

## What this doc does **not** require

- No row in the UI component approval registry for Workspace MCP
- No change to canvas SDK, view contracts, or syscall validators solely because Workspace MCP exists
- No merge of Workspace tool catalogs into Shadcn or canvas registries

## Related

- [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](./SHADCN_MCP_PLANE_BOUNDARY_V1.md) — design-time UI MCP vs runtime
- [`.cursor/MCP_SETUP.md`](../../.cursor/MCP_SETUP.md) — Cursor MCP configuration (operator)
- [`local-agent-governance.mdc`](../../.cursor/rules/local-agent-governance.mdc) — internal coding-agent plane (jurisdiction; not voice)
