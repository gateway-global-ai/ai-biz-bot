# Legacy UI reference (quarantine)

**Status:** Reference-only. **Do not import** these files into production `client/src/` paths.

## Purpose

Preserve **deprecated** hand-built layouts and designs from the pre–intent-generated era so engineers can still read diff history and copy **ideas** (not imports) when rebuilding surfaces through:

- governed views and actions,
- tool/canvas payloads,
- registry-backed templates and shadcn building blocks.

This folder is **not** `_legacy_archive/` (server/archaeology). It is **client UI** snapshot / migration holding.

## Rules

1. **No runtime imports** — `client/src/**` must not `import` from `client/legacy-ui-reference/**`. ESLint/tsconfig may be tightened later to enforce this.
2. **Moves are deliberate** — When retiring a screen, move or copy the file here in a dedicated PR; update the originating route to use intent-generated / registry-driven UI.
3. **Ideas, not authority** — Patterns here are **not** product truth. Truth is `docs-governance/canonical/INTENT_GENERATED_SURFACE_GOVERNANCE_V1.md` and the view/action registries.

## Empty until migration

Files appear here as modules are deprecated. Until then, this README is the contract.
