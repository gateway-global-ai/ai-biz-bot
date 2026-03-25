---
status: canonical
truth_domain: ui
enforced_by: none
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---
# Client spec tree registry (`gemini_2_5_flash_react_instructions/`)

Version: 1.0  
Status: **Single source of truth map** for Phase 0d — inventory only; does not change runtime behavior.

## Purpose

The directory [`client/src/components/chat/gemini_2_5_flash_react_instructions/`](../client/src/components/chat/gemini_2_5_flash_react_instructions/) contains **implementation notes, UI sketches, and integration specs** written during Clear Voice / multimodal work. It is **not** the authority for **production agent prompts** or **legal contracts**.

| Concern | Authoritative source (SSoT) | This tree |
| --- | --- | --- |
| Agent system prompts & policy | [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md), [`promptCompiler.ts`](../server/services/promptCompiler.ts), `site_configs`, registries | **Reference only** — never treat `*.md` here as prompt source of truth |
| Voice / Gemini Live protocol | Lockdown: `server/geminiVoice.ts`, [`geminiLiveProtocol.ts`](../server/config/geminiLiveProtocol.ts) | Specs describe **intent**; protocol is server-owned |
| Canvas & shell layout | [`APP_SHELL_CONTRACT.md`](./APP_SHELL_CONTRACT.md), [`COMMUNICATION_PLANE_CONTRACT.md`](./COMMUNICATION_PLANE_CONTRACT.md), [`brand.ts`](../client/src/config/brand.ts) | UI notes must match tokens; conflicts → fix code + this registry |
| Governed views / forms | [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md), [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) | Manual input / tour panels map here when productized |
| Tenant PMS / Cloudbeds credentials | [`docs/CLIENT_INTEGRATION_ONBOARDING.md`](../docs/CLIENT_INTEGRATION_ONBOARDING.md), `site_pms_integrations` | **Canonical operator doc** for env vs DB |
| MSA / onboarding legal text | [`.system_design/contracts/MSA_v1.0.0.md`](../.system_design/contracts/MSA_v1.0.0.md), [`.system_design/contracts/MSA_v1.1.0_RESELLER.md`](../.system_design/contracts/MSA_v1.1.0_RESELLER.md), [`.system_design/rules.md`](../.system_design/rules.md) | [`OnboardingGateway.tsx`](../client/src/pages/account/OnboardingGateway.tsx) embeds strings for **scroll-gate UX** — must stay in sync with contract files (see below) |

## Onboarding MSA strings (drift risk)

[`client/src/pages/account/OnboardingGateway.tsx`](../client/src/pages/account/OnboardingGateway.tsx) contains **full MSA and Reseller Addendum** text for Tier-1 scroll-gate UX. **Legal / product owners** should treat **`.system_design/contracts/*.md`** as canonical. When contracts change:

1. Update the markdown contracts first.  
2. Update the embedded `MSA_TEXT` / `MSA_TEXT_RESELLER_ADDENDUM` constants to match (or follow a future extraction task that loads from one source).

The file header must reference **`.system_design/contracts/`** (not a non-existent repo-root `contracts/` path).

## Inventory (all files)

**Legend:** **SSoT** = where truth lives for implementation. **Consumers** = code or docs that cite the file.

| Path (under `gemini_2_5_flash_react_instructions/`) | Topic | SSoT for behavior | Known consumers / notes |
| --- | --- | --- | --- |
| `manual_input_box.md` | Manual correction UI pattern | [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md), [`intakePolicyService.ts`](../server/services/intakePolicyService.ts), tool declarations | Sample React; align styling with `CANVAS` / brand tokens |
| `clear_voice_plan_initial.md` | Historical product plan | [`Reports/clear_voice_plan_initial.md`](../Reports/clear_voice_plan_initial.md) (duplicate narrative) | Archive / planning only |
| `function_declaration.md` | Tool declarations | [`geminiToolDeclarations.ts`](../server/config/geminiToolDeclarations.ts) | Server owns declarations |
| `search_tool_function_declaration.md` | Search tools | `geminiToolDeclarations.ts`, tool handlers | Same |
| `server_side_handler.md` | Handler patterns | `server/services/toolHandler.ts`, modular routes | Same |
| `system_intsructions.md` | Typo filename; system instructions | Compiler + DB agent config | **Do not** copy into client prompts |
| `integration_test_plan.md` | QA plan | Test suites / internal runbooks | Non-normative |
| `react_maps_core_component_structure.md` | Maps UI structure | Voice maps components under `client/src/components/voice/maps/` | Implementation may diverged — code wins |
| `react_animations.md` | Animation notes | Framer / components actually used | Code wins |
| `skeleton_shimmer_for_map.md` | Loading UX | Implemented components | Code wins |
| `key_success_animation.md` | Animation | Same | Same |
| `implement_place_picker.md` | Place picker | Maps feature code | Same |
| `place_change_listener.md` | Listener pattern | Maps integration | Same |
| `maps/flight_visualizer.md` | Map camera animation | [`TourRunner.tsx`](../client/src/components/voice/tour/TourRunner.tsx), [`.cursor/skills/serpapi-data/SKILL.md`](../.cursor/skills/serpapi-data/SKILL.md) | Spec for `animateNavigation` behavior |
| `maps/programmatic_control.md` | Map control | Voice maps code | Code wins |
| `maps/auto_listener_maps_ui_mode.md` | UI mode | Maps code | Code wins |
| `maps/grn_hotels.md` | Hotel / GRN | Domain handlers | Same |
| `tour_guide/tour_runner.md` | Tour runner | `TourRunner.tsx` | Spec comment in file |
| `tour_guide/place_details_panel.md` | Place details | [`PlaceDetailsPanel.tsx`](../client/src/components/voice/maps/PlaceDetailsPanel.tsx) | Spec comment |
| `tour_guide/review_analysis.md` | Review analysis | [`reviewAnalysisService.ts`](../server/services/reviewAnalysisService.ts) | Spec comment |
| `tour_guide/business_intelligence_suite.md` | Dashboard cards | [`DashboardCard.tsx`](../client/src/components/voice/tour/DashboardCard.tsx) | Spec comment |
| `tour_guide/cinematic_touchdown.md` | Cinematic UX | Tour components | Code wins |
| `tour_guide/cinematic_touchdown_template_guide.md` | Templates | Same | Same |
| `tour_guide/auto_badging.md` | Badging | Tour UI | Same |
| `tour_guide/field_masking_api_optimizing.md` | API field masking | Server + client field selection | Same |
| `google_place_ids/obtaining_place_ids.md` | Place ID discovery | [`placeDiscoveryService.ts`](../server/services/placeDiscoveryService.ts) | Spec comment |
| `serpAPI/**` | SerpAPI request/response shapes | SerpAPI official docs + [`serpapi-data/SKILL.md`](../.cursor/skills/serpapi-data/SKILL.md) | Integration reference |
| `nginx_config_dev_stage/nginx_config.md` | Nginx examples | [`DECOUPLED_ENVIRONMENT_STRATEGY.md`](../docs/deployment/DECOUPLED_ENVIRONMENT_STRATEGY.md), ops runbooks | Deployment |
| `api_security/*.md` | Security posture | [`.cursor/rules/api-lockdown.mdc`](../.cursor/rules/api-lockdown.mdc), [`secretManager.ts`](../server/utils/secretManager.ts) | Awareness / audits |
| `system_health/system_health-summary.md` | Health checks | [`healthRoutes.ts`](../server/routes/healthRoutes.ts) | Non-normative |
| `unified_prompt_and_animation.md/*` | UPA / translator / validator | Server validators ([`archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts)), prompt compiler, governance docs | **Strong** — names align with control plane; still not a prompt paste target |

## Maintenance rules

1. **New specs** in this tree should state at the top: *Not a production prompt source — see `docs-governance/CLIENT_SPEC_TREE_REGISTRY.md`.*  
2. **Prompt or policy changes** belong in compiler / `site_configs` / YAML registries — not new ad hoc `*.md` here without registry entry.  
3. **Deleting** files: only after updating **Consumers** (grep) and this table.

## Related

- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)  
- [`FILE_SYSTEM_GOVERNANCE.md`](./FILE_SYSTEM_GOVERNANCE.md)  
- [`docs/CLIENT_INTEGRATION_ONBOARDING.md`](../docs/CLIENT_INTEGRATION_ONBOARDING.md) (tenant integrations)  
- [`COMMUNICATION_PLANE_CONTRACT.md`](./COMMUNICATION_PLANE_CONTRACT.md)
