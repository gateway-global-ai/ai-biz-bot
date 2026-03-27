---
status: canonical
truth_domain: governance
enforced_by: toolHandler + guest tool binding (implementation); preflight for new identity-sensitive tools
backed_by:
  schema: false
  service: true
  route: false
last_verified: 2026-03-28
---

# Session Identity Binding (Protected Tools)

## Purpose

Define **platform policy** for tools that act on **caller or account identity**. This is **control-plane doctrine**, not prompt text.

**Peer-reviewed rule:**

> When the session carries **trusted signaling-derived identity** (e.g. Twilio `From` as `trustedCallerId`), **protected tools MUST bind execution to that identity**. The model MUST NOT override it with a verbally supplied or hallucinated phone number.

This generalizes beyond hospitality:

- **Model intent** → **server trust boundary** → **tool execution on bound identity**

## Non-negotiables

1. **Trusted session identity overrides model identity** for protected tools when bound identity exists.
2. **Mismatched model-supplied identity is ignored** (not merged, not “voted”) and **logged** for audit.
3. **No protected tool** may treat model-supplied phone/ID as authoritative when **bound identity is present**.
4. **Do not reimplement** binding ad hoc per handler — use shared resolvers and this spec; new tools extend the registry (below), not copy-paste logic.

## Reference implementation (v1)

| Artifact | Role |
|----------|------|
| `server/services/guestToolPhoneBinding.ts` | Zod schemas + `resolveBoundPhoneForGuestTools()` for phone-shaped binding |
| `server/services/toolHandler.ts` | Applies binding to `guest_phone_verification` and `pms_lookup_guest_journey` via `ToolCallContext.trustedCallerId` / `callSid` |
| `server/geminiVoice.ts` | Forwards `sessionContext.trustedCallerId` / `callSid` from client into `ToolCallContext` |
| Client `BusinessContext` | Optional `voiceTrustedCallerId` / `voiceBridgeCallSid` for bridged Live sessions |

## Protected tools registry (extend deliberately)

Tools that **must** obey this policy when extended to new surfaces:

| Tool / concern | Status | Notes |
|----------------|--------|--------|
| `guest_phone_verification` | ✅ Bound | Server resolves phone before OTP send/verify |
| `pms_lookup_guest_journey` | ✅ Bound | Server resolves lookup phone |
| Future: payments, account recovery, cross-channel verify | ⏳ | Add row + resolver before shipping |

## Session context contract

| Field | Meaning |
|-------|---------|
| `trustedCallerId` | Twilio `From` (or equivalent) — **authoritative** for PSTN-anchored sessions |
| `callSid` | Correlation for logs and operator trace (not a secret; ties to `call_logs`) |

When absent (typical **browser** Live voice), the resolver requires an explicit **`phone`** argument from the model path, validated with Zod.

## Coverage matrix (honest state)

| Surface | Binding applied? |
|---------|-------------------|
| Browser / bridged `/ws/gemini-live` with `sessionContext.trustedCallerId` | ✅ |
| Browser Live without trusted ANI | ✅ (model `phone` required) |
| Native PSTN `/ws/voice-stream` | ⏳ **Not yet** — Live setup there does not register tools or call `handleToolCall`. **When wired**, reuse the **same** `ToolCallContext` and `resolveBoundPhoneForGuestTools` — **do not fork** logic. |

**Path B blueprint (implement after Phase 3 QA sign-off):** `PSTN_VOICE_TOOL_PARITY_PATH_B.md` — minimal tool loop, two protected tools, mirror `geminiVoice.ts` response envelope and audio gating.

See `GOVERNANCE_EXECUTION_PLAN_V1.md` (telephony session identity) and `TWILIO_RELIABILITY_ARCHITECTURE.md` for related control-plane context.

## Verification

Run:

```bash
npx tsx tests/test-guest-tool-phone-binding.ts
```

(Also: `npm run test:guest-tool-phone-binding`.)

## Related

- `GOVERNANCE_EXECUTION_PLAN_V1.md` — Phase 3 telephony trust anchor; **Runtime Trust Parity** milestone (PSTN parity = same resolver as Live)
- `PSTN_VOICE_TOOL_PARITY_PATH_B.md` — governed minimal PSTN tool loop (post–QA gate)
- `AGENT_POLICY_REGISTRY.md` / `SAFE_MODE_CONTRACT.md` — refusal and safe-mode alignment for degraded paths
- `REGISTRY_AUTHORITY_CHARTER.md` — canonical doc map
