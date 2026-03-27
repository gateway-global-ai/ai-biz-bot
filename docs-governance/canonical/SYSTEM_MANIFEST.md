---
status: canonical
truth_domain: governance
enforced_by: ai-os-control-plane.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-26
---
# Gateway AI OS System Manifest

Version: v1.1
Status: Canonical
Runtime Target: Gateway OS Core

## Purpose
This manifest is the single point of entry for architecture guidance, coding-agent rules, review workflow, and governed runtime contracts for the AI OS branch.

---

## Canonical reading order
1. `AI_OS_CONTROL_PLANE_v1.md`
2. `SCHEMA_ANCHOR_REGISTRY.md`
3. `CONTEXT_KEYS.md`
4. `APP_SHELL_CONTRACT.md`
5. `AGENT_POLICY_REGISTRY.md` (when created)
6. `LOGICAL_ROUTE_REGISTRY.md` (when created)
7. `VIEW_REGISTRY.md` (when created)
8. `ACTION_REGISTRY.md` (when created)
9. `FLIGHT_RECORDER_GOVERNANCE.md` (when working on observability, sync, or auditability)
10. `EXECUTION_PLANE_BRIDGE_GOVERNANCE.md` (when wiring shell/runtime sync or future tool callbacks)
11. `INBOUND_ACTION_GOVERNANCE.md` (when implementing or reviewing reverse-direction AI actions)
12. `RESILIENCE_AND_CHAOS_GOVERNANCE.md` (when testing shell reliability, bridge behavior, or timeout handling)
13. `LIVE_EXECUTION_PLANE_SPEC.md` (before writing production Gemini WebSocket/audio bridge code)
14. `UI_ELEMENT_REGISTRY.md` (when implementing or reviewing AI-driven UI focus/highlight behavior)
15. `LIVE_ADAPTER_TESTING.md` (when validating provider-message parsing, injection harness behavior, or hallucination failsafes)
16. `GOVERNED_STATE_MUTATION.md` (when implementing or reviewing any AI-driven state change)
17. `RUNTIME_CONTROL_GOVERNANCE.md` (when implementing or reviewing any AI-driven runtime or infrastructure-facing mutation)
18. `COMMUNICATION_GOVERNANCE_SCORECARD.md` (when measuring or improving CGR, ARCH validation, disclosure, or communication-plane maturity)
19. `AGENT_SWARM_DEPLOYMENT_RUNBOOK.md` (Layer 1: provision industry agent teams per business — read before Communication Plane when onboarding operators)
20. `COMMUNICATION_PLANE_CONTRACT.md` (Layer 2: CGR, ARCH text validation, disclosure, Sentinel vs ARCH naming, voice boundary)
21. `PROMPT_SHAPE_RESEARCH_ANCHOR.md` (research digest and claim-to-code map; full citations in `user_uploads/prompt_shape_behavior.md`)
22. `ENTERPRISE_MATURITY_EXTENSIONS.md` (optional strategic themes for regulated/scale scenarios — **reference only**; does not override contracts or describe shipped features)
23. `PPP_ENGAGEMENT_SKILL.md` and `PPP_ENTERPRISE_AUDIT_BACKLOG.md` (Purpose–Plan–Pressure compiler skill + optional enterprise hardening backlog)
24. `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md` (Design Studio pipeline, Chad agent, Shadcn MCP discovery, SDK manifest — before implementing design-studio views or `gateway-sdk-manifest.yaml`)
25. `LOCAL_AGENT_PLANE.md` (before implementing or modifying any agent with `aiModelProvider='local'`, local agent routes, or the RAG knowledge context service)
26. `CANVAS_CONTROL_SYSCALL_V1.md` (before implementing any canvas mutation, directive, or syscall path — the Canvas Control syscall layer is a protected subsystem)
27. `SHARED_CANVAS_V1.md` (before implementing view components, CanvasRuntimeRenderer, canvasViewRegistry, or dispatchCanvasAction)
28. `VOICE_PHASE_5D_BRIDGE.md` (before touching PTT turn orchestration, VoiceTurnOrchestrator, or GeminiStreamingClient setup payload)

---

## Core principle

The model must never decide what exists. It may only navigate what the OS has already declared valid.

**All user-visible behavior must originate from a validated directive resolved by the control plane.**

---

## Control plane definition

The AI OS Control Plane is the sole authority for:

- `SiteRuntimeContext` resolution
- Skill entitlement enforcement
- Canvas Control syscalls
- Action validation and execution
- Prompt compilation inputs (not outputs)
- Voice turn orchestration boundaries

No UI, model, or tool path may bypass the control plane.

All runtime mutations must pass through control plane validation.

---

## Directive enforcement rule

All user-visible state mutations must be expressed as a validated directive.

A directive must be:
- versioned
- conforming to a registered schema
- passing policy validation
- auditable

No component may mutate UI, state, or execution flow outside of a directive.

Directives are the only valid mutation mechanism for:
- canvas state
- runtime state
- action execution

This rule locks in the Canvas Control syscall layer. `setPinnedCanvas(msg.metadata)` and equivalent patterns are permanently forbidden in governed mode.

---

## Site runtime authority rule

`siteConfigId` must be resolved into a normalized `SiteRuntimeContext` before use.

All downstream systems must consume `SiteRuntimeContext`, not raw configuration data.

No subsystem may:
- independently query `site_configs`
- reinterpret plan, entitlement, or workspace state
- derive skill availability outside the resolver

The resolver is the single source of truth for:
- identity
- business data
- AI configuration
- entitlements

One resolver call produces one normalized object. That object flows to all consumers — router, validator, prompt compiler, directive builder, speech planner.

---

## Execution vs control plane rule

The control plane decides:
- what is allowed
- what should happen

The execution plane performs:
- model inference
- tool execution
- external API calls

The execution plane must never:
- determine UI state
- bypass policy checks
- introduce new capabilities

All execution outputs must be validated by the control plane before becoming system truth.

Gemini is speech-generation and conversational-grounding only. It is not the authority for canvas state, skill gating, or UI dispatch.

---

## Speech grounding rule

The model may only describe system state that has been validated and committed.

The model must not:
- invent UI elements
- reference unrendered content
- imply actions that are not available

All spoken responses must be grounded in:
- current canvas state
- allowed actions
- validated directives

If speech refers to the canvas, the canvas must already be rendered and committed as system truth before the model speaks.

---

## No dashboard assumption rule

Persistent navigation, dashboards, and menus are not the primary interface.

Primary interaction is:
1. user intent (voice or input)
2. control plane resolution
3. canvas rendering
4. grounded response

UI must be generated on-demand from intent, not preloaded as a static application structure.

---

## Single mutation path rule

All system mutations must flow through governed pathways.

Forbidden:
- direct UI mutation from model output
- direct state mutation from components
- ad hoc tool-triggered UI updates
- untyped metadata blobs applied directly to canvas

Allowed:
- validated directives (`CanvasSyscallEnvelope`)
- control plane mediated actions
- registered mutation handlers

---

## Canvas control rules

### Canvas Control Rule
All visible canvas mutations must flow through Canvas Control syscalls. No model output may directly mutate the UI.

### Site Runtime Rule
All site-dependent behavior must derive from resolved `SiteRuntimeContext`, not raw `siteConfigId` or ad hoc DB lookups in downstream consumers.

### Speech Grounding Rule
The LLM may describe only what the Canvas Runtime has already committed as canvas truth. Gemini is speech-generation and conversational-grounding only — not the authority for canvas state, skill gating, or UI dispatch.

### No Dashboard Assumption Rule
Primary task discovery occurs through voice intent and governed canvas rendering, not persistent menus or preloaded dashboards.

### No Prompt-Only Enforcement Rule
If a behavior matters for security, UI truth, or skill legality, it must be enforced by runtime contracts and validators, not prompt text alone. Prompts communicate; contracts enforce.

---

## Kernel boundary rule
Kernel files must remain small and responsibility-bounded.

### Kernel responsibilities
- boot
- shell mounting
- browser route adaptation
- registry loading
- shared state orchestration
- bridge handoff boundaries

### Kernel must never include
- business/domain workflow logic
- ad hoc agent logic
- integration-specific feature logic
- direct provider-specific runtime code in control-plane files
- giant dumping-ground implementations

### Practical constraint
As a governance target, kernel files should generally remain under **500 lines**. Exceeding that threshold is a trigger to review responsibility boundaries and extract subcomponents/helpers before continuing growth.

---

## Protected subsystems
- Gemini live voice runtime hot path
- Prompt compiler and prompt registry
- Route / view / action registries
- Safe Mode policy enforcement
- Environment and secret handling
- Local agent plane (Ollama-backed internal worker runtime — see `local-agent-governance.mdc`)
- Canvas Control syscall layer (`shared/canvasViewContract.ts`, `server/routes/canvasControlRoutes.ts`, `server/services/canvasDirectiveValidator.ts`)
- PTT turn orchestration (`client/src/services/voiceTurnOrchestrator.ts`, `client/src/services/voice/GeminiStreamingClient.ts`)

---

## Implementation workflow
1. Review the plan and governance docs.
2. Run a pre-implementation governance review.
3. Update or add the relevant registry/contracts first.
4. Implement shell/domain/runtime changes only after registry alignment.
5. Validate health, latency, and policy boundaries.

---

## Coding-agent workflow
Before implementing any feature, a coding agent must:
- read this manifest
- read the relevant registry and policy docs
- verify route/view/action additions against the control plane
- avoid direct prompt strings in UI/routes/domains
- avoid execution-plane hot-path contamination
- never apply canvas mutations outside of a validated `CanvasSyscallEnvelope`
- never read `site_configs` directly — always use `resolveSiteRuntime(siteConfigId)`

---

## Current branch intent
This branch is for building the OS governance kernel in an isolated subfolder and document set while using the existing application as the reference implementation.
