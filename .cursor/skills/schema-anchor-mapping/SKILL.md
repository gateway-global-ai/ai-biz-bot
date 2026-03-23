---
name: schema-anchor-mapping
description: Maps proposed features, routes, views, and workflows to approved schema anchors and context keys. Use when a request introduces a new business concept, workflow, or entity relationship and you need to ground it in the real OS data model.
---

# Schema Anchor Mapping

## Purpose
Prevent architecture drift by grounding new work in real schema anchors before implementation.

## Required references
- `docs-governance/SCHEMA_ANCHOR_REGISTRY.md`
- `docs-governance/CONTEXT_KEYS.md`

## Procedure
1. Identify the business concept in the request.
2. Determine whether it maps to an existing schema anchor.
3. Identify the primary context keys required.
4. List likely child relationships, views, and actions.
5. If no anchor exists, flag the proposal as requiring registry/schema evolution before coding.

## Output format
- Concept
- Anchor mapping
- Required context keys
- Related routes/views/actions
- Risks or missing schema support
