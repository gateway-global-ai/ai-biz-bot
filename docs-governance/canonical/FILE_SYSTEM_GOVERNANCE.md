---
status: canonical
truth_domain: governance
enforced_by: file-system-governance.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---

# File System Governance

## Purpose
Define the physical organization of the OS so code structure reinforces runtime governance instead of undermining it.

## Core rule
Files are organized by system responsibility, not by convenience or temporary deployment needs.

## Required top-level concerns
- `app/` for bootstrap only
- `shell/` for persistent operating surface
- `os-core/control-plane/` for registries, policies, resolvers, prompt runtime
- `os-core/execution-plane/` for Gemini live runtime and hot-path machinery
- `routes/` for browser adapters and guards
- `views/` for governed UI surfaces
- `domains/` for business truth and use-case execution
- `schema/` for anchor and domain schema contracts
- `storage/` for repositories and adapters
- `integrations/` for external systems
- `docs-governance/` for canonical architecture and review docs

## Forbidden patterns
- giant mixed-purpose `App.tsx`
- browser routes mixed with business logic
- schema files absorbing UI, prompt, or deployment logic
- storage files becoming universal service containers
- execution-plane files importing domain logic directly
- prompt strings scattered across UI or routes
- treating `client/src/components/chat/gemini_2_5_flash_react_instructions/*.md` as production prompt sources (see [CLIENT_SPEC_TREE_REGISTRY.md](./CLIENT_SPEC_TREE_REGISTRY.md))

## Client legacy UI reference
- `client/legacy-ui-reference/` — **reference-only** quarantine for deprecated hand-built layouts (see [`INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md`](./INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md)). Production code under `client/src/` must not import from it.

## Extraction rule
If a file becomes a cross-domain dumping ground, it must be split before new feature growth continues in that file.
