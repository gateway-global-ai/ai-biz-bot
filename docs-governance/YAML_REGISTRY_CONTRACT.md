# YAML Registry Contract

## Purpose
Provide a portable, machine-readable layer for routes, views, actions, policies, modes, and install requirements.

## Required files
- `registry-yaml/schema-anchors.yaml`
- `registry-yaml/logical-routes.yaml`
- `registry-yaml/views.yaml`
- `registry-yaml/actions.yaml`
- `registry-yaml/agent-policies.yaml`
- `registry-yaml/modes.yaml`
- `registry-yaml/install-contract.yaml`

## Rules
- YAML is declarative and reviewable; it does not replace the runtime database schema.
- YAML must not invent entities outside approved schema anchors and domain concepts.
- Registry YAML changes require governance review before implementation proceeds.
