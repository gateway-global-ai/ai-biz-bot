# Mode Transitions

## Purpose
Define valid shell-state transitions so the OS remains deterministic.

## Supported modes
- `menu`
- `view`
- `confirmation`
- `refusal`
- `ptt_first`
- `execution`
- `result`

## Valid transitions
- `ptt_first -> menu`
- `menu -> view`
- `view -> confirmation`
- `confirmation -> execution`
- `execution -> result`
- `result -> menu`
- `menu -> refusal`
- `view -> refusal`

## Rules
- No undefined direct transition should occur without an explicit shell contract change.
- Refusal is a valid governed mode, not an error state.
- Execution and result states must hand back to a governed menu or view state.
