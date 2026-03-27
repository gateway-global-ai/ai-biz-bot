---
status: canonical
truth_domain: runtime
enforced_by: teams-agents-provisioning-matrix.mdc
backed_by:
  schema: true
  service: true
  route: true
last_verified: 2026-03-25
---
# Agent swarm deployment runbook

Version: 1.0  
Audience: operators, solutions engineers, on-call developers  
Status: Canonical Layer 1 process (infrastructure before [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md))

## Purpose

Deliver a **repeatable path** from an empty or single-agent site to a **full industry-templated roster** (typically six archetypes) with a **primary Concierge** assigned on `site_configs.assignedAgentId`. This runbook is the north-star process for "deploy agents for a business."

## Prerequisites

1. **`site_configs` row** exists for the business (`siteConfigId`).
2. **Industry signal:** `placeTypes` array (Google Places–style types) used to map to an `IndustryGroup` via `PLACES_TYPE_TO_INDUSTRY` in [`shared/schema`](../shared/schema.ts). If unknown, provisioning still runs with default industry detection (see [`server/services/agentProvisioning.ts`](../server/services/agentProvisioning.ts) `detectIndustryGroup`).
3. **Templates:** Active rows in `industry_agent_templates` for that industry group (seeded via scripts such as `scripts/seed-industry-templates.ts`). If no templates match, provisioning returns **zero agents** and logs a warning.
4. **Authentication:** The provision HTTP endpoint requires a logged-in session (`requireAuth`).

## API: provision the swarm

**Endpoint:** `POST /api/intelligence/provision`  
**Router:** [`server/routes/intelligenceRoutes.ts`](../server/routes/intelligenceRoutes.ts)  
**Implementation:** [`runAgentSwarmProvisionOrchestrated`](../../server/services/agentOrchestration.ts) → [`provisionAgentsForBusiness`](../../server/services/agentProvisioning.ts) (see [SOVEREIGN_OS_V1_SPEC.md](./SOVEREIGN_OS_V1_SPEC.md)). **Default path:** `POST /api/site-configs` also runs the orchestrated provision after site create.

### Request body (JSON)

| Field | Type | Notes |
| --- | --- | --- |
| `siteConfigId` | string | Required. Target site. |
| `placeTypes` | string[] | Optional; default `["establishment"]`. Drives `IndustryGroup`. |
| `businessName` | string | Required. Used for display names and voice company name on agents. |
| `admissionContractId` | string | **Required when** `placeTypes` resolve to `hospitality_travel` (unless `HOSPITALITY_PROVISION_CONTRACT_ENFORCE=0`). Value: `onboarding.hospitality.phase1.v1`. |
| `admissionContractHash` | string | **Required** with id above. SHA-256 hex from [`shared/onboardingPhase1ContractDefinition.ts`](../../shared/onboardingPhase1ContractDefinition.ts) `EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH`. |
| `admissionContractVersion` | string | Optional. Schema version string (e.g. `1`); forwarded for audit. |

### Example

```bash
curl -X POST "$BASE/api/intelligence/provision" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "siteConfigId": "<uuid>",
    "placeTypes": ["lodging", "establishment"],
    "businessName": "Example Hotel",
    "admissionContractId": "onboarding.hospitality.phase1.v1",
    "admissionContractHash": "<run: npm run validate:onboarding-contract-hash>",
    "admissionContractVersion": "1"
  }'
```

### Success response

Returns `agentsCreated`, `agentIds`, `industryGroup`, and `archetypesProvisioned` (template `roleType` values, e.g. `concierge`, `booking_coordinator`).

### Primary agent assignment

After creating agents, provisioning sets **`site_configs.assignedAgentId`** to the **Concierge** agent when that archetype exists; otherwise the **first** created agent ID. See [`agentProvisioning.ts`](../server/services/agentProvisioning.ts) (concierge index lookup).

## Resolving `placeTypes` when you only have a Place ID

Use `POST /api/intelligence/resolve` with `placeId` to obtain `placeTypes` and `business_name` from SerpAPI-backed place info (see [`intelligenceRoutes.ts`](../server/routes/intelligenceRoutes.ts)), then call `/provision` with those values.

## Verification checklist

1. **Row count:** Query `agents` for `site_config_id = <siteConfigId>` — expect one row per template (often six).
2. **Archetypes:** Confirm `role_type` values match expectations for the industry.
3. **Primary:** `site_configs.assigned_agent_id` points to Concierge (or first agent if Concierge missing).
4. **Behavior:** Public/owner flows that use `assignedAgentId` (e.g. website chat, concierge voice) should target the intended agent. Admin UI: [`client/src/pages/agents/AgentManager.tsx`](../client/src/pages/agents/AgentManager.tsx).

## Known gap: site create vs automatic provisioning

**Today:** `POST /api/site-configs` (or equivalent) creates the `site_configs` row via [`storage.createSiteConfig`](../server/storage.ts) in [`server/routes/siteConfigRoutes.ts`](../server/routes/siteConfigRoutes.ts) **without** automatically calling `provisionAgentsForBusiness`.

**Effect:** New sites may have **no swarm** until something explicitly calls `POST /api/intelligence/provision`.

**Options:**

- **Operational:** Run provision manually or from your onboarding automation after site creation (this runbook).
- **Product/engineering:** Add a **modular** post-create hook in `siteConfigRoutes.ts` (or a dedicated service) that calls `provisionAgentsForBusiness` when `placeTypes` and `businessName` are known — **do not** add new route handlers inside the legacy `server/routes.ts` body; follow [modular-routing.mdc](../.cursor/rules/modular-routing.mdc).

Authoritative rule text: [.cursor/rules/teams-agents-provisioning-matrix.mdc](../.cursor/rules/teams-agents-provisioning-matrix.mdc).

## Vertical-specific: hospitality

For hotel Cloudbeds alignment, tools, and voice notes, see [HOSPITALITY_SWARM_RUNBOOK.md](./HOSPITALITY_SWARM_RUNBOOK.md). The **same six archetypes** apply globally; hospitality adds PMS/tooling context.

## Related

- [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) — reading order
- [AGENT_POLICY_REGISTRY.md](./AGENT_POLICY_REGISTRY.md) — Demo / swarm posture
- [SKILL_REGISTRY.md](./SKILL_REGISTRY.md) — Bot Builder skills vs this deploy process
