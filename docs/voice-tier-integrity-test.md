# Voice Tier Integrity Test — "Jason Standard" QA Checklist

Final gate before promoting the `copilot/add-knowledge-worker-prompt` branch to production.
Run every step in the **Dev** environment (port 3004) against a site that is on the **voice** plan.

---

## Pre-flight Requirements

- [ ] PM2 dev process is running (`pm2 ls` shows `dev` as **online**)
- [ ] Doppler env is injected (`doppler run -- pm2 restart dev --update-env`)
- [ ] A test `site_config` row exists with `plan = 'voice'` and a known `siteConfigId`
- [ ] Google Workspace OAuth is connected for that site (`workspace_configurations.status = 'connected'`)
- [ ] `GEMINI_MODEL_ID` is set in Doppler to the correct native-audio model

---

## Step 1 — Voice Connection & System Prompt Override

**Goal:** Confirm the agent initialises using `system_prompt_override` (Knowledge Worker mode).

1. Open the Admin Panel for the voice-plan site.
2. Set `system_prompt_override` in `site_configs` to the contents of `server/prompts/knowledgeWorkerPrompt.ts`.
3. Open the Concierge voice panel.
4. Connect the session and say: *"Who are you and what can you do?"*

**Pass criteria:**
- Agent self-identifies as "Jordan" (or the Knowledge Worker persona).
- Server log shows: `[GeminiStreamingClient] Using system_prompt_override (Knowledge Worker mode)`
- Server log shows: `[GeminiVoice] Identity anchor set: siteConfigId=<uuid>`

---

## Step 2 — MCP Execution: Calendar Read

**Goal:** Confirm `mcp_read_calendar` returns real data from the connected Google account.

1. Say: *"What's on my schedule for the next 7 days?"*

**Pass criteria:**
- Server log shows: `[GeminiVoice] Injected siteConfigId into mcp_read_calendar args` (if model omitted it)
- `toolHandler.ts` logs the calendar call and returns `{ events, summary, audio_cue: "Got your schedule..." }`
- Agent reads out at least one real calendar event, or says *"Your schedule looks clear in that window."* — not a generic error.

---

## Step 3 — Verbal Fillers

**Goal:** Confirm the agent uses Thinking Phrases while tools run.

1. Say: *"Search my Drive for the Q1 roadmap."*
2. Listen for a filler phrase **before** the result is delivered.

**Pass criteria:**
- Agent says something like *"Scanning your Drive now…"* or *"Just a second, I'm pulling up your business documents…"* within 1–2 seconds of the request.
- After the search completes, agent delivers a substantive answer (file name, summary snippet, or "Nothing found on that topic").

---

## Step 4 — 403 Pivot (Plan Gating)

**Goal:** Confirm the agent delivers the "Upgrade Required" talk-track when plan is not `voice`.

1. In the DB, temporarily set `site_configs.plan = 'free'` for the test site.
2. Say: *"Search my Drive for the client contract."*

**Pass criteria:**
- `toolHandler.ts` returns `{ error: "...", plan_required: true, audio_cue: "I'd love to...", ui_action: "SHOW_UPGRADE_MODAL" }`
- Agent says something matching the plan-gating talk-track (*"I need a quick permission update…"* or *"that feature requires the Voice plan…"*) — not a raw error string.
- Optionally: the UI surfaces the upgrade modal (if `ui_action` forwarding is wired in the client).

3. Restore `plan = 'voice'` after confirming.

---

## Step 5 — Identity Lock (siteConfigId Auto-Injection)

**Goal:** Verify tool calls are automatically scoped without the user providing the UUID.

1. With `plan = 'voice'` restored, start a fresh voice session.
2. Say: *"Check my calendar for tomorrow morning."* — do NOT say "my business ID is …"

**Pass criteria:**
- Server log shows `[GeminiVoice] Identity anchor set: siteConfigId=<uuid>` at session start.
- Server log shows `[GeminiVoice] Injected siteConfigId into mcp_read_calendar args` (if model omitted it), OR the model correctly included the UUID because it was anchored via the session.
- Tool call resolves successfully without the user having stated any UUID.
- No cross-tenant data leak — the `siteConfigId` in the tool args matches the session's anchor.

---

## Optional — Stripe Webhook Lag Simulation

1. Trigger a test Stripe checkout for an upgrade.
2. Before the webhook fires (first 3 seconds), have the agent attempt an MCP tool call.

**Pass criteria:**
- If plan has not updated yet, `toolHandler.ts` returns the plan-gating `audio_cue`.
- Agent delivers the Webhook Lag talk-track: *"The pro tools are just warming up…"* rather than a hard error.

---

## Sign-off

| Step | Result | Notes |
|------|--------|-------|
| 1 — Voice Connection & System Prompt Override | ☐ Pass / ☐ Fail | |
| 2 — MCP Execution: Calendar Read | ☐ Pass / ☐ Fail | |
| 3 — Verbal Fillers | ☐ Pass / ☐ Fail | |
| 4 — 403 Pivot | ☐ Pass / ☐ Fail | |
| 5 — Identity Lock | ☐ Pass / ☐ Fail | |
| Optional — Webhook Lag | ☐ Pass / ☐ Skip | |

All 5 steps must pass before merging to `main`.
