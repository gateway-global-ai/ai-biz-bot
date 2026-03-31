# shadcn.io catalog (repo-local)

Machine-readable index aligned with [shadcnio/react-shadcn-components](https://github.com/shadcnio/react-shadcn-components) README tables, plus common AI chrome (`panel`, `canvas`) from [shadcn.io](https://www.shadcn.io).

- **Not** official [shadcn/ui](https://ui.shadcn.com/) (see shadcn.io disclaimer on their site).
- **Design-time only** — operator / Cursor discovery; see [`SHADCN_MCP_PLANE_BOUNDARY_V1.md`](../../docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md).

## Files

| File | Role |
|------|------|
| `component_index.v1.json` | Frozen snapshot of README paths + titles (update when upstream README changes). |
| `blocks_index.v1.json` | Block paths (e.g. `blocks/hero/hero-01` … `hero-12`) from [`generate-shadcn-io-blocks-index.mjs`](../../scripts/generate-shadcn-io-blocks-index.mjs). |
| `merged_catalog.v1.json` | **components + blocks** — consumed by MCP and copied to `client/public/shadcn-io/` for `/dev/shadcn-io-catalog`. |
| [`scripts/shadcn-io-catalog-mcp.ts`](../../scripts/shadcn-io-catalog-mcp.ts) | Stdio MCP; prefers `merged_catalog.v1.json`. |
| [`scripts/sync-shadcn-io-catalog.mjs`](../../scripts/sync-shadcn-io-catalog.mjs) | Builds merged JSON → registry + `client/public/shadcn-io/`. |

## npm

| Script | Purpose |
|--------|---------|
| `npm run shadcn-io:generate` | Regenerate `component_index.v1.json` from `scripts/generate-shadcn-io-component-index.mjs`. |
| `npm run shadcn-io:health` | HTTP probe doc + recipe URLs; writes `docs-governance/artifacts/shadcn_io_catalog_health_report.json` (gitignored). |
| `npm run shadcn-io:health -- --docs-only` | Doc URLs only (see artifact — anonymous probes often get **401** on `…/r/*.json`). |
| `npm run shadcn-io:refresh` | Generate, then health. |

Governance: [`SHADCN_IO_COMMUNITY_MIRROR_V1.md`](../../docs-governance/artifacts/SHADCN_IO_COMMUNITY_MIRROR_V1.md).

## Cursor

Use `.cursor/mcp.example.json` → `"shadcn-io"` with `npx tsx scripts/shadcn-io-catalog-mcp.ts` (workspace root as cwd).

Recipe install pattern (verify on each doc page; slugs can differ):

`npx shadcn@latest add https://www.shadcn.io/r/<slug>.json`

where `<slug>` is usually the last segment of the doc path (e.g. `panel` for `/ai/panel`).
