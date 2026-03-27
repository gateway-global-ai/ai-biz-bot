---
status: canonical
truth_domain: governance
enforced_by: preflight + explicit voice governance task before code changes to lockdown files
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-28
---

# PSTN voice tool parity (Path B) — implementation blueprint

## Gate (peer-reviewed)

**Do not implement until** [`docs/deployment/PHASE_3_VOICE_QA_EXECUTION_SCRIPT.md`](../../docs/deployment/PHASE_3_VOICE_QA_EXECUTION_SCRIPT.md) is run and signed (at minimum **V-B1** + **V-P1**; **V-S1** / **V-J1** when those routes are live).

Path B is **Runtime Trust Parity criterion B** in `GOVERNANCE_EXECUTION_PLAN_V1.md`.

## Authorization vs lockdown

`server/voiceStream.ts` is listed under **Sovereign Voice Pipeline lockdown** (`.cursor/rules/sovereign-voice-lockdown.mdc`). Edits for Path B are **only** in scope when opened as an **explicit voice governance / Runtime Trust Parity task** with QA evidence and a tight diff (no drive-by refactors).

## Objective (minimal)

Native PSTN (`/ws/voice-stream` → Gemini Live) must execute **protected** tools with the **same** binding as browser Live:

- `ToolCallContext`: `trustedCallerId`, `callSid`, `siteConfigId` (from Twilio `start` + session — already on `voiceSessionManager`).
- `handleToolCall()` + `resolveBoundPhoneForGuestTools()` in `toolHandler.ts` — **no PSTN-specific resolver**, no handler forks.

## v1 tool allowlist (only these two)

| Tool | Rationale |
|------|-----------|
| `guest_phone_verification` | Already in binding spec; exercises OTP / phone resolution under PSTN ANI. |
| `pms_lookup_guest_journey` | Same; hospitality guest journey with bound phone. |

Do **not** pull the full `geminiVoice.ts` tool surface into PSTN in v1.

## 1. Tool declarations (setup)

**Source of truth:** `server/config/geminiToolDeclarations.ts` — reuse the **same** `parameters` schemas as Live (no new tool shapes).

**Mechanism:** In `voiceStream.ts` `openGeminiLive`, extend the initial `setup` object sent on `geminiWs` open:

- Add `tools: [{ functionDeclarations: [...] }]` where `functionDeclarations` is exactly the two entries above, mapped like `geminiVoice.ts` (`name`, `description`, `parameters`).

**Protocol note:** Confirm against current Live setup in `geminiVoice.ts` that tool-enabled Native Audio setup remains compatible with `response_modalities: ["AUDIO"]` and any required `tool_config` / generation fields — **mirror Live**, do not invent a second setup shape. If Live uses additional setup keys for tools, copy that subset only.

## 2. Context hydration (memory)

**Already available** at Twilio `start` (before `openGeminiLive`):

- `trustedCallerId` ← `customParameters.callerId`
- `callSid` ← `message.start.callSid`
- `siteConfigId` ← `customParameters.siteConfigId`
- Session row updated via `voiceSessionManager.updateSession(callSid, { trustedCallerId, … })`

**On each `functionCall`:** build

```ts
const toolCallContext = {
  siteConfigId: siteConfigId ?? undefined,
  trustedCallerId: trustedCallerId ?? undefined,
  callSid: callSid ?? undefined,
};
```

(same shape as `geminiVoice.ts` lines 506–513).

## 3. Execution and binding

**Intercept point:** `geminiWs.on("message", …)` in `voiceStream.ts`, alongside existing handling of `setupComplete` and audio parts.

- Parse `serverContent.modelTurn.parts` for `part.functionCall`.
- **Mirror `geminiVoice.ts`:** optional `siteConfigId` injection for site-anchored tools **only** if those tools are later allowlisted — for v1 allowlist, **only** the two protected tools; neither is in `SITE_ANCHORED_TOOLS` as defined in `geminiVoice.ts`, so **no copy** of that interceptor is required unless the allowlist expands.
- `await handleToolCall(functionCall, toolCallContext)` with the same **10s timeout / `Promise.race`** pattern as `geminiVoice.ts` to avoid stuck `toolCallPending`.
- **No** client WebSocket to forward tool metadata (PSTN has no browser); skip `clientWs.send` tool_result branches.

## 4. Response injection (duplex audio)

**Success / error:** Send the same JSON shape Live uses:

```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [{ "functionResponse": { "name": "<tool>", "response": { "result": … } } }]
    }
  }
}
```

(error path: `response: { error: "<message>" }`).

**Audio gating (critical):** Introduce `toolCallPending` (or equivalent) and **while true**:

- Do **not** forward Twilio `media` to Gemini (`realtime_input` audio).
- Do **not** send spurious `realtime_input` that could confuse turn-taking (match `geminiVoice.ts` tool gate semantics).

After `functionResponse` is sent and `handleToolCall` completes, clear the flag and resume audio relay.

**PTT:** When `ptt === "1"`, preserve existing DTMF mic gating; during `toolCallPending`, treat as closed for upstream audio if that matches Live semantics (document choice in PR).

## 5. Success criteria (pre-merge)

- [ ] PSTN call can complete `guest_phone_verification` and/or `pms_lookup_guest_journey` when model invokes them.
- [ ] With `trustedCallerId` present, model-supplied phone is **not** authoritative — mismatches logged per `guestToolPhoneBinding.ts`.
- [ ] `npm run test:guest-tool-phone-binding` still passes; add **no** PSTN-specific binding tests that duplicate resolver logic (optional: integration smoke only).
- [ ] No change to μ-law / resample rates, `/ws/voice-stream` path, or Twilio Media Stream framing.
- [ ] Re-run **V-P1** (and jail/sovereign rows if applicable) from the Phase 3 QA script after implementation.

## 6. Explicit non-goals (v1)

- Alerts normalization, Debugger policy, DB persistence for tool results.
- Full tool parity with `geminiVoice.ts` (maps, canvas, MCP, etc.).
- Changes to `geminiToolDeclarations.ts` schemas except re-use (lockdown — avoid unless necessary).
- Sovereign `/ws/twilio-sovereign` tool plane (separate task per execution plan).

## Related

- `SESSION_IDENTITY_BINDING_SPEC.md` — binding doctrine and coverage matrix.
- `GOVERNANCE_EXECUTION_PLAN_V1.md` — Runtime Trust Parity A → 10a → B.
- `server/geminiVoice.ts` — reference implementation for tool loop + timeout + `functionResponse` envelope.
- `server/services/toolHandler.ts` — `handleToolCall` + protected tool cases.
- `server/voiceStream.ts` — PSTN bridge (edit only under voice governance task).
