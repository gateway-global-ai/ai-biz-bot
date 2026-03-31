# Sovereign environment manifest

Naming constitution for [`.env.example`](../.env.example): every **active** (uncommented) `KEY=value` line must be listed here so operators know purpose and provenance. Sole AI inference is **Google Gemini** (`GEMINI_API_KEY` / `GEMINI_MODEL_ID` in Doppler); no alternate LLM API keys belong in application code.

## Database

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (pooling params optional). |

## AI (Google)

| Key | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Generative Language / AI Studio key for Gemini (chat, tools, native audio when configured). |
| `GOOGLE_API_KEY` | General Google APIs fallback (non-Gemini) where the code path allows. |

## Maps & Places (server)

| Key | Purpose |
|-----|---------|
| `GOOGLE_MAPS_API_KEY` | Server-side Maps + Grounding Lite + Places (New); one key for both where required. |
| `GOOGLE_PLACES_API_KEY` | Optional alias; should match the same GCP key as Maps when used. |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project for server Google API usage. |

## Google OAuth & Workspace

| Key | Purpose |
|-----|---------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 web client (Workspace connect). |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | Authorized redirect for OAuth callback. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON for domain-wide delegation / platform email (optional). |
| `PLATFORM_SENDER_EMAIL` | Sender address when using DWD email (optional). |

## Local LLM / local voice (internal worker only)

| Key | Purpose |
|-----|---------|
| `LOCAL_LLM_BASE_URL` | Base URL for the local LLM provider used by internal/local agents and local voice-adjacent services. |
| `LOCAL_LLM_MODEL` | Default local coding/analysis model identifier for the governed local agent plane. |
| `LOCAL_LLM_MODEL_LARGE` | Optional larger-capacity local model identifier for elevated local coding/analysis work. |
| `LOCAL_LLM_CODING_AGENT_SITE_CONFIG_ID` | Site config ID used to bind seeded local coding/UI agents to a specific site/runtime context. |
| `LOCAL_VOICE_USE_STUBS` | Controls whether local voice flows use stubbed behavior instead of live integrations. |
| `LOCAL_VOICE_TWILIO_STREAM` | Enables the local Twilio voice-stream path for local voice testing/runtime instead of the Gemini cloud path. |
| `LOCAL_VOICE_SIDECAR_URL` | Base URL for the local voice sidecar service used by local Twilio stream / voice-runtime integrations. |

## Twilio

| Key | Purpose |
|-----|---------|
| `TWILIO_ACCOUNT_SID` | Account SID. |
| `TWILIO_AUTH_TOKEN` | Auth token. |
| `TWILIO_PHONE_NUMBER` | E.164 primary number. |
| `SYSTEM_TWILIO_ACCOUNT_SID` | System-level primary account SID. |
| `SYSTEM_TWILIO_AUTH_TOKEN` | System-level auth token. |
| `SYSTEM_TWILIO_PHONE_NUMBER` | System-level number. |
| `TWILIO_WEBHOOK_SIGNATURE_BASE_URL` | Optional public HTTPS origin (no trailing slash) for `X-Twilio-Signature` validation when TLS terminates at a proxy; appended with `req.originalUrl` (e.g. Debugger `POST /api/twilio/monitor/debug-event`). |

## Stripe

| Key | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Server-side secret key. |
| `STRIPE_PUBLISHABLE_KEY` | Client-safe publishable key. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret for `/api/stripe/webhook/subscriptions`. |

See **[Stripe billing bootstrap](deployment/STRIPE_BILLING_BOOTSTRAP.md)** for test vs live mode, webhook URLs, `STRIPE_PRICE_*` catalog variables, and the `bootstrap-stripe-plan-prices` script.

## Application URLs & process

| Key | Purpose |
|-----|---------|
| `NODE_ENV` | `development` \| `staging` \| `production`. |
| `PORT` | HTTP listen port. |
| `HOST` | Bind host (e.g. `0.0.0.0` behind proxy). |
| `WS_PORT` | WebSocket port when split from HTTP. |
| `CLIENT_URL` | Browser/client origin URL. |
| `SERVER_URL` | Server self URL. |
| `API_URL` | API base URL. |
| `APP_URL` | Public app URL (Stripe redirects, magic links, QR). |

## Security & Nova

| Key | Purpose |
|-----|---------|
| `NOVA_RSA_PUBLIC_KEY` | PEM for verifying Nova billing signatures (optional). |
| `SESSION_SECRET` | Session HMAC/encryption (32+ chars). |
| `ENCRYPTION_KEY` | App encryption for sensitive fields (32+ chars). |

## Agent orchestration (optional)

Documented as comments in [`.env.example`](../.env.example); set in Doppler only when needed. See `docs-governance/worklogs/WL-AGENT-ORCHESTRATION.md`.

| Key | Purpose |
|-----|---------|
| `ORCHESTRATION_AGENT_CREATE_BYPASS` | When `true`, skips the orchestration-run gate on `POST /api/agents` (server still logs a bypass violation). |
| `ORCHESTRATION_APTITUDE_REQUIRED_FOR_DEPLOY` | When `true`, failed/incomplete aptitude blocks provision finalization. |
| `ORCHESTRATION_CUSTOMER_OUTCOME_REQUIRED` | When `true`, minimal customer-outcome fields are required before provision runs complete. |

## Feature flags

| Key | Purpose |
|-----|---------|
| `ENABLE_VOICE_AI` | Enable Gemini voice features. |
| `ENABLE_GOOGLE_WORKSPACE` | Enable Workspace integration surfaces. |
| `ENABLE_A2P_COMPLIANCE` | A2P / compliance UI and router paths. |
| `ENABLE_VOICE_LEAD_MACHINE` | VoiceLeadMachine / VLM features. |
| `ENABLE_CHAT_FLOAT_MODE` | Chat floating mode. |
| `ENABLE_CHAT_EXPAND_MODE` | Chat expand mode. |

## Logging & rate limits

| Key | Purpose |
|-----|---------|
| `LOG_LEVEL` | `error` \| `warn` \| `info` \| `debug` \| `trace`. |
| `DEBUG` | Verbose debug toggle. |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window length (ms). |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per IP. |

## Development / B2B

| Key | Purpose |
|-----|---------|
| `MOCK_TWILIO_SMS` | Avoid sending real SMS in dev when `true`. |
| `SERP_API_KEY` | SerpAPI for B2B search / MCP-related flows. |

## Registry checksum

The following keys are the exact set parsed from active lines in `.env.example` (must stay in sync):

`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `PLATFORM_SENDER_EMAIL`, `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL`, `LOCAL_LLM_MODEL_LARGE`, `LOCAL_VOICE_USE_STUBS`, `LOCAL_LLM_CODING_AGENT_SITE_CONFIG_ID`, `LOCAL_VOICE_TWILIO_STREAM`, `LOCAL_VOICE_SIDECAR_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SYSTEM_TWILIO_ACCOUNT_SID`, `SYSTEM_TWILIO_AUTH_TOKEN`, `SYSTEM_TWILIO_PHONE_NUMBER`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NODE_ENV`, `PORT`, `HOST`, `WS_PORT`, `CLIENT_URL`, `SERVER_URL`, `API_URL`, `APP_URL`, `NOVA_RSA_PUBLIC_KEY`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `ENABLE_VOICE_AI`, `ENABLE_GOOGLE_WORKSPACE`, `ENABLE_A2P_COMPLIANCE`, `ENABLE_VOICE_LEAD_MACHINE`, `ENABLE_CHAT_FLOAT_MODE`, `ENABLE_CHAT_EXPAND_MODE`, `LOG_LEVEL`, `DEBUG`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `MOCK_TWILIO_SMS`, `SERP_API_KEY`.
