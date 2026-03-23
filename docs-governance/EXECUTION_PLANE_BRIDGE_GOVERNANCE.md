# Execution Plane Bridge Governance

## Purpose
Define the adapter boundary between the OS Control Plane and the Gemini execution plane so sync payloads, future tool callbacks, and live runtime wiring remain governed and replaceable.

## Core principle
The Control Plane must talk to a bridge interface, never directly to a concrete Gemini implementation.

## Inversion of Control mandate
- Control Plane code (`SharedCanvasProvider`, shell state, UI logic, route/view orchestration) may not directly import or embed a concrete Gemini API implementation.
- Control Plane code may depend only on the bridge contract interface (for example, `IGeminiExecutionBridge`).
- Concrete implementations (`Mock`, `Test`, `Live`) are execution-plane concerns and must be injected or resolved at OS bootstrap/composition boundaries.

## Why this exists
The bridge protects the kernel by separating:

- UI and shell orchestration
- action/result governance
- payload construction
- network/runtime delivery

This lets the OS evolve without hard-coupling React state to a specific transport implementation.

## Acknowledgment-first logging rule
- The Control Plane must await the `Promise<boolean>` returned by the bridge.
- A `SYNC_PAYLOAD` success event may only be written to the Flight Recorder after a positive bridge acknowledgment.
- If the bridge throws, rejects, or times out, the system must write an `ERROR` event instead of assuming success.

This prevents the audit trail from claiming the AI was told something when the execution plane never actually received it.

## Network isolation principle
- The bridge exists to protect the React event loop and shell runtime from transport complexity.
- The Control Plane may build payloads and await bridge acknowledgments.
- The Control Plane may not manage:
  - WebSocket lifecycle
  - audio buffering
  - retries
  - backoff strategy
  - network reconnection behavior

Those concerns belong strictly to the execution plane.

## Current approved bridge shape
Example interface:

```ts
interface IGeminiExecutionBridge {
  sendContextSync(payload: GeminiContextSyncPayload): Promise<boolean>;
}
```

The exact interface may grow over time, but all expansion must preserve the same separation-of-concerns principles.

## Mock / test / live implementations

### Mock
- local latency simulation
- deterministic success/failure for shell testing

### Test
- controlled failure injection
- timeout and resilience testing

### Live
- actual Gemini execution-plane delivery
- still hidden behind the same interface
- must conform to `LIVE_EXECUTION_PLANE_SPEC.md`

## Future incoming tool execution
This bridge will later be used in reverse for incoming AI-driven tool or route requests.

Required future pattern:

1. Gemini emits a tool or route-intent event
2. Execution plane receives it
3. Bridge passes it into the governed OS boundary
4. Action Registry validates it
5. Policy gates decide whether it is allowed
6. Only then may UI or shell state change

This protects the UI from being directly manipulated by unvalidated model output.

## Related contract
- `INBOUND_ACTION_GOVERNANCE.md` defines the governed bouncer path for reverse-direction AI actions before any UI or route mutation is allowed.

## Governance rule
- Any new execution-plane bridge feature must preserve interface-driven composition.
- No direct Gemini transport code may leak into shell, routes, or view logic.
- No feature may bypass bridge acknowledgment if it wants success to appear in the Flight Recorder.
