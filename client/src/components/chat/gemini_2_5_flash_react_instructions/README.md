# Gemini / React instruction notes (non-authoritative)

This folder holds **design notes, UI sketches, and integration specs** for multimodal and maps work.

**It is not the source of truth for:**

- Production **agent system prompts** — see `docs-governance/PROMPT_RUNTIME_GOVERNANCE.md` and the server prompt compiler.
- **Legal / MSA text** — see `.system_design/contracts/` and `client/src/pages/account/OnboardingGateway.tsx` (embedded copy for UX must match contracts).

**Full inventory and SSoT mapping:** [`docs-governance/CLIENT_SPEC_TREE_REGISTRY.md`](../../../../../docs-governance/CLIENT_SPEC_TREE_REGISTRY.md)

When adding a file here, add a row to that registry and avoid duplicating prompt policy that belongs in `server/` or `docs-governance/`.
