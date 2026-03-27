---
status: canonical
truth_domain: governance
enforced_by: INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md, REGISTRY_AUTHORITY_CHARTER.md
last_verified: 2026-03-27
---

# Adapter Generation Policy

## Authority

```yaml
authority:
  source_of_truth: docs-governance/canonical/ADAPTER_GENERATION_POLICY.md
  normative_outputs: docs-governance/canonical/INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md#6-adapter-generation-outputs
  machine_readable_bindings: registry-yaml/integration-adapters/*.yaml
```

## Purpose

Regulate how HTTP adapters are produced—by hand, by script, or by codegen—so every integration satisfies the same **artifacts** and **deploy gates** before customer-facing tools are enabled.

## Policy rules

1. **Spec before code:** No new customer-facing `tool_name` may ship without a corresponding row in `registry-yaml/integration-capabilities/*.yaml` that passes [`scripts/validate-integration-registry.ts`](../../scripts/validate-integration-registry.ts).
2. **Single tool authority:** Declared Gemini tool names and JSON shapes remain in [`server/config/geminiToolDeclarations.ts`](../../server/config/geminiToolDeclarations.ts). Codegen MAY suggest diffs; humans merge.
3. **Credential anchors:** Adapters MUST resolve credentials only via approved schema anchors (e.g. `site_pms_integrations`) documented in the adapter manifest—never ad hoc env-only paths for tenant data.
4. **Error taxonomy:** Every adapter manifest MUST declare `error_taxonomy` mappings sufficient for [`INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`](./INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md) gate **G6**.
5. **Tests:** Gate **G5** requires automated tests for each `deployable` mutating capability; read-only capabilities SHOULD have at least one integration or contract test.
6. **Voice / execution plane:** Adapters MUST NOT add heavy synchronous work on voice hot paths; batch or defer per [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md).

## Required outputs (summary)

Full field list: **INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md §6**. Minimum on disk before `adapter_status: deployable`:

| Output | Location convention |
|--------|----------------------|
| `adapter_manifest` | `registry-yaml/integration-adapters/<vendor>.v1.yaml` |
| `request_templates` / normalizers | `server/tools/*` or `server/services/*` (implementation) |
| `error_taxonomy` | Same adapter YAML under `error_taxonomy:` |
| `test_scaffold` | `tests/` or `scripts/*-smoke-test.ts` referenced from manifest |

## Codegen (optional)

- Generators MUST emit a **manifest diff** and MUST NOT register tools in the model without updating `geminiToolDeclarations.ts`.
- Generated files MUST include a header comment: `// generated: integration-intelligence — review before merge`.

## Related

- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) — graph authority, no runtime shortcuts.
- [`INTEGRATION_RUNTIME_PATTERN.md`](./INTEGRATION_RUNTIME_PATTERN.md) — end-to-end binding example.
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) — no raw endpoint lists in prompts.
