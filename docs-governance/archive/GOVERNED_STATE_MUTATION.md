# Governed State Mutation

## Purpose
Define the constitutional rules for any AI-driven state mutation in the Sovereign AI OS.

## Core principle
State mutation is the most dangerous power an AI can hold. Therefore, all mutation must be:
- explicit
- policy-gated
- visible
- auditable

Runtime or infrastructure-facing mutation is further governed by `RUNTIME_CONTROL_GOVERNANCE.md`.

## Visibility mandate (No Shadow Mutations)
- The AI is forbidden from mutating system or user state silently in the background.
- If the AI requests a governed mutation, the OS must:
  - route the user to the relevant view when needed
  - visually highlight the affected control or surface
  - apply the mutation in a way the user can witness

The user must be able to see that the state changed.

## Principle of least privilege
- Mutation permissions are never implied.
- Possessing `route.navigate` and `ui.highlight` does not grant mutation authority.
- Mutation requires explicit authorization in policy, for example:
  - `behavior.mutate`

Each mutable capability must be granted independently and deliberately.

## State custodian rule
- Local component state must not be the source of truth for governed AI-mutable values.
- All AI-mutable values must be hoisted into a governed state container such as:
  - `SharedCanvasProvider`
  - or a future dedicated state machine/store

This ensures the Action Registry has a predictable, secure target for mutation.

## Immutable audit failsafe
- Every AI-driven state mutation must generate a `GOVERNANCE_ACTION` event in the Flight Recorder.
- The recorded payload must include:
  - setting modified
  - previous value
  - new value

If the mutation cannot be reproduced from the audit trail, it is not a legal mutation.

## Governance rules
- No AI-driven mutation may bypass the Action Registry.
- No AI-driven mutation may write directly from a UI component into hidden background state.
- No future mutation feature may be added without:
  - an action law
  - a policy gate
  - a visible UI target
  - an audit trail contract
