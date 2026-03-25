# Inbound Action Governance

## Purpose
Define the governed reverse-direction path by which the execution plane may request actions from the OS without directly mutating UI state.

## Core principle
The execution plane may express intent. It may not directly change the shell, routes, or Shared Canvas.

## The Bouncer principle
- The execution plane has zero authority to mutate frontend state directly.
- It may not directly mutate:
  - React state
  - browser history / route adapter state
  - Shared Canvas state
  - view state
- Every incoming AI action must pass through the Action Registry boundary for validation before any UI or route changes occur.

## Policy precedence
- OS governance has absolute authority over the LLM’s intent.
- `agent-policies.yaml` and related runtime policy contracts outrank any incoming model request.
- If a model attempts an action that is:
  - not allowed for its agent policy
  - not allowed in its current Safe Mode profile
  - not declared in the current governed contract set

the default outcome is:
- `POLICY_BLOCK`

not best-effort interpretation.

## Standardized incoming action schema

```ts
interface GeminiIncomingAction {
  timestamp: string;
  target_agent_id: string;
  tool_name: "switch_view";
  args: {
    target_logical_route: string;
  };
}
```

Future inbound tools may expand this schema, but all inbound tool shapes must remain explicitly governed and typed before implementation.

## Current reverse-direction path
1. execution plane receives or simulates incoming action
2. bridge passes action into the OS boundary
3. Action Registry validates:
   - known agent
   - allowed action
   - route existence
   - Safe Mode policy
4. if allowed, the shell may navigate or update
5. if denied, the OS logs `POLICY_BLOCK`

## POLICY_BLOCK audit rule
A blocked action is not a silent failure.

The Flight Recorder must capture:
- `tool_name`
- `target_agent_id`
- attempted `args`
- route/view context at the time of denial
- reason for denial

This creates an auditable record of what the AI attempted to do and why the OS refused it.

## Governance rules
- No inbound tool may bypass the Action Registry.
- No inbound tool may directly own UI mutation.
- No inbound tool may be added without a typed contract and policy review.
- The OS should prefer refusing ungoverned intent over guessing what the model meant.

## Future expansion
Future inbound actions may include:
- additional route navigation intents
- behavior-focus opening
- support view opening
- other governed tool requests

But each must:
- declare a typed input contract
- declare policy expectations
- pass through the same bouncer path
