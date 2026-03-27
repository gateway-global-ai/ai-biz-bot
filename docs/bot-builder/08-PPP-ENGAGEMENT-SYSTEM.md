# 08 — Purpose · Plan · Pressure (PPP) Engagement System

**Skill id (registry):** `ppp_engagement`  
**Compiler:** Injected via [`server/services/pppEngagementFragment.ts`](../../server/services/pppEngagementFragment.ts) + [`server/services/promptCompiler.ts`](../../server/services/promptCompiler.ts) for all agents using `buildBehavioralPrompt` (website chat + voice compile path). Opt out per site: in `site_configs.communication_governance` JSON set `"pppEngagement": { "enabled": false }`.

## What this is (and is not)

- **Is:** A structured way to ground advice in **outcomes, plans, deadlines, observable actions**, **supporting vs conflicting activities**, and **prioritized key needs**.
- **Is not:** Therapy, personality evaluation, or “feelings-first” dialogue. Stay on **business outcomes, commitments, and tradeoffs**.

## The three lenses

| Lens | Meaning |
|------|--------|
| **Purpose** | What outcome they want and **why** (business rationale). |
| **Plan** | How they intend to get there (gaps become the fix). |
| **Pressure** | **When** the outcome must land — deadlines and accountability. |

## Core questions

1. What outcome are you looking for?
2. Why do you want that outcome?
3. What’s your plan to get there?
4. When is that outcome supposed to be completed by?

## Supporting vs conflicting (alias: empowering / disempowering)

- **Supporting activities:** Actions that move toward the stated outcome.
- **Conflicting activities:** Concrete conflicts (competing priorities, tools not adopted, scheduling) — **not** character judgments.

## Prioritized key needs

After the spine is clear, agree on **P0 / P1** (or top 1–3) for **this** conversation or engagement.

## Engagement timing (Bot Builder / first session)

- **~30 seconds:** Warmth + one purpose-oriented question.
- **~5 minutes:** Complete the four-question arc, then supporting/conflicting + prioritized needs, then deep configuration.

## Onboarding research

Bounded **inferred** PPP from public data: `POST /api/intelligence/ppp-snapshot` (auth). See [AGENT_POLICY_REGISTRY.md](../docs-governance/AGENT_POLICY_REGISTRY.md) and [SKILL_REGISTRY.md](../docs-governance/SKILL_REGISTRY.md).

## Voice client merge (separate task)

`client/src/services/voice/GeminiStreamingClient.ts` is lockdown-protected. Server-side `buildBehavioralPrompt` already applies PPP for Live API when the session uses compiled prompts from DB.

## Enterprise follow-ups (not all implemented)

Scoring, optional validators, lifecycle analytics, and execution linkage are tracked in [PPP_ENTERPRISE_AUDIT_BACKLOG.md](../docs-governance/PPP_ENTERPRISE_AUDIT_BACKLOG.md) so the core skill stays **governed** without hypothetical features in the active contract.
