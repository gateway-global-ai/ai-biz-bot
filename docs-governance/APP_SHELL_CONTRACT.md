# App Shell Contract

## Purpose
Define the persistent operating surface for the OS. The shell owns layout, mode switching, context display, and conversational navigation. It does not own business logic.

## `App.tsx` rule
`App.tsx` may bootstrap the OS. It may not define the OS.

Allowed in `App.tsx`:
- providers
- router mount
- shell mount
- global bootstrapping

Forbidden in `App.tsx`:
- business logic
- prompt logic
- giant route trees
- deployment-specific branching
- domain orchestration

## Persistent shell elements
- `ContextBar`
- breadcrumb stack
- `ConversationalNavController`
- `ChatOSContainer`
- primary canvas
- persistent PTT surface

## Shell modes
- `menu`
- `view`
- `confirmation`
- `refusal`
- `ptt_first`

## Mode transitions
- `menu -> view`
- `view -> confirmation`
- `confirmation -> execution`
- `execution -> result`
- `result -> menu`
- `menu -> refusal`
- `view -> refusal`

## Rules
- Shell elements remain mounted during logical routing.
- Browser URL changes do not unmount the shell.
- The conversational controller may not invent routes; it must use resolver outputs.
- The chat container renders shared UI state through governed view contracts.
