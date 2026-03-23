---
name: logical-route-design
description: Designs logical route ids, context requirements, render modes, and policy gates before browser paths are introduced. Use when adding routes, menu drill-down flows, browser adapters, or route/view mappings in the AI OS.
---

# Logical Route Design

## Required references
- `docs-governance/LOGICAL_ROUTE_REGISTRY.md`
- `docs-governance/CONTEXT_KEYS.md`
- `docs-governance/MENU_RESOLVER_CONTRACT.md`

## Procedure
1. Define the route as a logical route id first.
2. Identify required context keys.
3. Assign a render mode.
4. Identify linked view id and allowed actions.
5. Only after that, consider whether a browser path adapter is needed.

## Output format
- route id
- required context keys
- render mode
- policy gate
- linked view id
- optional browser path
