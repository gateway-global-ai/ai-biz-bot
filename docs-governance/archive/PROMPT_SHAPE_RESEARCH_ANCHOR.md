# Prompt shape and Communication Plane — research anchor

Version: 1.0  
Purpose: Repository-owned digest of the empirical report in [user_uploads/prompt_shape_behavior.md](../user_uploads/prompt_shape_behavior.md), with **claim-to-code** mapping for auditors and implementers.

## Source narrative

The author’s original design brief (beliefs on transparency, programmatic grounding, ARCH, modalities, DISC, loyalty, tasks) is the **normative** layer. The upload file is the **synthesized research** layer (citations, caveats, operational implications). This anchor ties both to **runtime artifacts** and to the Layer 1 deploy process in [AGENT_SWARM_DEPLOYMENT_RUNBOOK.md](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md). The plan appendix in `.cursor/plans/communication_plane_docs+code_eb5500c0.plan.md` records belief-to-section alignment.

## Executive summary (cleaned)

The platform direction is a shift from “prompt-shaped behavior” to **programmatic governance**: explicit grounding, bounded communication windows, multimodal channel selection, and deterministic fallbacks so connection and outcomes are **engineered**, not hoped for.

Key empirical nuances (details in the full upload):

- **Transparency** supports trust, but **maximal upfront** bot disclosure can hurt conversion and perceived competence in some channels; prefer **progressive disclosure** tied to risk, compliance, and measured outcomes.
- **Grounding / common ground** theory supports structured **who / what / where / why / when** as machine-validated state (CGR), not only natural-language inference.
- **Telephony “bandwidth”** is best described as **narrowband audio** and codec constraints, not a single kbps number; **wideband VoIP** and **UI/canvas** reduce grounding cost for complex tasks.
- **DISC** is usable as a **style DSL** for agent character; psychometric claims should stay modest versus Big Five evidence in the literature.
- **High-stakes** outputs need **Zero-LLM** structured capture, **task budgets**, and **audit** — not conversational compliance alone.

## Research claims → platform evidence

| Research claim (short) | Where implemented or documented |
| --- | --- |
| Progressive disclosure vs timing of AI identity | [`server/services/disclosurePolicy.ts`](../server/services/disclosurePolicy.ts), `site_configs.communication_governance`, compiler |
| Conversation Grounding Record (CGR) | [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts), [`server/services/conversationGrounding.ts`](../server/services/conversationGrounding.ts), chat responses `communication.cgr` |
| ARCH as verifiable text contract (H-forward today) | [`server/services/archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts), [`server/routes/chatRoutes.ts`](../server/routes/chatRoutes.ts); [`COMMUNICATION_PLANE_CONTRACT.md`](./COMMUNICATION_PLANE_CONTRACT.md) |
| Full A/R/C token budgets | **Partially** via compiler ARCH sliders; **letter-by-letter** enforcement aspirational unless product defines budgets |
| Multimodal switch when narrowband + visual/structured need | `shouldRecommendCanvasHandoff`, telephony events (see scorecard) |
| Zero-LLM / sensitive capture | [`server/routes/secureVaultRoutes.ts`](../server/routes/secureVaultRoutes.ts), intake/sensitive guards (see [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md)) |
| Admin override reason audit (not ARCH) | [`server/services/securitySentinel.ts`](../server/services/securitySentinel.ts) — **Sovereign Sentinel** |
| DISC + stability as bounded parameters | [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts), [`server/services/stabilityDials.ts`](../server/services/stabilityDials.ts), agent `archProfile` |
| Principal-of-record / loyalty | Policy direction in full report; partial expression in CGR-oriented fields and [AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md) |
| Task budgets and tool gating | Operational modes, tool handler, governance docs; full TaskSpec-style runtime is incremental |
| Deploy agents before conversation quality work | [AGENT_SWARM_DEPLOYMENT_RUNBOOK.md](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md), [`server/services/agentProvisioning.ts`](../server/services/agentProvisioning.ts) |

## Full text

The complete citation-heavy report remains in [user_uploads/prompt_shape_behavior.md](../user_uploads/prompt_shape_behavior.md). Prefer this anchor for **navigation**; prefer the upload for **verbatim research detail**. Editor artifacts in the upload (e.g. legacy citation tokens) may be cleaned in place over time without changing substance.

## Related

- [ENTERPRISE_MATURITY_EXTENSIONS.md](./ENTERPRISE_MATURITY_EXTENSIONS.md) — paraphrased strategic themes (certification, measurable skills, roster planning) **without** hypothetical specs; use when aligning external reviews to the repo
- [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md)
- [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md)
- [PROMPT_RUNTIME_GOVERNANCE.md](./PROMPT_RUNTIME_GOVERNANCE.md)
- [user_uploads/AI_OS_GOVERNANCE_SYSTEMS.md](../user_uploads/AI_OS_GOVERNANCE_SYSTEMS.md)
