---
name: programmatic-sales-engine
description: >-
  Builds programmatic sales agent swarms on the Gateway Global AI OS. Use when
  creating industry funnel templates, wiring sales state machines, defining
  ARCH-enforced canvas Views, codifying channel escalation skills, deploying
  aptitude-tested agent swarms, or migrating legacy agent systems to the
  governed prompt compiler stack. Covers sales funnels, communication engine,
  PPP scoring, Nova IDV verification gates, Zero-LLM sensitive data paths,
  and the Gateway platform self-deployment as the first swarm.
---

# Programmatic Sales Engine

## Purpose

Guide developers through building **deterministic, governed sales agent swarms** on the Gateway Global AI OS. Every sales agent is programmatically generated from role-based parameter ranges (DISC, ARCH, stability dials), tested against aptitude scenarios before deployment, and constrained by ARCH token budgets that force canvas View rendering when responses exceed limits.

## When to Use

- Creating new industry funnel templates for any SaaS vertical
- Defining canvas Views that pair with conversation phases
- Adding sales state machine stages, transitions, and time enforcement
- Wiring communication engine rules (intent classification, CTA, channel escalation)
- Codifying channel optimization as pre-decided skills (phone->SMS->canvas)
- Deploying the Gateway Global AI OS platform as its own first sales swarm
- Extending PPP engagement with scoring and enforcement
- Migrating legacy `server/agents/` systems to the governed AI OS stack
- Auditing legacy services/routes/schema for AI OS compliance

## Architecture: The Three Enforcement Layers

### 1. ARCH Token Governance (Response -> View Escalation)

ARCH (Acknowledge/Reflect/Context/Handoff) defines per-section token budgets on every agent response. When a response would exceed its budget, the agent **must** render a View instead of dumping prose.

- `archEnvelopeValidator.ts` enforces on text paths with deterministic fallback
- `outputContract.maxSentences` in phase definitions enforces voice brevity
- Travel lists, pricing tables, product catalogs, confirmations -> always Views
- Views are governed UI states declared in `VIEW_REGISTRY.md`

### 2. Canvas-First Communication (Bandwidth Maximization)

Voice is the attention channel; canvas is the information channel. Phone lines are entry points, not destinations.

- Phone caller -> SMS invite (caller ID) -> web/canvas = maximum bandwidth
- Channel selection is a **skill**, not agent reasoning
- `shouldRecommendCanvasHandoff` in `conversationGrounding.ts` is the deterministic hook
- For detail, see [CANVAS_BANDWIDTH_DOCTRINE.md](reference/CANVAS_BANDWIDTH_DOCTRINE.md)

### 3. Zero-LLM Security (Sensitive Data Isolation)

Agents handling sensitive data never see it. They call skills operating outside the model context.

- `secureVaultSkill.ts`: sensitive values enter only via authenticated routes
- Nova IDV: OTP, magic link, photo ID, doc signing -- per-agent security levels
- `NovaGate` component handles verification UI; agent sees only the result
- For detail, see `NOVA_VERIFICATION_GOVERNANCE.md`

## Core Philosophy

> Developers chose the method of communication based on what's most effective and convert these choices into skills so the agent doesn't have to reason about system processes while reasoning with the guest and walking them through the gates.

- **System reasoning** (channel, View, format, token budget, verification) = pre-decided, codified as skills
- **Guest reasoning** (rapport, discovery, qualification, closing) = the agent's full cognitive budget
- **Programmatic personality** = roles define parameter ranges -> parameters generate behavior via `buildBehavioralPrompt`
- **Aptitude gate** = agents lacking knowledge/skills for their role cannot deploy
- **Separation of power** = each agent has jurisdiction, allowed entities, tools, and escalation behavior

## Key Patterns

### Pattern 1: Industry Template Creation

Follow the nail salon v1 reference. For detail, see [INDUSTRY_TEMPLATE_FACTORY.md](reference/INDUSTRY_TEMPLATE_FACTORY.md).

1. Create `shared/industryFunnelTemplates/{vertical}V1.ts`
2. Export `ConversationWorkflow` + funnel entry using Zod schemas from `shared/conversationWorkflow.ts`
3. Each phase: `id`, `label`, `goal`, `requiredContextKeys[]`, `outputContract`, `disclosureTierHint`
4. Register in `registry-yaml/industry-funnel-templates.yaml`
5. Export from `shared/industryFunnelTemplates/index.ts`
6. Test via `POST /api/site-configs/:id/funnels/apply-template`

### Pattern 2: Programmatic Agent Creation

Agents are generated from parameterized roles, not hand-written prompts:

1. Role -> DISC slider ranges (e.g., Sales: high D/I; Support: high S/C)
2. Role -> ARCH budget assignment (A: 1-2 clauses, R: 0-2, C: must include next action, H: must ask one question)
3. Role -> stability dials (emotional 0-2, friendliness 0-3, formality 0-3, directness 0-3)
4. Role -> tool/skill allowlist and verification level
5. `buildBehavioralPrompt` assembles the system prompt from all parameters
6. `agentProvisioning.ts` creates DB rows from `industry_agent_templates`

### Pattern 3: Aptitude Testing Before Deployment

Before any agent goes live, validate against governance contracts. See `tests/voice-concierge-aptitude-scenarios.ts`:

- PPP shadow scoring: responses must score >= threshold (75 for `sales_emphasis`)
- ARCH envelope: responses must include handoff cues when handoff slider >= 50
- Role-knowledge alignment: flag deployment blockers when required knowledge is missing
- New verticals must include aptitude scenario files

### Pattern 4: Communication Engine

Every agent message in sales context carries intent + CTA + state update + View pairing. For detail, see [COMMUNICATION_ENGINE.md](reference/COMMUNICATION_ENGINE.md).

### Pattern 5: Sales State Machine

Lead stages with time enforcement and automation triggers. For detail, see [STATE_MACHINE_SPEC.md](reference/STATE_MACHINE_SPEC.md).

### Pattern 6: Channel Optimization as Skills

Pre-decided by developers, codified in `siteConfigs.config.skills`:

- `channel_escalation`: phone -> SMS invite -> web canvas
- `canvas_pricing`: pricing/packages always render on SharedCanvasPanel
- `canvas_confirmation`: bookings/appointments always use canvas form Views
- `canvas_demo`: demos use canvas for interactive content, voice narrates

## Critical File References

**Sales/Funnel:**
- `shared/conversationWorkflow.ts` -- Zod schemas, `resolveCurrentPhase`, `formatPhasePromptFragment`
- `server/contracts/salesFunnels.ts` -- parser wrapper
- `shared/industryFunnelTemplates/nailSalonV1.ts` -- reference template
- `registry-yaml/industry-funnel-templates.yaml` -- template registry
- `docs-governance/SALES_FUNNEL_SPEC.md` -- funnel data model
- `docs-governance/PHASED_INDUSTRY_FUNNEL_SPEC.md` -- phased workflow spec

**Communication / ARCH / Views:**
- `server/services/promptCompiler.ts` -- assembles system prompts
- `server/services/archEnvelopeValidator.ts` -- ARCH enforcement
- `server/services/conversationGrounding.ts` -- CGR + canvas handoff
- `server/services/pppEngagementFragment.ts` -- PPP prompt fragment
- `server/services/pppShadowValidator.ts` -- PPP shadow scoring
- `server/services/stabilityDials.ts` -- bounded stability parameters
- `docs-governance/VIEW_REGISTRY.md` -- governed View definitions
- `docs-governance/COMMUNICATION_PLANE_CONTRACT.md` -- enforcement matrix

**Security / Verification:**
- `server/skills/secureVaultSkill.ts` -- Zero-LLM pattern
- `server/services/novaGuestVerification.ts` -- Nova IDV
- `docs-governance/NOVA_VERIFICATION_GOVERNANCE.md`

**Agent/Provisioning/Aptitude:**
- `server/services/agentProvisioning.ts` -- DB-backed agent creation
- `docs-governance/AGENT_POLICY_REGISTRY.md` -- per-agent jurisdiction
- `tests/voice-concierge-aptitude-scenarios.ts` -- aptitude tests

**Research/Knowledge:**
- `user_uploads/prompt_shape_behavior.md` -- communication governance research
- `user_uploads/knowledgebase.md` -- knowledge ingestion pipeline
- `docs-governance/PROMPT_SHAPE_RESEARCH_ANCHOR.md`

## Absolute Prohibitions

- NEVER import from `server/agents/` (legacy in-memory swarm -- see [LEGACY_AUDIT_AND_MIGRATION.md](reference/LEGACY_AUDIT_AND_MIGRATION.md))
- NEVER use `geminiService.ts` directly -- use prompt compiler stack
- NEVER hardcode model strings -- always `process.env.GEMINI_MODEL_ID`
- NEVER write inline system prompts -- use `buildBehavioralPrompt` from parameterized roles
- NEVER use in-memory Maps for swarm state -- use DB-backed agents via `agentProvisioning.ts`
- NEVER dump structured content verbally when ARCH budget is exceeded -- render a View
- NEVER expose sensitive data to the model context -- use Zero-LLM skills
- NEVER deploy an agent without passing aptitude tests
- NEVER add routes to `server/routes.ts` -- use modular files in `server/routes/`

## Additional Resources

- [SALES_ENGINE_SPEC.md](reference/SALES_ENGINE_SPEC.md) -- full engine specification
- [CANVAS_BANDWIDTH_DOCTRINE.md](reference/CANVAS_BANDWIDTH_DOCTRINE.md) -- View rendering and channel escalation
- [INDUSTRY_TEMPLATE_FACTORY.md](reference/INDUSTRY_TEMPLATE_FACTORY.md) -- vertical template creation guide
- [COMMUNICATION_ENGINE.md](reference/COMMUNICATION_ENGINE.md) -- message intent and CTA rules
- [STATE_MACHINE_SPEC.md](reference/STATE_MACHINE_SPEC.md) -- lead stages and automation
- [GATEWAY_SELF_DEPLOY.md](reference/GATEWAY_SELF_DEPLOY.md) -- Gateway platform as first swarm
- [LEGACY_AUDIT_AND_MIGRATION.md](reference/LEGACY_AUDIT_AND_MIGRATION.md) -- quarantine list and migration paths
