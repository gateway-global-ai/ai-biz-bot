# Voice Concierge — local LLM batch service (Phase 2)

Version: 1.0  
Status: Implemented (HTTP route) — **not** on the Gemini Live voice hot path.

## Purpose

Long-form or batch text (summaries, drafts, internal ops) via **Ollama** on the app server. Customer-facing **voice** remains **Gemini Native Audio** only (`/ws/gemini-live` — lockdown).

## Endpoint

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/local-llm-batch/complete` | `Authorization: Bearer <admin session token>` |

**Body (JSON):**

| Field | Type | Required |
|-------|------|----------|
| `prompt` | string | yes (max 120k chars) |
| `system` | string | no (optional system preface) |
| `maxTokens` | number | no (64–8192, default 1024) |

**Response:** `{ ok: true, model, text }` or error JSON.

## Environment

| Variable | Default | Notes |
|----------|---------|--------|
| `LOCAL_LLM_BASE_URL` | `http://127.0.0.1:11434` | Ollama HTTP API |
| `LOCAL_LLM_MODEL` | `qwen2.5:7b-instruct` | Must be pulled on the host (`ollama pull …`) |
| `LOCAL_VOICE_TIMEOUT_MS` | `30000` | Request timeout for batch call |

Shared with operator sandbox: [`server/local-voice/config.ts`](../server/local-voice/config.ts).

`LOCAL_VOICE_USE_STUBS` applies to **`/ws/local-voice`** only**, not** this HTTP route.

## Security

- **Admin session only** (`requireAuth`). Do not expose without auth.
- Rate limiting: consider reverse proxy / future middleware if abused.
- **No** secrets in client; call only from trusted tools or server-side jobs.

## Non-goals

- Replacing Gemini for customer PTT.
- Training or fine-tuning (separate ML ops track).
- Calling OpenAI Custom GPT URLs.

## Related

- [`server/routes/localLlmBatchRoutes.ts`](../server/routes/localLlmBatchRoutes.ts)  
- [VOICE_CONCIERGE_GATEWAY_AI_BIZ_BOTS.md](./VOICE_CONCIERGE_GATEWAY_AI_BIZ_BOTS.md)
