# Voice Concierge — demo sign-off checklist (flight-check)

Version: 1.0  
Surface: Gateway Global AI marketing agent (`slug`: `ai-biz-bots`)

Use this before a public demo or stakeholder review. **Site UUID** differs per environment; always resolve by slug.

## 1. Preconditions

| Step | Check |
|------|--------|
| DB | Migration `0054_voice_concierge_ai_biz_bots_governance.sql` applied (`npm run db:migrate`). |
| Seed | Server startup ran `seedDemoAgents()` at least once, or governance set manually for `ai-biz-bots`. |
| Keys | `npm run check-keys` passes (Gemini + Maps + Twilio as configured). |

## 2. Resolve site and agent (no hardcoded UUID)

```bash
# Replace HOST with your dev/stage/prod origin
curl -sS "https://HOST/api/site-configs/by-slug/ai-biz-bots" | jq '{id, slug, assignedAgentId, metadata, communicationGovernance}'
```

**Expected:**

- `slug` = `ai-biz-bots`
- `metadata.platformMarketingDemo` = `true`
- `communication_governance.pppEngagement` includes `enabled: true`, `mode: "sales_emphasis"`
- `assignedAgentId` is non-null

## 3. Public URL validation

| Step | Pass criteria |
|------|----------------|
| Open `/agent/ai-biz-bots` | Page loads; no blank shell; concierge UI renders. |
| Logo / shell | ClearVoice / AI OS shell matches governance (dark shell, white canvas). |
| First message | Agent introduces per introduction protocol (name + company + offer). |
| **Chat** | Ask: “What is Gateway Global AI?” — answer uses knowledge tone; includes CGR/ARCH/PPP-style structure where appropriate. |
| **PTT** | Hold PTT, speak a short question; release; transcription appears; AI responds with voice. |
| Latency | Subjective: response feels interactive (no multi-second stalls on warm network). |
| Reconnect | Footer reconnect works if you disconnect network and restore. |

## 4. Governance spot-checks (no production log required)

- **PPP shadow (automated):** `npm run test:voice-concierge-aptitude` passes.
- **Manual voice script:** [VOICE_CONCIERGE_VOICE_MANUAL_SCRIPT.md](./VOICE_CONCIERGE_VOICE_MANUAL_SCRIPT.md) — run at least scenarios 1–3.

## 5. Out of scope for this checklist

- Calling a ChatGPT Custom GPT URL from the backend (not supported).
- Replacing Gemini Live with local LLM for customer voice.
- Batch Ollama jobs: optional `POST /api/local-llm-batch/complete` with admin token (see [VOICE_CONCIERGE_LOCAL_LLM_BATCH.md](./VOICE_CONCIERGE_LOCAL_LLM_BATCH.md)).

## Related

- [VOICE_CONCIERGE_GATEWAY_AI_BIZ_BOTS.md](./VOICE_CONCIERGE_GATEWAY_AI_BIZ_BOTS.md)  
- [GETTING_STARTED.md](../docs/GETTING_STARTED.md)
