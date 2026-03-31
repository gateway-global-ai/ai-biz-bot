---
status: canonical
truth_domain: runtime
enforced_by: sovereign-voice-lockdown.mdc (transport edits), execution-plane-boundary.mdc
backed_by:
  schema: true
  service: true
  route: false
last_verified: 2026-03-28
---

# Voice execution architecture v1

## Purpose

Define **normative layers** for all voice and voice-adjacent sessions so governance, audits, and demos do not assume a single transport or a single model vendor. This doc is **not** a substitute for voice lockdown lists; it explains **how authority is split** so mutations stay governable.

## Related

- [`PTT_SESSION_NODE_V1.md`](./PTT_SESSION_NODE_V1.md) — live Concierge shell as a **session node**; site config as attachment, not chassis.
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) — latency and forbidden work on the hot path.
- [`EXECUTION_MUTATION_GATE_SPEC_V1.md`](./EXECUTION_MUTATION_GATE_SPEC_V1.md) — **authoritative** rule: where mutations may execute and how they must be gated.
- [`CONTROL_PLANE_UNIFICATION_PLAN_V1.md`](./CONTROL_PLANE_UNIFICATION_PLAN_V1.md) — contract engine and registry convergence.
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](./INTEGRATION_GRAPH_DISCIPLINE.md) — vendor capabilities vs model-visible tools.

## Three layers (normative)

| Layer | Responsibility | Examples (repo) |
|-------|----------------|------------------|
| **1. Transport** | Media, signaling, session identity on the wire. **Does not** choose business capabilities or persist product state except via defined orchestration APIs. | Browser: WebSocket `/ws/gemini-live` (`server/geminiVoice.ts`), worklet (`client/public/clear-voice-processor.js`). PSTN: Twilio media stream (`server/voiceStream.ts`), `callSid` / `From`. |
| **2. Orchestration** | Turn lifecycle, intent resolution, **admission**, canvas syscalls, dispatch policy, tenancy, audit correlation. **Authoritative** for what may run next. | `client/src/services/voiceTurnOrchestrator.ts`, `POST /api/canvas-control` (`server/routes/canvasControlRoutes.ts`), `server/services/canvasDirectiveValidator.ts`, `server/services/canvasIntentRouter.ts`, `server/services/executionContractEngine.ts` (admission kinds), `server/services/executionMutationGate.ts` (mutation envelope + dispatch). |
| **3. Model (inference)** | Propose structured outputs, transcriptions, and **tool calls**. **Proposals only** — execution of side effects goes through orchestration gates. | Gemini Live (browser), STT/TTS helpers on PSTN (`server/voiceGemini.ts` where applicable), future providers. |

## Single mutation graph (many entry points)

Multiple transports and models are **allowed**. There must still be **one governed mutation graph** for side effects:

```text
Transport (PSTN / Browser Live / HTTP chat)
        ↓
Model — proposals only (tool JSON, text, structured intent)
        ↓
Orchestration — decide + validate + admit
        ↓
Execution contracts + capability / tool dispatch (registered path)
        ↓
Canvas syscall / DB / external APIs
        ↓
Response + audit
```

**Clarification:** On the browser Live path today, Gemini emits `tool_call`; the server runs `handleToolCall` inside `server/geminiVoice.ts`. That is still **model → proposal** if **every** tool implementation respects the mutation gate and integration graph (see mutation gate spec). The target is **not** to remove tools in one destructive change; it is to ensure **no tool bypasses** the gate and registries as they harden.

## Demo path constraints (hospitality vertical)

Binding for the **closed-loop demo**:

1. **Pinned canvas** — syscall-driven payloads only (`shared/canvasViewContract.ts` + `canvasDirectiveValidator`); legacy tool-metadata canvas to pinned UI is out of scope for the demo narrative.
2. **PMS / Cloudbeds** — only through declared integration capabilities and governed server handlers, not ad hoc HTTP from transport handlers.
3. **Same execution rule for PSTN and browser** — different codecs; **same** admission and capability rules at the moment of execution.

## Non-goals (v1)

- Unifying audio codecs or collapsing all sessions onto one WebSocket.
- Replacing Gemini Live as the browser inference engine without a governed voice program.
- Defining hot mid-session agent swap (product decision; not in this doc).

## Revision

When transport or orchestration files in voice lockdown lists change for governance reasons, update **last_verified** and ensure this doc still matches the enforced file list in `.cursor/rules/sovereign-voice-lockdown.mdc`.
