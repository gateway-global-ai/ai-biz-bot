# PPP engagement skill (index)

**Skill id:** `ppp_engagement`  
**Registry:** [SKILL_REGISTRY.md](./SKILL_REGISTRY.md) (`ppp_engagement`)

## What ships today

- **Compiler:** [`server/services/pppEngagementFragment.ts`](../server/services/pppEngagementFragment.ts) injected from [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts) (`buildBehavioralPrompt`).
- **Config:** `site_configs.communication_governance` JSON — `pppEngagement.enabled` (default on) and optional `mode: "sales_emphasis"`; see [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts).
- **CGR:** Optional `focus.prioritizedNeeds`, `supportingActivities`, `conflictingActivities` in [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts).
- **Onboarding snapshot:** `POST /api/intelligence/ppp-snapshot` in [`server/routes/intelligenceRoutes.ts`](../server/routes/intelligenceRoutes.ts).

## Human-readable spec

- [docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md](../docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md)

## Enterprise hardening (not all shipped)

- [PPP_ENTERPRISE_AUDIT_BACKLOG.md](./PPP_ENTERPRISE_AUDIT_BACKLOG.md) — scoring, optional validator, lifecycle, execution linkage, mode matrix, token budgets (Phase 2+).

## Policy

- [AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md) — Customer / sales PPP posture.
