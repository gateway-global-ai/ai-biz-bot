---
status: draft
truth_domain: governance
enforced_by: operator discretion — not a product runtime contract
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
spec_id: shadcn_io_community_mirror
spec_version: "1.0.0"
---

# shadcn.io community mirror — Gateway stance (V1)

## Purpose

Document how this repository provides **design-time, repo-local** tooling for developers who use **[shadcn.io](https://www.shadcn.io)**-style docs and registry URLs, **without** claiming ownership of shadcn.io, **without** implying affiliation with [official shadcn/ui](https://ui.shadcn.com/), and **without** replacing commercial support or billing for third-party services.

This exists because:

1. **Remote MCP** — Cursor often cannot use `https://www.shadcn.io/api/mcp` (SSE **405**); see [Shadcn MCP for Cursor](https://www.shadcn.io/mcp/cursor) vs actual client behavior in [`.cursor/MCP_SETUP.md`](../../.cursor/MCP_SETUP.md) §4.1.
2. **Upstream noise** — The catalog repo [shadcnio/react-shadcn-components](https://github.com/shadcnio/react-shadcn-components) carries many **open issues** (e.g. registry **500** errors, install failures); see [their issues list](https://github.com/shadcnio/react-shadcn-components/issues). Gateway does **not** operate that registry; we offer **transparency** (health checks) and a **local MCP** index only.

## What Gateway provides

| Deliverable | Location | Role |
|-------------|----------|------|
| Frozen component index | [`registry-yaml/shadcn-io-catalog/component_index.v1.json`](../../registry-yaml/shadcn-io-catalog/component_index.v1.json) | Paths/titles aligned with the README index + selected AI chrome (`panel`, `canvas`). |
| Index generator | [`scripts/generate-shadcn-io-component-index.mjs`](../../scripts/generate-shadcn-io-component-index.mjs) | Regenerate JSON when the upstream README changes. |
| Local stdio MCP | [`scripts/shadcn-io-catalog-mcp.ts`](../../scripts/shadcn-io-catalog-mcp.ts) | Cursor tools: `shadcn_io_list`, `shadcn_io_search`, `shadcn_io_get`, `shadcn_io_about`. |
| URL health probe | [`scripts/check-shadcn-io-catalog-health.ts`](../../scripts/check-shadcn-io-catalog-health.ts) | Optional HTTP checks on doc + conventional recipe URLs (see below). |
| Merged catalog (registry + public) | [`merged_catalog.v1.json`](../../registry-yaml/shadcn-io-catalog/merged_catalog.v1.json) + [`client/public/shadcn-io/merged_catalog.v1.json`](../../client/public/shadcn-io/merged_catalog.v1.json) | Components README index + generated **blocks** (e.g. `blocks/hero/hero-01`); built by `sync-shadcn-io-catalog.mjs`. |
| Browser directory | [`/dev/shadcn-io-catalog`](../../client/src/pages/developer/shadcn-io-catalog/index.tsx) | Searchable table; links open **upstream** doc URLs (not a full page mirror). |

## npm commands

| Command | Action |
|---------|--------|
| `npm run shadcn-io:generate` | Regenerates component index + blocks index + **`merged_catalog.v1.json`** (registry + `client/public/shadcn-io/`). |
| `npm run shadcn-io:health` | HEAD/GET probe of doc + `recipeUrl` for each entry; writes `docs-governance/artifacts/shadcn_io_catalog_health_report.json` (gitignored). |
| `npm run shadcn-io:health -- --docs-only` | Doc pages only (useful when `…/r/*.json` returns **401** without a session — common for anonymous probes). |
| `npm run shadcn-io:refresh` | `generate` then `health`. |
| `npm run cursor:mcp:shadcn-io` | Merge **Gateway** `shadcn-io` MCP entry into `.cursor/mcp.json` (stdio — not `https://www.shadcn.io/api/mcp`). Requires `jq`. |

### Cursor MCP: use **our** stdio server

`.cursor/mcp.json` is gitignored. To point **`shadcn-io`** at this repo’s process (not the remote URL):

1. Copy from [`.cursor/mcp.example.json`](../../.cursor/mcp.example.json), or  
2. Run `npm run cursor:mcp:shadcn-io` to merge the `shadcn-io` block into an existing file.

Then **Developer: Reload Window**. The MCP server reads [`merged_catalog.v1.json`](../../registry-yaml/shadcn-io-catalog/merged_catalog.v1.json) when present.

### Interpreting health reports

- **`401` on `https://www.shadcn.io/r/<slug>.json`** — Often means the registry JSON is **not anonymously fetchable**; it does **not** prove the CLI is broken for a logged-in or entitled user. Prefer **`--docs-only`** for green CI, or treat recipe rows as **signal** only.
- **`5xx` / timeouts** — Stronger signal of **service degradation** (aligns with public reports such as [registry 500 issues](https://github.com/shadcnio/react-shadcn-components/issues)).

## Non-goals (explicit)

- **No** SLA on third-party uptime; health reports are **point-in-time**.
- **No** scraping of private or authenticated registry content beyond **public URLs** already listed in the index.
- **No** customer billing or account recovery for shadcn.io — Gateway is **not** their operator.
- **No** voice or customer-runtime MCP calls — [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](../canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md).

## Recipe URL convention

Entries include `recipeUrl` of the form `https://www.shadcn.io/r/<slug>.json`. **Slugs can differ** from doc paths; confirm on each doc page before installing. Install lines are **hints**, not guarantees.

## Related

- [`registry-yaml/shadcn-io-catalog/README.md`](../../registry-yaml/shadcn-io-catalog/README.md)
- [`.cursor/MCP_SETUP.md`](../../.cursor/MCP_SETUP.md) §4.1
- [`.cursor/skills/shadcn-ui-agent/SKILL.md`](../../.cursor/skills/shadcn-ui-agent/SKILL.md)
