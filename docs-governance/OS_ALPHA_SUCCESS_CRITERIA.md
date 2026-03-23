# OS Alpha Success Criteria

## Purpose
Define the measurable proof point for the first governed OS runtime.

## OS Alpha scenario
1. Server loads successfully
2. Governance registries load successfully
3. Readiness checks pass
4. The shell boots into the primary OS surface
5. A single QR entry or CTA opens the ClearVoice OS conversation
6. The user enters a governed PTT-first experience
7. The native OS agent routes the user through valid menu/view flows

## Required success conditions
- the shell boots without relying on dashboard-first navigation
- the QR/entry point opens a working PTT/chat relationship
- the Menu Resolver drives valid options
- Safe Mode prevents invalid or out-of-scope actions
- the native OS agent does not invent hidden routes or tools
- at least one core workflow completes through governed voice-first interaction
- health and latency surfaces report meaningful runtime metrics

## Failure signals
- shell loads but route/view state is undefined
- voice connects but valid action routing is not bounded
- execution-plane latency visibly degrades the interaction
- invalid actions are attempted outside declared policy
- runtime readiness is unclear to installer/admin
