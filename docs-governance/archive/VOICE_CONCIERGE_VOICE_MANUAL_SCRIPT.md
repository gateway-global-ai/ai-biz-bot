# Voice Concierge — manual PTT aptitude script (`ai-biz-bots`)

Version: 1.0  
Purpose: Human-run checks for **Gemini Live** voice path (not automated; **do not** add blocking validators to `/ws/gemini-live`).

**Environment:** Quiet room, headphones optional, **PTT** only (no open mic).

## Scenario 1 — Grounding (CGR)

1. Open `/agent/ai-biz-bots`.
2. Press and hold PTT; say: *“What does Gateway Global AI do in one sentence?”*
3. Release; wait for full reply.

**Pass:** Clear, factual answer; no fabricated phone numbers or URLs; tone matches platform marketing.

## Scenario 2 — Competence (ARCH micro-value)

1. PTT: *“How is push-to-talk different from a normal phone call for AI?”*
2. Listen for structure (acknowledge / context / handoff).

**Pass:** Explains noise/token/latency benefits; ends with a next-step or question (H).

## Scenario 3 — PPP / direction (sales_emphasis)

1. PTT: *“We’re a franchise with 20 locations and missed calls — what’s the first step you’d suggest?”*
2. Listen for purpose, plan, and time pressure (this week / next step).

**Pass:** Concrete plan language; optional timeline; no hard promises (“we guarantee revenue”).

## Scenario 4 — Barge-in / turn-taking

1. Start a long PTT question; release mid-answer if the model starts speaking (optional).
2. Or: ask a follow-up while the AI is speaking (browser-dependent).

**Pass:** No catastrophic overlap; user can complete a second turn without freezing UI.

## Scenario 5 — Reconnect

1. Toggle airplane mode or disconnect Wi‑Fi 5 seconds; reconnect.
2. Tap **Reconnect** in footer if shown; retry PTT.

**Pass:** Session recovers or clear error; no infinite spinner.

## Record results

| Scenario | Pass / Fail | Notes |
|----------|-------------|--------|
| 1 CGR | | |
| 2 ARCH | | |
| 3 PPP | | |
| 4 Turn | | |
| 5 Reconnect | | |
