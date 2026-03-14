# Gateway AI OS System Manifest

Version: v1.0
Status: Alpha
Runtime Target: Gateway OS Core

## Purpose
This manifest is the single point of entry for architecture guidance, coding-agent rules, review workflow, and governed runtime contracts for the AI OS branch.

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

## Core principle
The model must never decide what exists. It may only navigate what the OS has already declared valid.

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

## Protected subsystems
- Gemini live voice runtime hot path
- Prompt compiler and prompt registry
- Route / view / action registries
- Safe Mode policy enforcement
- Environment and secret handling

## Implementation workflow
1. Review the plan and governance docs.
2. Run a pre-implementation governance review.
3. Update or add the relevant registry/contracts first.
4. Implement shell/domain/runtime changes only after registry alignment.
5. Validate health, latency, and policy boundaries.

## Coding-agent workflow
Before implementing any feature, a coding agent must:
- read this manifest
- read the relevant registry and policy docs
- verify route/view/action additions against the control plane
- avoid direct prompt strings in UI/routes/domains
- avoid execution-plane hot-path contamination

## Current branch intent
This branch is for building the OS governance kernel in an isolated subfolder and document set while using the existing application as the reference implementation.
