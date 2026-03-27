# Flight Recorder Governance

## Purpose
Define the governance contract for the local OS event log so route changes, governed actions, and Gemini sync payloads are auditable, deterministic, and safe.

## Scope
This spec governs the local OS "black box" / flight recorder implemented in the browser/session layer of OS Core.

It applies to:
- `SYSTEM_LIFECYCLE` events
- `GOVERNANCE_ACTION` events
- `SYNC_PAYLOAD` events
- `ROUTE_CHANGE` events
- `POLICY_BLOCK` events
- `ERROR` events

It does **not** yet define backend archival or long-term compliance retention. That must be implemented later as an asynchronous server-side pipeline.

## Core principle
The OS must be able to prove:
- what changed
- when it changed
- what route/view/mode the user was in
- what payload was prepared for the AI

without allowing the AI to alter or erase that record.

## Standardized event schema

```ts
type OSEventCategory =
  | "SYSTEM_LIFECYCLE"
  | "SYNC_PAYLOAD"
  | "ROUTE_CHANGE"
  | "GOVERNANCE_ACTION"
  | "POLICY_BLOCK"
  | "ERROR";

interface OSEventLogEntry {
  id: string;
  timestamp: string;
  category: OSEventCategory;
  os_state_snapshot: GeminiOsState;
  payload: unknown;
}
```

## Immutability clause
- Once an event is written to the log, it must not be mutated in place.
- The UI may read and display log entries, but must not alter historical entries.
- The execution plane may not read, modify, or delete entries directly.
- A new event must always be appended rather than rewriting a previous event.

## Rolling window rule
- The browser/session flight recorder keeps only a rolling window of the most recent **200 events**.
- This limit exists to protect browser memory and keep the shell responsive.
- Long-term archival, if required later, must be handled asynchronously by backend infrastructure rather than the browser runtime.

## Segregation of duties

### OS shell / control plane
- may write events
- may read events for local debugging and observability
- may display events through the Inspector panel

### Admin / developer
- may read events through the Inspector or future governed observability views
- may clear the local session log for debugging

### Execution plane / Gemini runtime
- may not read the flight recorder directly
- may not modify or clear the flight recorder
- may only receive the already-built sync payload through governed bridges

## Required event categories

### `SYSTEM_LIFECYCLE`
Written when:
- the OS boot sequence starts
- pre-flight checks pass or block the boot
- the live bridge changes connection state
- the engine is intentionally shut down

Purpose:
- prove the system's own heartbeat, not just user or AI actions

### `GOVERNANCE_ACTION`
Written when:
- a governed action completes or fails in the control plane

Purpose:
- show exactly what action the OS executed before any Gemini sync occurs

### `SYNC_PAYLOAD`
Written when:
- the OS builds a debounced Gemini context sync payload from a governed change

Purpose:
- prove what the AI was told and when

### `ROUTE_CHANGE`
Written when:
- the OS emits a lightweight route-navigation sync payload

Purpose:
- prove the active route/view/mode context that the AI was expected to understand

### `ERROR`
Written when:
- sync payload creation fails
- route sync fails
- future governance/event pipeline failures occur

Purpose:
- preserve failure evidence instead of silently swallowing it

### `POLICY_BLOCK`
Written when:
- an inbound or outbound action is denied by policy

Purpose:
- prove that the OS refused an unsafe or unauthorized action instead of silently ignoring or allowing it

## UI contract
- The shell must be able to show a lightweight Inspector panel with the live event stream.
- The Inspector is a debugging/admin surface, not the source of truth.
- The Inspector must display immutable event entries exactly as recorded.

## Privacy and safety rule
- The local flight recorder must avoid storing unnecessary raw secrets.
- It may store structured sync payloads, routes, and bounded control changes.
- Future backend archival must be reviewed separately for compliance, retention, and data minimization requirements.

## Future extension path
Later phases may add:
- signed or hashed event integrity
- async backend archival
- retention policy by tenant
- filtered export for audits
- compliance-agent review of event history
