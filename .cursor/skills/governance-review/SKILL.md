---
name: governance-review
description: Reviews plans, specs, and feature requests against the AI OS control plane, schema anchors, shell contract, and policy boundaries. Use before implementation when a proposal could affect architecture, routes, views, prompts, execution-plane boundaries, or file structure.
---

# Governance Review

## Purpose
Run a pre-implementation check before coding. The goal is to find architectural conflicts before files are edited.

## Required inputs
- proposed plan or feature request
- affected entities, if known
- affected files or domains, if known

## Review checklist
1. Read `docs-governance/SYSTEM_MANIFEST.md`.
2. Verify the proposal aligns with `docs-governance/AI_OS_CONTROL_PLANE_v1.md`.
3. Map any new entities or concepts to `docs-governance/SCHEMA_ANCHOR_REGISTRY.md`.
4. Check required context keys in `docs-governance/CONTEXT_KEYS.md`.
5. Determine whether routes, views, actions, or policies need registry updates.
6. Check whether the proposal violates the App Shell or execution-plane boundaries.
7. Flag prompt logic outside the prompt registry.
8. Identify missing docs, registry updates, or policy contracts.

## Output format
- Summary
- Alignment
- Conflicts
- Missing dependencies
- Suggested next steps
- Implementation readiness verdict
