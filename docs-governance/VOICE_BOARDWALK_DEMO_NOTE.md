# Voice demo — Boardwalk inventory vs system copy

## Context

The multitasking Boardwalk demo agent uses **SALES** operational mode with **`get_hotel_inventory`** (see `server/config/operationalModes.ts`) so tool declarations match hospitality flows.

## Follow-up (separate task)

[`server/geminiVoice.ts`](../server/geminiVoice.ts) is **governance lockdown**. For **paid** sites it still injects **anti-booking** lines (`RUNTIME_POLICY`, `PRICING_RULE`) into the compiled persona while tools may include inventory APIs. That can **contradict** a spoken demo that should quote live availability.

**Do not change `geminiVoice.ts` as a side effect of KB or demo scripts.** If spoken demos must align with Cloudbeds-backed inventory:

1. Open a **voice-specific governance** task.
2. Define when hospitality / PMS-linked sites may relax or replace those strings (e.g. site flag or `site_pms_integrations` present).
3. Test `/ws/gemini-live` end-to-end after any copy change.

Chat and website preview paths may already behave differently; scope voice changes explicitly.
