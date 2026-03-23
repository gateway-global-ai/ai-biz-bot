# Execution Plane Boundary Spec

## Purpose
Protect the Gemini Live voice runtime as a latency-sensitive execution plane.

## Components
- audio IO
- session manager
- interruption handling
- tool dispatcher / typed action emitter
- observability hooks

## Allowed responsibilities
- stream audio to and from Gemini
- maintain bidirectional session state
- detect and handle interruptions
- dispatch typed action requests outward
- emit runtime metrics (observability must be **async** or **enqueue-only** — no synchronous DB on the hot path; see [`VOICE_SESSION_TRANSPARENCY.md`](VOICE_SESSION_TRANSPARENCY.md))
- expose bridge implementations behind governed execution-plane interfaces

## Forbidden responsibilities
- heavy DB queries on hot path
- prompt compilation on hot path
- direct domain workflow logic
- direct UI rendering
- synchronous file IO on audio/session path
- direct shell or control-plane state ownership

## Performance rules
- no synchronous DB calls in the hot path
- no broad schema traversal during active audio handling
- no direct domain imports from the runtime engine
- observability must remain low-overhead by default

## Failure handling
- degraded readiness must surface through governed shell states
- session teardown must be graceful
- action dispatch failures must not corrupt audio/session state

## Related contract
- `EXECUTION_PLANE_BRIDGE_GOVERNANCE.md` defines how the control plane is allowed to hand payloads into this execution layer.
