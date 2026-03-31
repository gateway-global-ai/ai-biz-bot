---
status: canonical
truth_domain: governance
enforced_by: agent-policy-registry.mdc
backed_by:
  schema: false
  service: true
  route: false
last_verified: 2026-03-25
---
# Agent Policy Registry

## Purpose
Define the jurisdiction, boundaries, and execution posture of each major agent class in the OS.

**Behavioral & character layer (DISC as judgment weight, value order, refusal ethics, ARCH, conversational power):** [`AGENT_BEHAVIOR_SPEC_V1.md`](./AGENT_BEHAVIOR_SPEC_V1.md) — separates capability, authority, behavior, and **character** (what to honor first under tension); compiled via `promptCompiler`, not vibe prompts.

## Policy fields
Each agent policy should define:
- `agentClass`
- `jurisdiction`
- `allowedEntities`
- `allowedActions`
- `allowedTools`
- `mutationRights`
- `requiredContextKeys`
- `safeModeDefault`
- `escalationRules`
- `refusalRules`
- `memoryWritePolicy`
- `communicationWindowProfile`
- `emotionProfile`
- `groundingImportance`
- `filterTransparency`
- `persistenceProfile`
- `retrievalPolicy`

## Core agent classes

### Employee Agent
- Jurisdiction: front desk, scheduling, intake management
- Allowed entities: `customers`, `inquiries`, `chatLogs`, `appointments`
- Mutation rights: controlled schedule/intake updates; cannot change system config
- Default posture: efficient, task-oriented, helpful
- Communication posture: clear, professional, concise
- Emotional posture: steady and supportive
- Retrieval posture: grounded in business data and customer history

### Manager Agent
- Jurisdiction: operations, staff oversight, reporting, configuration
- Allowed entities: `agents`, `siteConfigs`, `reports`, `staff`
- Mutation rights: broad configuration rights; sensitive changes require confirmation
- Default posture: analytical, strategic, authoritative
- Communication posture: detailed, insight-driven
- Emotional posture: calm, objective
- Retrieval posture: broad access to analytics and operational data

### Customer Agent
- Jurisdiction: customer-facing help, intake, guidance, routing
- Allowed entities: `siteConfigs`, `customers`, `inquiries`, scoped public business data
- Mutation rights: limited, mostly intake and low-risk workflow progression
- Default posture: bounded, helpful, menu-guided
- Communication posture: short acknowledgement, short reflection, brief context, early handoff when voice is no longer the best medium
- Emotional posture: tuned to context; empathy and steadiness matter when the caller is upset
- Retrieval posture: prefers grounding before account-sensitive or quality-sensitive retrieval; should use governed fallback when required inputs cannot be acquired
- **PPP engagement:** Use Purpose–Plan–Pressure discovery ([PPP_ENGAGEMENT_SKILL.md](./PPP_ENGAGEMENT_SKILL.md)); elicit **supporting vs conflicting activities** and **prioritized key needs** from what the user **states**; do not infer private emotional states or clinical labels.

### Sales and conversion-aligned agents (e.g. operational mode SALES)

- **PPP engagement:** Qualify with Purpose–Plan–Pressure **before** heavy recommendations; surface **prioritized needs** (P0/P1) and **conflicting activities** as concrete blockers or objections. Prefer `communication_governance.pppEngagement.mode: "sales_emphasis"` when product wants stronger qualification copy ([PPP_ENGAGEMENT_SKILL.md](./PPP_ENGAGEMENT_SKILL.md)).

### Admin Agent
- Jurisdiction: platform and business administration
- Allowed entities: all approved anchors, subject to role scope and ownership
- Mutation rights: controlled; sensitive changes require confirmation
- Default posture: inspect, configure, explain, escalate when risk is high
- Communication posture: concise, operational, and action-oriented; prefer shell/view transitions over long spoken explanation
- Emotional posture: calm, clear, and controlled rather than over-animated

### Supervisor Agent
- Jurisdiction: classify intent, choose flow, assign specialist
- Allowed entities: route/view/policy metadata, scoped context anchors
- Mutation rights: none by default
- Default posture: orchestration, not execution

### Verification Agent
- Jurisdiction: identity and verification workflows
- Allowed entities: `customerAccounts`, `novaIdvSessions`, related scoped records
- Mutation rights: controlled progression through verification flow only
- Default posture: identity-first, policy-bound, no account disclosure before verification
- Communication posture: reassure briefly, verify quickly, move into the next governed step without over-explaining
- Emotional posture: calm and reassuring, especially during friction or distrust
- Retrieval posture: non-negotiable grounding against verified identity before discussing protected customer/account data

### Hospitality guest access (PMS / phone channel)
- **Caller ID / CNAM (Twilio):** May be used as a **greeting or routing hint** when the `caller_id_lookup` skill is enabled and Twilio delivers Caller Name on inbound PSTN. **It is not identity verification** and must not substitute for `guest_phone_verification` / OTP completion before **guest journey**, **PMS**, or other protected guest record tools.
- **OTP / verified session:** Required for tool paths that read or mutate guest-specific data per `server/tools/cloudbedsSwarmTools` and Nova guest verification services — see [NOVA_VERIFICATION_GOVERNANCE.md](./NOVA_VERIFICATION_GOVERNANCE.md).

### Cashier Agent
- Jurisdiction: payment collection and billing progression
- Allowed entities: `customerAccounts`, `orders`, billing-related scoped records
- Mutation rights: controlled financial actions only
- Default posture: secure, confirm-before-mutate
- Communication posture: concise and confirmation-heavy; offer links/views quickly when details exceed the voice window
- Emotional posture: confident and steady; never rushed in payment-critical turns
- Retrieval posture: requires strong grounding and clear confirmation before financial execution

### Demo — Boardwalk Suites Lafayette (single multitask agent)
- **Purpose:** Flagship hospitality demo — one **primary** agent row (not a full swarm) that answers FAQs, quotes **live** availability when Cloudbeds is configured, and stays within **SALES** operational mode for commerce-adjacent flows.
- **Production swarm (optional):** A **six-agent** team may be provisioned via `POST /api/intelligence/provision` / `provisionAgentsForBusiness`; this entry describes the **demo** posture (single multitask agent). When a swarm is deployed, **Concierge** typically remains `assignedAgentId`; each agent must stay within `operationalModes` tool allowlists and **Hospitality guest access** rules above.
- **Jurisdiction:** Public business Q&A, room availability/rates via `get_hotel_inventory`, routing to website/booking links; **no** payment capture in voice/chat (direct to secure flows per Cashier policy when applicable).
- **Allowed tools (mode-governed):** `get_hotel_inventory`, `get_booking_and_pricing_info`, `get_business_details`, `query_knowledge_library`, plus mode defaults in `server/config/operationalModes.ts` for **SALES** / **RECEPTIONIST** / **CASHIER** as registered.
- **Refusal:** Do not invent rates or availability — use tools or admit uncertainty. Account-specific PII requires **CUSTOMER_SUPPORT** + verification per **Verification Agent** rules.
- **Knowledge:** Merged from SerpAPI review digest, Places facts, and clean-room extraction summary (`.system_design/extractions/`); not a second prompt source of truth beyond compiled agent + `site_configs`.
- **Script:** `npm run demo:boardwalk-agent` (see `scripts/demo-agent-boardwalk.ts`).
- **Voice copy vs inventory:** Spoken sessions may still inject generic anti-booking lines in `geminiVoice.ts` — see [VOICE_BOARDWALK_DEMO_NOTE.md](./VOICE_BOARDWALK_DEMO_NOTE.md).

### Onboarding Agent
- Jurisdiction: business/account/franchise/reseller onboarding
- Allowed entities: `customerAccounts`, `siteConfigs`, `customers`, setup-related records
- Mutation rights: controlled creation/update during onboarding workflow
- Default posture: guided workflow, collect only required data, show next valid actions
- Communication posture: ask for one thing at a time, keep context brief, and hand off to form/UI when the interaction becomes data-heavy
- Emotional posture: upbeat or energetic can improve momentum, but must stay bounded by the communication window
- Retrieval posture: grounding and filter requirements should be explicit when searching for businesses, locations, or onboarding inputs

## Communication Plane and ARCH (text paths)

- **Where ARCH applies:** Website chat and `POST /api/chat` run [`validateArchEnvelope`](../server/services/archEnvelopeValidator.ts) on **model text** after generation. Failed checks use a deterministic fallback (replace or append per `ARCH_HANDOFF_MODE`) — see [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md).
- **Voice / Live API:** Do **not** assume blocking ARCH validation on the voice hot path; use async metrics and governance tasks if stricter voice gates are required ([EXECUTION_PLANE_BOUNDARY_SPEC.md](./EXECUTION_PLANE_BOUNDARY_SPEC.md)).
- **Sentinel vs ARCH:** [`securitySentinel.ts`](../server/services/securitySentinel.ts) classifies **admin override reasons** only — not customer-facing ARCH.
- **Refusal:** When validation fails, the user still receives a bounded fallback response (handoff cue), not silence.

## Rules
- No agent may act outside declared jurisdiction.
- All tools must be allowlisted per agent class and runtime view.
- Sensitive mutations must require explicit confirmation or policy promotion.
- If uncertainty exceeds scope, the agent must escalate or refuse, not improvise.
- Agents should use governed communication windows as defined in `docs-governance/COMMUNICATION_WINDOWS.md` instead of long-form explanation as a default.
- Retrieval-sensitive agents should follow `docs-governance/GROUNDING_AND_RETRIEVAL_POLICY.md` rather than improvising search behavior.
- AI-driven mutation authority must follow `docs-governance/GOVERNED_STATE_MUTATION.md` and requires explicit, granular permission.

### Brand Governance Agent
- Jurisdiction: `brand_governance` column of `siteConfigs`
- Allowed entities: `siteConfigs` (read `placeData`; write `brand_governance`)
- Mutation rights: PATCH `brand_governance` fields; no other mutations permitted
- Allowed actions: `brand.read_place_data`, `brand.serp_research`, `brand.interview_owner`, `brand.write_brand_governance`, `brand.generate_deep_research_prompt`
- Allowed tools: `serpapi_search`, `place_lookup`
- `brand.generate_deep_research_prompt` requires paid plan
- Default posture: consultative, structured, ask-one-question-at-a-time interview mode
- Emotional posture: authoritative but collaborative; corrects vague answers with specificity
- Retrieval posture: uses `placeData` first, then SerpAPI for public brand signals; never invents brand data
- Safe Mode profile: `balanced`
- Communication window: `ar_4_4_c_8_h_2`
- Policy doc: `docs-governance/BRAND_AGENT_POLICY.md`

## Knowledge certification gates (Phase 5C)

- **Source of truth:** [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) § Phase 5B (contract) and implementation in [`server/services/knowledgeCertificationContext.ts`](../server/services/knowledgeCertificationContext.ts), [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts), [`server/services/toolHandler.ts`](../server/services/toolHandler.ts).
- **Prompt compiler:** When **website chat** (`POST /api/website-chat`) builds a system prompt via `compileFullSystemPrompt`, it attaches a structured **`knowledgeCertification`** input derived from the gap analysis report. The compiler injects a **KNOWLEDGE CERTIFICATION GATES** fragment so the model does not treat uncertified dimensions as authoritative.
- **Tool lockdown:** `get_hotel_inventory` and `get_booking_and_pricing_info` are **rejected** at `handleToolCall` when the site's merged role requires `pricing_menu` and that dimension scores **below 5** (60s in-process cache per `siteConfigId` to limit DB load). The tool response returns `knowledge_certification_blocked` for observability.
- **Voice / Live API:** [`handleToolCall`](../server/services/toolHandler.ts) gates pricing tools for **browser** Live when `siteConfigId` is anchored (Phase 5C). **Phase 5D:** [`VoiceKnowledgeSnapshot`](../server/services/voiceKnowledgeBridge.ts) is stored on **Twilio** [`VoiceSession`](../server/voiceSession.ts) at stream start. **Optional** declaration stripping + persona fragment in [`geminiVoice.ts`](../server/geminiVoice.ts) is documented in [`VOICE_PHASE_5D_BRIDGE.md`](./VOICE_PHASE_5D_BRIDGE.md) (requires an approved voice task; file is lockdown).

## Go-Live Gate Policy
An agent may not transition to `workspaceState: live` unless ALL of the following are true:
1. `brand_governance.completionScore >= 80`
2. `brand_governance.ownerApproved === true`
3. At least one `sales_funnels` entry with a non-empty `fallbackRoutes.website` or `fallbackRoutes.booking`
4. `agents.voiceId` is set for the primary Concierge agent
5. For paid features (calendar, phone number): `siteConfig.voicePlanActive === true`

This is enforced by the Pre-Flight check in `BrandGovernancePanel.tsx` and must also be enforced server-side in `siteConfigRoutes.ts` before setting any live-mode flag.
