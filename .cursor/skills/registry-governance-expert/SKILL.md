---
name: registry-governance-expert
description: Umbrella — logical routes, logical route ids, views, actions, schema anchors, and QR. The structural truth of the AI OS.
---

# Registry Governance Expert (Umbrella)

Use this skill when adding **routes**, **browser adapters**, **views**, **actions**, **YAML registries**, or **schema anchors** — not as free-form UI work.

## When to use

- New menu flows, drill-downs, or **logical route ids** before paths exist.
- Mapping features to **approved schema** entities.

## Deep skills

| Skill | Focus |
|-------|--------|
| [`logical-route-design`](../logical-route-design/SKILL.md) | Route ids, context keys, policy gates |
| [`view-registry-design`](../view-registry-design/SKILL.md) | View contracts, server-driven UI |
| [`schema-anchor-mapping`](../schema-anchor-mapping/SKILL.md) | Anchors vs invented entities |
| [`intent-loop-governance`](../intent-loop-governance/SKILL.md) | Intent-as-loop control plane, merge order, phased resolver vs GGUI / views |

## Cursor rules

- [`.cursor/rules/logical-route-registry.mdc`](../../rules/logical-route-registry.mdc)
- [`.cursor/rules/view-and-action-registry.mdc`](../../rules/view-and-action-registry.mdc)
- [`.cursor/rules/schema-anchor-registry.mdc`](../../rules/schema-anchor-registry.mdc)
- [`.cursor/rules/modular-routing.mdc`](../../rules/modular-routing.mdc) — **never** add routes to `server/routes.ts` monolith.
- [`.cursor/rules/qr-system.mdc`](../../rules/qr-system.mdc) — QR / shadow telecom.
- [`.cursor/rules/intent-loop-governance.mdc`](../../rules/intent-loop-governance.mdc) — canvas intent / surface derivation boundaries.

## Governance docs

- [`docs-governance/LOGICAL_ROUTE_REGISTRY.md`](../../../docs-governance/LOGICAL_ROUTE_REGISTRY.md)
- [`docs-governance/VIEW_REGISTRY.md`](../../../docs-governance/VIEW_REGISTRY.md)
- [`docs-governance/SCHEMA_ANCHOR_REGISTRY.md`](../../../docs-governance/SCHEMA_ANCHOR_REGISTRY.md)
