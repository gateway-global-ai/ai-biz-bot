# Integration intelligence (offline ingest)

Produces **integration IR v1** YAML for human review. **Ingest output is not authoritative** — promotion into `registry-yaml/integration-endpoints/` and capabilities is governed; see [`INTEGRATION_GRAPH_DISCIPLINE.md`](../../docs-governance/canonical/INTEGRATION_GRAPH_DISCIPLINE.md) (D2). Governed registries are **not** auto-updated by these scripts.

## Schema

See [`ir-v1.schema.yaml`](./ir-v1.schema.yaml) and [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](../../docs-governance/canonical/INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md).

## Commands

```bash
# OpenAPI 3.x → IR
npx tsx scripts/integration-intelligence/openapi-to-ir.ts path/to/openapi.yaml --vendor cloudbeds --out /tmp/cloudbeds-ir.yaml

# Postman Collection v2.1 → IR
npx tsx scripts/integration-intelligence/postman-to-ir.ts path/to/collection.json --vendor myvendor --out /tmp/postman-ir.yaml

# Merge IR bundles (dedupe by endpoint_id; prefers openapi over postman on clash)
npx tsx scripts/integration-intelligence/merge-ir.ts a.yaml b.yaml --out merged.yaml
```

## CI

After editing `registry-yaml/integration-*`:

```bash
npm run validate:integration-registry
```
