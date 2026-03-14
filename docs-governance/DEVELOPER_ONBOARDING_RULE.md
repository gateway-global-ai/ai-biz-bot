# Developer Onboarding Rule

## Purpose
Ensure human developers and coding agents enter the OS with the same architectural context before they implement features.

## Required reading order
Before implementing any feature, every developer or coding agent must read:

1. `docs-governance/SYSTEM_MANIFEST.md`
2. `docs-governance/AI_OS_CONTROL_PLANE_v1.md`
3. `docs-governance/SCHEMA_ANCHOR_REGISTRY.md`
4. `docs-governance/CONTEXT_KEYS.md`
5. `docs-governance/APP_SHELL_CONTRACT.md`

And then, depending on the work:
- agent work -> `AGENT_POLICY_REGISTRY.md`, `SAFE_MODE_CONTRACT.md`
- route/view work -> `LOGICAL_ROUTE_REGISTRY.md`, `VIEW_REGISTRY.md`, `ACTION_REGISTRY.md`
- file/runtime work -> `FILE_SYSTEM_GOVERNANCE.md`, `IMPORT_DISCIPLINE_MATRIX.md`, `EXECUTION_PLANE_BOUNDARY_SPEC.md`

## Rule
No implementation work should begin until the developer or agent understands the relevant registries and contracts for the affected area.

## Why
This prevents:
- architecture drift
- hidden route invention
- prompt/runtime contamination
- giant file sprawl
- policy violations caused by partial context
