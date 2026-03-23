---
name: knowledge-engineering-lead
description: Umbrella — KAP, trust weights, gap analysis, audit plane, certification UI, and governance review for knowledge-affecting work.
---

# Knowledge Engineering Lead (Umbrella)

Use this skill when work affects **knowledge artifacts**, **proficiency**, **certification**, **RAG**, or **owner-facing “Path to 10/10”** behavior.

## When to use

- Changing [`server/services/knowledgeGapAnalysis.ts`](../../../server/services/knowledgeGapAnalysis.ts), [`knowledgeCertificationContext.ts`](../../../server/services/knowledgeCertificationContext.ts), or admin certification UI.
- Pre-implementation review of **knowledge-affecting** features.

## Deep skills

| Skill | Focus |
|-------|--------|
| [`governance-review`](../governance-review/SKILL.md) | Control plane, preflight, policy |
| [`serpapi-data`](../serpapi-data/SKILL.md) | External data / research (when applicable) |

## Cursor rules

- [`.cursor/rules/prompt-runtime-governance.mdc`](../../rules/prompt-runtime-governance.mdc)
- [`.cursor/rules/agent-policy-registry.mdc`](../../rules/agent-policy-registry.mdc)
- [`.cursor/rules/execution-plane-boundary.mdc`](../../rules/execution-plane-boundary.mdc)

## Governance docs

- [`docs-governance/KNOWLEDGE_PLAN_ORCHESTRATOR.md`](../../../docs-governance/KNOWLEDGE_PLAN_ORCHESTRATOR.md)
- [`docs-governance/SAFE_MODE_CONTRACT.md`](../../../docs-governance/SAFE_MODE_CONTRACT.md) (Phase 5B/C)
- [`docs-governance/AGENT_POLICY_REGISTRY.md`](../../../docs-governance/AGENT_POLICY_REGISTRY.md) — certification gates section

## Key code

- Gap: [`server/services/knowledgeGapAnalysis.ts`](../../../server/services/knowledgeGapAnalysis.ts)
- Routes: [`server/routes/knowledgeGapRoutes.ts`](../../../server/routes/knowledgeGapRoutes.ts)
- Admin UI: [`client/src/components/admin/KnowledgeProficiencyCard.tsx`](../../../client/src/components/admin/KnowledgeProficiencyCard.tsx)
