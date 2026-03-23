---
name: view-registry-design
description: Defines governed view contracts and server-driven UI states for the AI OS. Use when creating menu, form, controller, inspector, confirmation, refusal, or PTT-first views and when mapping them to shell behavior.
---

# View Registry Design

## Required references
- `docs-governance/VIEW_REGISTRY.md`
- `docs-governance/APP_SHELL_CONTRACT.md`
- `docs-governance/MODE_TRANSITIONS.md`

## Procedure
1. Classify the view category.
2. Identify required context keys.
3. Identify allowed actions.
4. Define the data contract and render hints.
5. Ensure the view fits valid shell mode transitions.

## Output format
- view id
- category
- required context keys
- allowed actions
- data contract summary
- shell mode implications
