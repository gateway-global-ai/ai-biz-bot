---
name: sovereign-voice-architect
description: Umbrella — Gemini Live, Clear Voice audio, voice lockdown, and Phase 5D certification bridge. Use for anything touching browser or PSTN voice.
---

# Sovereign Voice Architect (Umbrella)

Use this skill when work touches **native audio**, **WebSocket voice**, **Twilio media streams**, or **knowledge certification** on voice sessions.

## When to use

- Changing or debugging voice **behavior** (within governance): consult lockdown list first.
- Latency, sample rates, tool calls from Live API, or **Phase 5D** snapshot / bridge docs.

## Deep skills (read in order)

| Skill | Focus |
|-------|--------|
| [`gemini-live-engine`](../gemini-live-engine/SKILL.md) | Multimodal Live API, PCM rates, model env |
| `clear-voice-ops` | Patterns in **`.cursor/rules/clear-voice-ops.mdc`** — FRCRN / worklets / `server/services/audio/**` |

## Cursor rules (non-negotiable)

- [`.cursor/rules/sovereign-voice-lockdown.mdc`](../../rules/sovereign-voice-lockdown.mdc) — protected files; **read-only** unless explicit voice task.
- [`.cursor/rules/sovereign-chat-lockdown.mdc`](../../rules/sovereign-chat-lockdown.mdc) — chat PTT/layout contract.

## Governance docs

- [`docs-governance/VOICE_PHASE_5D_BRIDGE.md`](../../../docs-governance/VOICE_PHASE_5D_BRIDGE.md) — certification snapshot, bridge strategy.
- [`docs-governance/EXECUTION_PLANE_BOUNDARY_SPEC.md`](../../../docs-governance/EXECUTION_PLANE_BOUNDARY_SPEC.md) — hot-path boundaries.

## Execution reminder

Tool calls from Live still go through [`server/services/toolHandler.ts`](../../../server/services/toolHandler.ts) — **knowledge certification** may block pricing tools even when declared.
