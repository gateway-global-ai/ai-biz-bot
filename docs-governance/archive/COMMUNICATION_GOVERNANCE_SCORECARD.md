# Communication Governance Scorecard

Version: 1.0  
Purpose: Auditable 0–10 self-assessment for the **Communication Plane** (connection, transparency, ARCH, character, latency) versus the research baseline in [user_uploads/AI_OS_GOVERNANCE_SYSTEMS.md](../user_uploads/AI_OS_GOVERNANCE_SYSTEMS.md) and [PROMPT_SHAPE_RESEARCH_ANCHOR.md](./PROMPT_SHAPE_RESEARCH_ANCHOR.md).

## How to use

1. For each **vector**, assign a score 0–10 using the **evidence** column.
2. Record the **git SHA** and **date** when scoring.
3. Run `npx tsx scripts/governance-maturity-score.ts` for a machine-assisted snapshot (heuristic; human review is authoritative).

## Vectors

| Vector | What “10” means | Primary evidence in repo |
|--------|-----------------|---------------------------|
| **Zero-LLM & task budgets** | Sensitive flows never expose raw secrets to the model; structured capture only. | `server/routes/secureVaultRoutes.ts`, `server/services/intakePolicyService.ts`, `server/services/sensitiveInputGuard.ts` |
| **Multimodal switching** | Deterministic recommendation to richer channel when PSTN is narrowband and task needs visual/structured verification. | `server/services/conversationGrounding.ts` (`shouldRecommendCanvasHandoff`), `conversation_events` via `telephonyRoutes` (`cgr_voice_hint`) |
| **Transparency & disclosure** | Progressive disclosure policy (not maximal upfront); compiler-injected lines. | `server/services/disclosurePolicy.ts`, `server/services/promptCompiler.ts`, `site_configs.communication_governance` |
| **ARCH enforcement** | Programmatic validation on text paths; deterministic fallback when H-budget fails. | `server/services/archEnvelopeValidator.ts`, `server/routes/chatRoutes.ts` |
| **Character & loyalty (Stability Dials)** | Bounded dials + Principal-of-Record; DISC as style DSL only. | `server/services/stabilityDials.ts`, `promptCompiler`, `communication_governance` JSON |
| **Turn-taking / latency** | Measured budgets; async analytics for voice/session hints (no hot-path blocking). | `analytics_logs` event `voice_latency_hint`, `conversation_events` |

## Score log (template)

| Date | SHA | Zero-LLM | Multimodal | Disclosure | ARCH | Character | Latency | Notes |
|------|-----|----------|------------|------------|------|-----------|---------|-------|
| | | | | | | | | |

## Evidence links (canonical)

- [ENTERPRISE_MATURITY_EXTENSIONS.md](./ENTERPRISE_MATURITY_EXTENSIONS.md) — optional **future** enterprise themes (quantification, certification, audit consolidation); **not** additional score vectors unless product adopts them
- [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md) — enforcement matrix (chat vs voice), ARCH vs Sentinel, `ARCH_HANDOFF_MODE`
- [PROMPT_SHAPE_RESEARCH_ANCHOR.md](./PROMPT_SHAPE_RESEARCH_ANCHOR.md) — research claims → code paths
- [AGENT_SWARM_DEPLOYMENT_RUNBOOK.md](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md) — Layer 1: agents must exist before scoring “connection”
- Runtime: [`server/services/archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts), [`server/routes/chatRoutes.ts`](../server/routes/chatRoutes.ts), [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts)

## Related

- [EXECUTION_PLANE_BOUNDARY_SPEC.md](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
- [PROMPT_RUNTIME_GOVERNANCE.md](./PROMPT_RUNTIME_GOVERNANCE.md)
- [SAFE_MODE_CONTRACT.md](./SAFE_MODE_CONTRACT.md)
