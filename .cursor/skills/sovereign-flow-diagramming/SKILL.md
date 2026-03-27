---
name: sovereign-flow-diagramming
description: Produces Mermaid route/workflow diagrams and screen-path outlines from existing contracts only — never invents architecture. Use for demo paths, /biz vs /agent, readiness, and canvas params.
---

# Sovereign flow diagramming

## When to use

- Mapping **browser adapters** to **logical route ids** after reading [`docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md`](../../docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md).
- Documenting **route → view → canvas_type → required params** using [`docs/sdk/SHARED_CANVAS_V1.md`](../../docs/sdk/SHARED_CANVAS_V1.md) and [`docs-governance/canonical/VIEW_REGISTRY.md`](../../docs-governance/canonical/VIEW_REGISTRY.md).

## Hard rules

1. **Do not invent** routes, views, `canvas_type` values, or product states. If code and docs disagree, emit a **mismatch warning** instead of “fixing” in the diagram.
2. **Cite inputs** — every diagram lists which files were read.
3. **Required outputs** — logical route tree (Mermaid); optional state/workflow Mermaid; node parameter table; **OPEN / mismatch** section.

## Required references

- [`LOGICAL_ROUTE_REGISTRY.md`](../../docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md)
- [`VIEW_REGISTRY.md`](../../docs-governance/canonical/VIEW_REGISTRY.md)
- [`SHARED_CANVAS_V1.md`](../../docs/sdk/SHARED_CANVAS_V1.md)
- Product transitions: [`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](../../docs/product/ONBOARDING_GO_LIVE_TRANSITIONS_V1.md), [`CUSTOMER_READY_V1.md`](../../docs/product/CUSTOMER_READY_V1.md)

## Example output shape

1. **Mermaid** `flowchart` or `stateDiagram-v2` (no spaces in node IDs).
2. **Table:** `routeId` | `browser path` | `context keys`.
3. **Canvas row:** where `show_canvas` applies — `canvas_type` | required JSON fields (link to SHARED_CANVAS_V1 section).
4. **Warnings:** doc-only routes, missing registry entries, divergent `business` builders (should be none after `buildConciergeBusinessFromSite`).

## Human doc target

Place narrative diagrams under `docs/architecture/` or `docs/product/` and link from slice docs.
