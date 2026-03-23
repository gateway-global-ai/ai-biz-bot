# Runtime Control Governance

## Purpose
Define the constitutional rules for any AI-driven mutation of runtime or infrastructure-adjacent state inside the Sovereign AI OS.

## Core principle
Runtime control is not ordinary application state. It is a higher-risk operating layer and must be governed separately from UI or behavior mutation.

## Ring 0 boundary distinction

### App State
Examples:
- Safe Mode profile
- behavior sliders
- staged support ticket text
- UI focus/highlight state

### Runtime State
Examples:
- bridge mode
- chaos latency
- chaos drop rate
- bridge endpoint selection
- future transport/runtime infrastructure controls

## Runtime mutation rule
- Any mutation of runtime state must pass through:
  - Action Registry
  - policy gate
  - SharedCanvasProvider orchestration layer
  - underlying subsystem adapter call

The AI must never touch the subsystem directly.

## Granular permission requirement
- A blanket `runtime.mutate` permission is illegal.
- Runtime mutation must be split into narrow capabilities, for example:
  - `runtime.chaos.mutate`
  - future: `runtime.endpoint.mutate`
  - future: `runtime.bridge_mode.mutate`

The principle is least privilege at infrastructure depth.

## Infrastructure "crime scene" rule
- If the AI mutates runtime controls, the user must be routed to the relevant runtime view.
- The user must be able to see the exact infrastructure-facing control that changed.

Example:
- chaos settings mutate -> route to `system.telemetry` and highlight the chaos controls

No hidden infrastructure mutation is permitted.

## Telemetry audit failsafe
- Runtime mutations are high-priority governance events.
- The Flight Recorder must capture:
  - the exact runtime control changed
  - previous value
  - new value
  - route/view context when the change occurred

If the infrastructure delta cannot be reconstructed from the audit log, the mutation is not legally governed.

## Governance rules
- No AI-driven runtime mutation may bypass the subsystem adapter boundary.
- No runtime mutation may be implied from ordinary UI or behavior permissions.
- No runtime mutation may occur without visible user-facing context.
