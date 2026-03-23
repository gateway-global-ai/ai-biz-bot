# View Registry

## Purpose
Define the governed UI states the OS may render.

**Related:** [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md) (canvas-safe components and `@/ui` contract).

## View categories
- `menu`
- `form`
- `controller`
- `inspector`
- `confirmation`
- `refusal`
- `ptt_first`

## View fields
Each view definition should declare:
- `viewId`
- `category`
- `requiredContextKeys`
- `allowedActions`
- `dataContract`
- `renderHints`
- `policyGate`

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
