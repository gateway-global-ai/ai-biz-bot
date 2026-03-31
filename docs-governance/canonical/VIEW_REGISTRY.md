---
status: canonical
truth_domain: ui
enforced_by: view-and-action-registry.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-29
---
# View Registry

## Purpose
Define the governed UI states the OS may render.

**Related:** [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) (canvas-safe components and `@/ui` contract). [CLIENT_SPEC_TREE_REGISTRY.md](./CLIENT_SPEC_TREE_REGISTRY.md) maps client-side spec notes (e.g. manual input, tour panels) to governed views.

## View categories
- `menu`
- `form`
- `controller`
- `inspector`
- `confirmation`
- `refusal`
- `ptt_first`
- `intent_entry` (customer idle framing — paired with `OSMenuList`, not replace it)
- `shared_form_canvas` (structured `shared_canvas` / manual input tool — server-driven metadata)

## View fields
Each view definition should declare:
- `viewId`
- `category`
- `requiredContextKeys`
- `allowedActions`
- `dataContract`
- `renderHints`
- `policyGate`

### intent_entry (customer idle)

- **viewId**: `intent_entry`
- **category**: `menu`
- **requiredContextKeys**: `businessName` (or `siteConfigId` resolving to business), `surface` ∈ `customer_entry`
- **allowedActions**: `show_os_menu`, `start_voice`, `open_chat` (via existing shell; no new routes required)
- **renderHints**: Short welcome + intent prompt **above** `OSMenuList`; see [INTENT_DRIVEN_CANVAS_SPEC.md](../archive/INTENT_DRIVEN_CANVAS_SPEC.md) (archived — reference only).

### shared_form_canvas

- **viewId**: `shared_form_canvas`
- **category**: `form`
- **requiredContextKeys**: `siteConfigId`, tool `metadata` with `shared_canvas` or `manual_input` shape
- **allowedActions**: `submit_tool_result`, `cancel_tool`
- **renderHints**: `SharedCanvasPanel` / `ManualDataInput` with optional `prefill` / `initialValue` from `metadata` — ask only missing fields.
- **policyGate**: Intake / verification policy when PII is collected

### integration_connect_surface

Operator-only narrow surface for PMS vendor connect (SMS deep-link → HttpOnly session → OAuth/API proof). The browser path is **not** authority — it is an adapter for logical route `operator.integration.connect`.

- **viewId**: `integration_connect_surface`
- **category**: `form` (credential / OAuth handoff; no arbitrary data entry beyond token paste recovery)
- **requiredContextKeys**: Resolved via `GET /api/integration/connect/governance-context` (canonical `logicalRouteId`, `viewId`, optional `session`); then `POST /api/integration/connect/exchange` with `token` when session is absent
- **allowedActions**: Typed to `POST /api/integration/connect/exchange` and server-provided OAuth start path from `/cloudbeds/surface` — register discrete `actionId`s in ACTION_REGISTRY when the action plane wires this view.
- **dataContract**: `{ siteConfigId?, vendorId, oauthStartPath?, pmsProjection?: … }` from `/cloudbeds/surface`; hotel proof from `/cloudbeds/hotel-details` (sanitized)
- **renderHints**: Load **governance-context first**; render only after `viewId === integration_connect_surface` matches server response. Shell: `SovereignPageShell` + canvas tokens from `@/config/brand`.
- **policyGate**: Single-use token exchange; short-lived signed session cookie; vendor match (`cloudbeds`)

### Canvas syscall views (Demo 0 — governed canvas proof)

These views are selected only via **`POST /api/canvas-control`** with `syscall: canvas.resolve` (deterministic Tier-1 rules in `canvasIntentRouter`) or validated `canvas.render` — not by browser routes or raw Gemini tool metadata. Pinned rendering: [`ConciergePanel`](../../client/src/components/chat/ConciergePanel.tsx) + [`VoiceTurnOrchestrator`](../../client/src/services/voiceTurnOrchestrator.ts). See [`DEMO0_GOVERNED_CANVAS_PROOF.md`](./DEMO0_GOVERNED_CANVAS_PROOF.md). **Normative composition model:** [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md).

#### service_menu

- **viewId**: `service_menu`
- **category**: `menu`
- **requiredContextKeys**: `siteConfigId` (via syscall envelope); hydration from `SiteRuntimeContext.business.serviceMenu`
- **allowedActions**: `open_service_menu` (declared in site entitlements); navigation originates from syscall plane only
- **dataContract**: `ServiceMenuViewModel` in [`canvasViewContract.ts`](../../shared/canvasViewContract.ts)
- **policyGate**: `allowedCanvasViews` + plan/workspace gates in `canvasDirectiveValidator`

#### faq_list

- **viewId**: `faq_list`
- **category**: `menu`
- **requiredContextKeys**: `siteConfigId`; hydration from `business.faqs`
- **allowedActions**: `open_faq`
- **dataContract**: `FAQListViewModel` in [`canvasViewContract.ts`](../../shared/canvasViewContract.ts)
- **policyGate**: same as `service_menu`

#### command_center

- **viewId**: `command_center`
- **category**: `inspector`
- **requiredContextKeys**: `siteConfigId` (syscall envelope); optional `SiteRuntimeContext.entitlements` for status lane copy
- **allowedActions**: Approval rows dispatch `actionId` through existing skill/onAction paths when populated
- **dataContract**: `CommandCenterViewModel` in [`canvasViewContract.ts`](../../shared/canvasViewContract.ts)
- **renderHints**: Zoned layout (status lane, main work list, optional approvals) — renderer uses palette primitives only; see [`GOVERNED_GENERATIVE_UI_SPEC.md`](./GOVERNED_GENERATIVE_UI_SPEC.md) and [`COMMAND_CENTER_SURFACE_SPEC_V1.md`](./COMMAND_CENTER_SURFACE_SPEC_V1.md) (slots, allowed patch/action, narration, demo loop).
- **policyGate**: `allowedCanvasViews` + **staff/admin** in `canvasDirectiveValidator`; Tier-1 phrases in `canvasIntentRouter`

## Rules
- Views are loaded through the registry only.
- A view may only expose actions declared in the Action Registry.
- A view may not contain hidden side-effect behavior.
- A view may render only with satisfied context and policy gates.
- The shell remains mounted while views swap in the main canvas.

---

## Onboarding Views (5-Step AI Biz Bot Flow)

These views are admin-only, rendered inside the ConciergePanel canvas. Each step is driven by the AI Biz Bot through conversation. Navigation is controlled by `POST /api/onboarding/:id/step`.

### step_1_business_research
- **viewId**: `step_1_business_research`
- **category**: `form`
- **requiredContextKeys**: `siteConfigId`, `adminSession`
- **allowedActions**: `enrichFromGooglePlaces`, `uploadAsset`, `linkSocialProfile`, `linkWebsite`, `linkDigitalStore`
- **dataContract**: `{ googlePlaceId?, logoUrl?, websiteUrl?, onlineStoreUrl?, socialProfiles[], planningDocs[] }`
- **renderHints**: AI Biz Bot collects Google Business Profile data, logos, website, storefronts, social media, planning documents
- **policyGate**: `requireAuth`, `role === 'superadmin'`

### step_2_products_services
- **viewId**: `step_2_products_services`
- **category**: `form`
- **requiredContextKeys**: `siteConfigId`, `adminSession`, `onboardingSessionId`
- **allowedActions**: `createProduct`, `createService`, `setPricing`, `linkStripe`
- **dataContract**: `{ products[], services[], pricingModel? }`
- **renderHints**: Define products, services, and pricing. Links to `POST /api/platform-products`
- **policyGate**: `requireAuth`, `role === 'superadmin'`

### step_3_brand_identity
- **viewId**: `step_3_brand_identity`
- **category**: `form`
- **requiredContextKeys**: `siteConfigId`, `adminSession`, `onboardingSessionId`
- **allowedActions**: `selectBrandTheme`, `setSlogan`, `setBigClaim`, `setGuarantee`, `setIdealCustomer`, `setFunnelStrategy`
- **dataContract**: `{ brandTheme: BrandThemeKey, slogan?, bigClaim?, guarantee?, irresistableOffer?, idealCustomerProfile?, funnelStrategy? }`
- **renderHints**: Preset theme tiles (from `BRAND_THEMES` in `brand.ts`). No free-form color pickers.
- **policyGate**: `requireAuth`, `role === 'superadmin'`

### step_4_menu_tree
- **viewId**: `step_4_menu_tree`
- **category**: `controller`
- **requiredContextKeys**: `siteConfigId`, `adminSession`, `onboardingSessionId`
- **allowedActions**: `defineVoiceConciergeRole`, `defineAssistantRoles`, `defineSalesAgentRoles`, `buildMenuTree`, `setDrillDownActions`
- **dataContract**: `{ voiceConcierge: AgentRoleSpec, assistants: AgentRoleSpec[], salesAgents: AgentRoleSpec[], menuTree: MenuNode[] }`
- **renderHints**: AI Biz Bot guides owner through role definitions and menu drill-down. Output is the map for the AI Bot Builder (Step 5).
- **policyGate**: `requireAuth`, `role === 'superadmin'`

### step_5_agent_builder
- **viewId**: `step_5_agent_builder`
- **category**: `controller`
- **requiredContextKeys**: `siteConfigId`, `adminSession`, `onboardingSessionId`, `menuTreeData`
- **allowedActions**: `buildAgentProfile`, `setDiscProfile`, `setArchProfile`, `setSystemPrompt`, `runAgentPreflight`, `approveAgentDeployment`
- **dataContract**: `{ agentPlans: AgentBuildPlan[], approvedAgentIds: string[] }`
- **renderHints**: AI Bot Builder reviews Step 4 map, builds agent profiles (DISC, ARCH, system prompt), runs preflight for each, and presents for owner approval before `POST /api/intelligence/provision` is called.
- **policyGate**: `requireAuth`, `role === 'superadmin'`

### sales_funnels_editor (embedded)

- **viewId**: `sales-funnels-view`
- **category**: `inspector`
- **requiredContextKeys**: `siteConfigId`, authenticated owner session
- **allowedActions**: `siteConfig.patchSalesFunnels`, `siteConfig.applyIndustryFunnelTemplate`
- **dataContract**: `{ sales_funnels: SalesFunnelEntry[] }` — optional `conversationWorkflow` per [PHASED_INDUSTRY_FUNNEL_SPEC.md](./PHASED_INDUSTRY_FUNNEL_SPEC.md); client may edit JSON and context key fields; drag-and-drop graph editor is deferred.
- **renderHints**: `SalesFunnelsEditor` in ConciergePanel canvas; Zod-validated PATCH to `/api/site-configs/:id/funnels`.
- **policyGate**: `requireAuth`, business owner or admin

---

## AI Design Studio (governed pipeline)

**Normative spec:** [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md). **SDK manifest:** [`gateway-sdk-manifest.yaml`](../../registry-yaml/gateway-sdk-manifest.yaml).

### design_studio_landing

- **viewId**: `design_studio_landing`
- **category**: `intent_entry` (paired with shell; voice + canvas actions)
- **requiredContextKeys**: `siteConfigId`, `design_handoff` (or equivalent session payload), optional `designProjectId`
- **allowedActions**: `design_studio.learn_more`, `design_studio.new_project`, `start_voice` (shell)
- **dataContract**: `{ handoffReason?, intentSummary?, referringAgentId?, entrySurface? }`
- **renderHints**: Title **AI DESIGN STUDIO**, presenter line, buttons **LEARN MORE** / **NEW PROJECT**; voice copy from prompt fragments only.
- **policyGate**: owner/authenticated session per product decision

### design_studio_learn

- **viewId**: `design_studio_learn`
- **category**: `form` or `inspector`
- **requiredContextKeys**: `siteConfigId`, `designProjectId?`
- **allowedActions**: `design_studio.back_landing`, `design_studio.new_project`
- **dataContract**: `{ processSteps: string[] }`
- **renderHints**: “Getting started” / process steps from spec §8.
- **policyGate**: same as landing

### design_studio_path

- **viewId**: `design_studio_path`
- **category**: `confirmation` or `controller`
- **requiredContextKeys**: `siteConfigId`, `designProjectId`
- **allowedActions**: `design_studio.choose_build_view`, `design_studio.choose_build_app`
- **dataContract**: `{ buildMode: 'view' | 'app' }`
- **renderHints**: Branch **Individual views** vs **Multi-step apps**; both use `design_studio_step` with same 8-phase engine.
- **policyGate**: same as landing

### design_studio_step

- **viewId**: `design_studio_step`
- **category**: `form` or `controller` (phase-dependent)
- **requiredContextKeys**: `siteConfigId`, `designProjectId`, `buildMode`, `stepIndex`, `stepKey`
- **allowedActions**: `design_studio.advance_phase`, `design_studio.approve_plan`, `design_studio.commit_theme`, `design_studio.map_data_source`, `design_studio.map_data_destination`, `design_studio.select_components`, `design_studio.run_test`, `design_studio.save_artifact`, `design_studio.configure_knowledge`, `design_studio.configure_behavior`, `design_studio.publish` (see [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) and [`actions.yaml`](../../registry-yaml/actions.yaml)).
- **dataContract**: Per [`AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`](./AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md) §8 phase outputs.
- **renderHints**: Single parameterized step shell; talk → canvas updates via governed events.
- **policyGate**: `requireAuth`, intake / verification when PII
