---
status: canonical
truth_domain: runtime
enforced_by: view-and-action-registry.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---
# Action Registry

## Purpose
Define executable operations available from views and routes.

The Action Registry works closely with `docs-governance/ACTIONABLE_EVENTS_MODEL.md`, which classifies business/provider data into governed event types before they become executable routes or actions.
It also works with `docs-governance/UI_ELEMENT_REGISTRY.md` when inbound actions need to guide or focus the interface safely.
State-changing actions must additionally comply with `docs-governance/GOVERNED_STATE_MUTATION.md`.
Infrastructure-facing state changes must additionally comply with `docs-governance/RUNTIME_CONTROL_GOVERNANCE.md`.

## Action fields
Each action should declare:
- `actionId`
- `allowedEntities`
- `requiredContextKeys`
- `requiredPolicy`
- `mutationLevel`
- `domainHandler`
- `requiresConfirmation`
- `safeModeBehavior`

## Mutation levels
- `none`
- `read_only`
- `controlled`
- `sensitive`

## Example
`agent.updateBehavior`
- allowed entity: `agents`
- required keys: `siteConfigId`, `agentId`
- mutation level: `controlled`
- requires confirmation: optional depending on field group

## Site config — sales funnels (phased industry)

`siteConfig.patchSalesFunnels`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, authenticated session
- mutation level: `controlled`
- domain handler: `PATCH /api/site-configs/:id/funnels` (Zod-validated `sales_funnels` array)
- requires confirmation: no

`siteConfig.applyIndustryFunnelTemplate`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `templateId` (e.g. `nail_salon_v1`)
- mutation level: `controlled`
- domain handler: `POST /api/site-configs/:id/funnels/apply-template`
- requires confirmation: no (idempotent append; duplicate template skipped)

## AI Design Studio (governed pipeline)

**Spec:** [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md). **Machine registry:** [`actions.yaml`](../../registry-yaml/actions.yaml). **Handoff type:** [`shared/designStudioHandoff.ts`](../../shared/designStudioHandoff.ts).

Navigation and state for Chad / Design Studio. **Handlers** are logical names until modular routes or orchestration wire them; mutation levels follow risk.

`design_studio.learn_more`
- allowed entity: `siteConfigs` (session-scoped UI transition)
- required keys: `siteConfigId`
- mutation level: `read_only`
- domain handler: `design_studio/navigateLearn` (view transition only)
- requires confirmation: no

`design_studio.new_project`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, optional `design_handoff` payload
- mutation level: `controlled`
- domain handler: `design_studio/createOrResumeProject`
- requires confirmation: no

`design_studio.back_landing`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`
- mutation level: `read_only`
- domain handler: `design_studio/navigateLanding`

`design_studio.choose_build_view` / `design_studio.choose_build_app`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`
- mutation level: `controlled`
- domain handler: `design_studio/setBuildMode`
- requires confirmation: no

`design_studio.advance_phase`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`, `nextPhaseKey`
- mutation level: `controlled`
- domain handler: `design_studio/advancePhase`

`design_studio.approve_plan`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`, `planVersion`
- mutation level: `controlled`
- requires confirmation: yes (owner explicit)

`design_studio.commit_theme`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`, `themeProfileId` (token bundle id, not raw hex)
- mutation level: `controlled`
- domain handler: `design_studio/commitTheme`

`design_studio.map_data_source` / `design_studio.map_data_destination`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`
- mutation level: `sensitive` (may imply credentials / integration scope)
- domain handler: `design_studio/mapDataContract`
- requires confirmation: yes when credentials involved

`design_studio.select_components`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`, manifest entry ids (from `gateway-sdk-manifest.yaml`)
- mutation level: `controlled`
- domain handler: `design_studio/selectComponents`

`design_studio.run_test`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`
- mutation level: `read_only` (dry-run / preview)
- domain handler: `design_studio/runPreview`

`design_studio.save_artifact`
- allowed entity: `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`
- mutation level: `controlled`
- domain handler: `design_studio/saveArtifact`
- requires confirmation: yes when overwriting published artifact

`design_studio.configure_knowledge` / `design_studio.configure_behavior`
- allowed entity: `agents`, `siteConfigs`
- required keys: `siteConfigId`, `designProjectId`, `agentId` (target)
- mutation level: `controlled` / `sensitive` per content
- domain handler: `design_studio/patchAgentKnowledge` / `design_studio/patchAgentBehavior`
- requires confirmation: yes before production deploy

`design_studio.publish`
- allowed entity: `siteConfigs`, `agents`
- required keys: `siteConfigId`, `designProjectId`, deployment checklist from spec §15
- mutation level: `controlled`
- requires confirmation: yes
- domain handler: `design_studio/publish`

## Rules
- No executable mutation may exist only inside a UI file.
- Every action must map to a domain handler and policy expectation.
- Safe Mode must affect whether an action is available or requires promotion.
- Data-heavy provider fields should be normalized into actionable events before being exposed as routes, actions, or handoffs.
- UI-driving actions must resolve through the UI Element Registry rather than hardcoded DOM knowledge.
- AI-driven state mutation must be visible, policy-gated, and auditable.
