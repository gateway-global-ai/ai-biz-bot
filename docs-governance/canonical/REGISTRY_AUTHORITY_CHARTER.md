---
status: canonical
truth_domain: governance
enforced_by: preflight-review-required.mdc, view-and-action-registry.mdc, logical-route-registry.mdc
backed_by:
  schema: partial
  service: partial
  route: partial
last_verified: 2026-03-28
---

# Registry Authority Charter

## Purpose

End duplicate authority between YAML, TypeScript, React, and prose. Every registry-backed concept has **one canonical definition**; everything else **derives** or **adapts**.

This charter is the **doctrine lock** prerequisite for structural work (see `GOVERNANCE_EXECUTION_PLAN_V1.md`).

## Canonical sources (authoritative)

| Concern | Canonical source | Notes |
|--------|-------------------|--------|
| **Canvas view IDs & syscall envelopes** | `shared/canvasViewContract.ts` | Schema authority for `CanvasViewId`, render payloads, `SpeechGroundingContext`. |
| **Canvas HTTP API** | `server/routes/canvasControlRoutes.ts` + `server/services/canvasDirectiveValidator.ts` | Runtime enforcement; `REGISTERED_VIEW_IDS` must **not** diverge from `canvasViewContract` (derive or codegen). |
| **Logical route IDs** | `docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md` | Declared `routeId` vocabulary; browser paths are **adapters**, not architecture. |
| **Declared OS / shell views (catalog)** | `registry-yaml/views.yaml` | Catalog + lazy import keys; must be **wired** to runtime loaders — catalog without enforcement is documentation only. |
| **Gemini tool names & schemas (customer voice)** | `server/config/geminiToolDeclarations.ts` | Model-facing tool registry; handlers bound in voice/tool pipeline. |
| **Skill dispatch IDs (HTTP)** | `registry-yaml/skill-dispatch-registry.yaml` **and** `server/routes/skillDispatchRoutes.ts` | **Both must match** for implemented skills; YAML aspirational rows require explicit `implemented: false` or removal. |
| **Schema anchors** | `docs-governance/canonical/SCHEMA_ANCHOR_REGISTRY.md` + `shared/schema.ts` | New entities require deliberate anchor updates. |
| **Agent policy & safe mode** | `docs-governance/canonical/AGENT_POLICY_REGISTRY.md`, `SAFE_MODE_CONTRACT.md` | Jurisdiction and refusal behavior. |
| **Local agent jurisdiction** | `agents.structuredControls` (JSONB) + `.cursor/rules/local-agent-governance.mdc` | Plane separation and forbidden paths. |
| **Agent capability rows (v0)** | `registry-yaml/agent-capabilities/*.yaml` + `AGENT_CAPABILITY_SPEC_V0.md` | Declarative capabilities/boundaries for internal workers; DB controls remain derived until synced. |
| **Customer-facing deployed agent** | `AGENT_DEPLOYMENT_CONTRACT_V1.md` | **Deploy posture:** identity, knowledge authority, tools, fallbacks, proficiency, enforcement — what “deployed” means; validators/CI implement against this doc (subordinate to registry SOT above). |
| **Twilio reliability plane (architecture)** | `TWILIO_RELIABILITY_ARCHITECTURE.md` | System reliability control plane: capture → normalize → policy → fallback (peer-reviewed). |
| **Twilio error normalization** | `TWILIO_ERROR_NORMALIZATION_SPEC.md` + `registry-yaml/twilio-platform-failure-classes.v0.yaml` | Platform failure `class_id` vocabulary; Twilio `error_code` mapping is extended here / in derived YAML as implementation lands. |
| **Twilio fallback policy** | `TWILIO_FALLBACK_POLICY_REGISTRY.md` | Policy dimensions and fallback action vocabulary; future machine-readable policy rows must not diverge. |
| **Session identity binding (protected tools)** | `SESSION_IDENTITY_BINDING_SPEC.md` + `server/services/guestToolPhoneBinding.ts` | Trusted signaling identity overrides model-supplied identity; extend registry in spec — **no ad hoc per-tool binding**. |
| **Integration capability graph (normative)** | `INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md` + `INTEGRATION_CANONICAL_OBJECT_MODEL.md` + `ADAPTER_GENERATION_POLICY.md` | Endpoints, anchors, capabilities, adapters; **subordinate** to `geminiToolDeclarations.ts` for tool names. |
| **Integration discipline (non-bypass)** | `INTEGRATION_GRAPH_DISCIPLINE.md` | No runtime graph shortcuts; vendor docs are inputs only; sets aligned with modes via `requires_modes_superset` (tools only) and `exposure_type` / `requires_tool_resolution` for empty tool sets. |
| **Integration registries (machine-readable)** | `registry-yaml/integration-entities/`, `integration-endpoints/`, `integration-capabilities/`, `integration-adapters/`, `integration-capability-sets.yaml` | Validated by `scripts/validate-integration-registry.ts`; must not introduce tool names absent from `TOOL_DECLARATIONS`. |
| **Integration auth & credential governance** | `INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md` + `registry-yaml/integration-auth-profiles/*` + `shared/integrationExecution.ts` | Runtime: `server/services/integrationCredentialBroker.ts` (`getExecutionContext`); storage: `site_pms_integrations` (`auth_lane`, `scopes_granted`, `api_version_lane`, `install_posture`, …). Agents MUST NOT hold vendor secrets. |
| **Hospitality swarm schematic (role → mode → capability → tools)** | `HOSPITALITY_SWARM_SCHEMATIC_V1.md` + `registry-yaml/swarm-schematics/*` (incl. `hospitality_proficiency_probes.v1.yaml`) | Validated by `scripts/validate-swarm-schematic.ts` (`npm run validate:swarm-schematic`); provisioning writes `agents.structured_controls.swarm_role_contract`; runtime prompt/gating consumption is a later phase. |
| **Agent classification & swarm limits** | `AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md` + `registry-yaml/agent-classification-policy/*` + `registry-yaml/swarm-schematics-registry/manifest.v1.yaml` + `registry-yaml/agent-templates/*` | Validated by `scripts/validate-agent-classification.ts` (`npm run validate:agent-classification`); DB: `agent_templates`, `swarm_schematics`, `swarm_schematic_members`, extended `agents` columns. |
| **Classification governance (lifecycle & promotion)** | `CLASSIFICATION_GOVERNANCE_SPEC_V1.md` | How classifications become **approved** platform primitives: acceptance criteria, vertical proof, versioning—not ad hoc personas. Complements `AGENT_BEHAVIOR_SPEC_V1.md` (cognition defaults at template layer). |
| **VPS / Docker distribution (pre-launch)** | `SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md` | 1-click Compose topology, TLS edge, RAM SKUs, Hostinger-style rollout phases; env prompts ↔ `SOVEREIGN_ENV_MANIFEST.md`. |

## Derived / generated (non-authoritative alone)

| Artifact | Derived from |
|----------|----------------|
| `REGISTERED_VIEW_IDS` in validator | `CanvasViewId` union / contract (single generator preferred). |
| Client `ToolRouter` / menu maps | Tool declarations + views catalog + action registry rows (once bound). |
| `App.tsx` / `AdminShell` routes | Logical route registry rows (adapters). |
| Compiled system prompts | `promptCompiler` / `compileFullSystemPrompt` **outputs** — not free-text source of truth. |

## Must never duplicate

- **Parallel route tables** without a registry row (e.g. `App.tsx`-only paths with no `routeId`).
- **Second tool registries** in UI or prompts that are not validated against `TOOL_DECLARATIONS`.
- **Skill IDs** in YAML that are not implemented in `skillDispatchRoutes` (or explicitly marked unimplemented).
- **Canvas view lists** that differ between contract, validator, and client.
- **Integration capability `tool_name` values** that are not keys in `TOOL_DECLARATIONS` (or capability sets whose `resolved_tool_names` diverge from member capabilities).
- **Vendor OpenAPI/Postman (or ingest IR)** treated as runtime or registry authority instead of `registry-yaml/integration-*` rows after promotion.
- **Customer-facing vendor HTTP** wired without a declared capability + `tool_name` (or explicit internal-only manifest) per `INTEGRATION_GRAPH_DISCIPLINE.md`.
- **Capability sets** with model-facing tools missing valid `requires_modes_superset`, or declarative sets with empty `resolved_tool_names` missing `exposure_type: non_model_facing` / `requires_tool_resolution: false`, or modes listed in superset that do not allow every resolved tool.
- **Parallel hospitality swarm role definitions** in prose, industry templates, or ad hoc provisioning that contradict `HOSPITALITY_SWARM_SCHEMATIC_V1.md` / `registry-yaml/swarm-schematics/*` without an explicit spec + YAML + validator change.

## Prompts vs capabilities

- **Customer-facing** behavior may use natural language in compiled prompts; that text is a **build artifact** from DB + compiler + policy fragments.
- **Governed behavior** (what is allowed, what routes, what views render) must be **registry- and validator-backed**, not prompt-inferred.

## Lockdown exceptions

Voice proxy (`server/geminiVoice.ts`), Twilio/SMS lockdown files, and sovereign chat layout files may only change under **explicit governed tasks**, even when fixing contract gaps (e.g. forwarding client messages). Changes must preserve protocol constants and sample rates per `.cursor/rules/sovereign-voice-lockdown.mdc`.

## Related

- `GOVERNANCE_EXECUTION_PLAN_V1.md` — phased execution order (Phase 10 = Twilio reliability plane).
- `AGENT_DEPLOYMENT_CONTRACT_V1.md` — customer-facing **deployed** agent contract (knowledge authority + tools + proficiency).
- `AGENT_CAPABILITY_SPEC_V0.md` — agent capability schema (v0).
- `SESSION_IDENTITY_BINDING_SPEC.md` — protected tools + trusted caller binding.
- `SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md` — Phase 11 VPS distribution gate.
- `TWILIO_RELIABILITY_ARCHITECTURE.md` — Twilio reliability / policy subsystem.
- `CURSOR_RULES_INDEX.md` — Tier-2 rule map.
- `INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md`, `INTEGRATION_CANONICAL_OBJECT_MODEL.md`, `ADAPTER_GENERATION_POLICY.md`, `INTEGRATION_RUNTIME_PATTERN.md`, `INTEGRATION_GRAPH_DISCIPLINE.md` — integration intelligence plane.
- `INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md` + `registry-yaml/integration-auth-profiles/*` — integration credential broker + scope/lane enforcement.
- `HOSPITALITY_SWARM_SCHEMATIC_V1.md` + `registry-yaml/swarm-schematics/*` — hospitality swarm schematic (CI: `validate:swarm-schematic`).
- `AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md` + `registry-yaml/agent-classification-policy/*` — actor/stage limits and swarm bounds (CI: `validate:agent-classification`).
