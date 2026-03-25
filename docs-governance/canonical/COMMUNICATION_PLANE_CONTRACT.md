---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: false
  service: true
  route: false
last_verified: 2026-03-25
---
# Communication Plane contract

Version: 1.0  
Status: Layer 2 (interaction governance) — depends on [AGENT_SWARM_DEPLOYMENT_RUNBOOK.md](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md) for Layer 1 (agents exist and are assigned).

## Purpose

Define how the platform governs **human–agent and agent–adjacent** communication: grounding, structure (ARCH), disclosure, audits, and modality hints — as **programmatic controls**, not prompt-only wishes.

**Research baseline:** [PROMPT_SHAPE_RESEARCH_ANCHOR.md](./PROMPT_SHAPE_RESEARCH_ANCHOR.md) and [user_uploads/prompt_shape_behavior.md](../user_uploads/prompt_shape_behavior.md) (reference upload).

## Principles

1. **Prompt-shaped behavior is insufficient** for production trust and repeatability. Critical behavior must be enforced or audited with **deterministic** components (validators, budgets, structured records, policy JSON).
2. **Grounding** is a first-class artifact: identity, ability, channel, focus, and time belong in machine-readable structures (Conversation Grounding Record — CGR).
3. **Progressive disclosure** beats maximal upfront disclosure for many customer outcomes; timing is a policy and compliance decision, not only a model choice ([`disclosurePolicy.ts`](../server/services/disclosurePolicy.ts), `site_configs.communication_governance`).
4. **Voice hot path** stays latency-sensitive: no blocking ARCH validators in Gemini Live / Twilio media streams unless a dedicated voice task approves it ([EXECUTION_PLANE_BOUNDARY_SPEC.md](./EXECUTION_PLANE_BOUNDARY_SPEC.md), [sovereign-voice-lockdown.mdc](../.cursor/rules/sovereign-voice-lockdown.mdc)).

## Component map

| Concern | Role | Primary locations |
| --- | --- | --- |
| **CGR** | Session/turn grounding state for consumers and analytics | [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts), [`server/services/conversationGrounding.ts`](../server/services/conversationGrounding.ts), [`server/routes/chatRoutes.ts`](../server/routes/chatRoutes.ts) (`communication.cgr`) |
| **Prompt compiler** | Builds system prompts from structured DISC, ARCH, memory, certification — not raw UI strings | [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts) |
| **ARCH envelope validator** | Deterministic **text** checks (e.g. handoff / next-step cues when required) | [`server/services/archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts) |
| **PPP shadow scoring** | Deterministic **text** heuristics for Purpose / Plan / Pressure / handoff cues; **audit-only** (non-blocking); telemetry in `analytics_logs` (`eventType: ppp_shadow_score`). Uses `site_configs.communication_governance` for `pppEngagement` alignment with the compiler. **Not** Sovereign Sentinel; **not** on Gemini Live / voice hot path. | [`server/services/pppShadowValidator.ts`](../server/services/pppShadowValidator.ts), [`server/services/pppShadowAnalytics.ts`](../server/services/pppShadowAnalytics.ts), [`server/routes/chatRoutes.ts`](../server/routes/chatRoutes.ts) |
| **Disclosure / communication governance** | Site-level JSON and compiler-injected disclosure behavior | [`server/services/disclosurePolicy.ts`](../server/services/disclosurePolicy.ts), `site_configs.communication_governance` |
| **Sovereign Sentinel (override audit)** | **Not** ARCH — classifies **admin-entered override reason** text for review queues (no LLM) | [`server/services/securitySentinel.ts`](../server/services/securitySentinel.ts), [`server/routes/knowledgeGapRoutes.ts`](../server/routes/knowledgeGapRoutes.ts) |
| **Multimodal / canvas handoff hints** | Deterministic recommendation when narrowband + task needs visual/structured verification | `shouldRecommendCanvasHandoff` in [`server/services/conversationGrounding.ts`](../server/services/conversationGrounding.ts), telephony events |

## Naming: "Sentinel" disambiguation

- **ARCH validator** (`validateArchEnvelope`): output structure on **model text** (chat).
- **Sovereign Sentinel** (`classifyOverrideReasonText`): **human** override reasons for knowledge/certification governance.
- **PPP shadow** (`ppp_shadow_score` in `analytics_logs`): **model output** adherence heuristics for chat; separate from both ARCH validation and Sentinel.

Do not conflate these in runbooks or telemetry.

## Enforcement matrix

| Path | CGR | ARCH validation | Notes |
| --- | --- | --- | --- |
| **Website chat** (`POST` website chat handler in `chatRoutes`) | Yes | Yes | Response may be replaced or appended per `ARCH_HANDOFF_MODE` when validation fails; **PPP shadow** score + async log (no blocking) |
| **`POST /api/chat`** | Yes | Yes | Same ARCH behavior; **PPP shadow** uses shared site governance when `agent.site_config_id` is set |
| **Gemini Live / Twilio voice** | Async hints / telemetry preferred | **No** blocking validator in execution plane | Per voice lockdown; do not add validators to `geminiVoice.ts` without voice test task |
| **Admin knowledge override** | N/A | N/A | Sentinel classifies **reason text**; not ARCH |

## ARCH semantics (current)

- Validator is **H-forward** for strong modes: it requires a **handoff / next-step** cue (question, binary choice, or similar heuristics) when `operationalMode` or ARCH handoff slider implies it.
- **SAFE** mode adds a check against **action claims** in text.
- **Full A/R/C letter-by-letter enforcement** with token budgets is **aspirational** unless product defines budgets and implements them in the validator/compiler.

### `ARCH_HANDOFF_MODE` (text paths only)

- **`replace`** (default): If ARCH validation fails, the **entire** assistant message is replaced with the deterministic fallback string from [`archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts).
- **`append`**: The model **keeps** its text; the fallback is **appended** (useful for preserving content while forcing a next-step question).

Set via environment: `ARCH_HANDOFF_MODE=replace|append`. Implemented in [`server/routes/chatRoutes.ts`](../server/routes/chatRoutes.ts) only.

## Voice and latency

- Treat "cut off" and latency as **measurable** budget violations; see [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md) and [COMMUNICATION_WINDOWS.md](./COMMUNICATION_WINDOWS.md).
- Non-blocking analytics: e.g. `voice_latency_hint`, `conversation_events` — not synchronous gates on the Live WS path.

## Related

- [CLIENT_SPEC_TREE_REGISTRY.md](./CLIENT_SPEC_TREE_REGISTRY.md) — client `gemini_2_5_flash_react_instructions/` notes vs communication/canvas SSoT (Phase 0d inventory).
- [ENTERPRISE_MATURITY_EXTENSIONS.md](./ENTERPRISE_MATURITY_EXTENSIONS.md) — strategic themes for scale/regulated contexts (**reference**; does not extend this contract's enforcement rules)
- [PROMPT_RUNTIME_GOVERNANCE.md](./PROMPT_RUNTIME_GOVERNANCE.md)
- [AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md)
- [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md)
