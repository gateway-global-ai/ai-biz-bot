# Live Execution Plane Spec

## Purpose
Define the production governance contract for the real Gemini Live bridge before any live WebSocket implementation is written.

## Core principle
The live bridge is an execution-plane adapter. It is not part of the control-plane, shell, or UI orchestration layer.

## Audio isolation mandate
- The live bridge will handle raw microphone and speaker streaming concerns.
- Audio buffering, PCM handling, chunking, and Base64 encoding/decoding must not block the React main thread.
- Audio pipeline work must remain tightly scoped inside execution-plane utilities and remain invisible to `SharedCanvasProvider` and other control-plane code.
- The control plane may submit a sync payload, but it may not manage audio transport details.

## System injection protocol
When the control plane sends a `GeminiContextSyncPayload`, the live bridge must translate it into the Gemini Live API’s active-session message format without dropping the voice session.

Current governing expectation:
- use a high-priority `clientContent` injection pattern
- transmit the `system_injection` text from the governed payload
- keep the active session alive
- avoid forcing a full session reset just to acknowledge a new state

The control plane provides:
- structured payload
- `os_state`
- `system_injection`

The live bridge is solely responsible for translating that into the provider-specific wire format.

## Inbound tool schema mapping
- The live Gemini API returns tool or function-call data in Google’s provider schema.
- The live bridge must parse that raw provider response and map it into the governed OS contract:

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

- The control plane must never parse Google-native tool payloads directly.
- The Action Registry must receive only governed `GeminiIncomingAction` objects.

## Reconnection and backoff strategy
WebSocket drops are expected.

The live bridge is solely responsible for:
- catching disconnects
- classifying retryable vs non-retryable conditions
- managing exponential backoff
- attempting session restoration where possible
- surfacing hard failure only when retry budget or timeout policy is exhausted

The control plane is responsible for:
- timeout handling at its own boundary
- shell fallback state
- flight-recorder error logging once ultimate failure is reached

## Separation of concerns
### Live bridge may own
- provider transport details
- WebSocket lifecycle
- audio transport utilities
- provider-specific message translation
- retry/backoff policy execution

### Live bridge may not own
- route/view policy
- UI mutation
- shell state
- prompt authoring policy
- action approval logic

## Governance rules
- No control-plane file may import provider-specific Gemini transport code directly.
- No live bridge implementation may bypass the bridge interface contract.
- No inbound provider tool payload may reach the shell without first being normalized into governed OS action schema.
- No execution-plane retry logic may be reimplemented ad hoc in UI or shell code.
