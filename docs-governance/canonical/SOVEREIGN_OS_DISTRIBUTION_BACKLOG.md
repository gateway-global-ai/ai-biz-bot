---
status: canonical
truth_domain: governance
enforced_by: none
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-28
---

# Sovereign OS Distribution Backlog (1-Click VPS)

## Purpose

Track **pre-launch** work to distribute the governed stack as a **1-click VPS / Docker** offering (similar in motion to templates like OpenClaw on Hostinger-class providers). Goal: bypass local dev friction (Node, Python venvs, GPU drivers) while preserving **data sovereignty** for enterprise and privacy-conscious operators.

**This is a go-live gate:** distribution packaging should reach **minimum viable** state before treating the OS as broadly deployable by non-operators.

**Not in scope for this document:** Implementing the full Compose file — that is a controlled engineering task once this backlog is scheduled. Existing partial artifact: `server/local-voice/sidecar/docker-compose.yml` (sidecar only).

## Strategic framing

- **Single Compose entrypoint** for providers that support “Compose from URL” or marketplace templates.
- **HTTPS at the edge is mandatory** for Twilio webhooks and Media Streams — operators must not hand-roll certificates; bundle **automatic TLS** (e.g. Caddy) in the distribution topology.
- **Two commercial SKUs** (RAM / capability), not one-size-fits-all — local voice + local LLM are memory-heavy.

## Target topology (four services)

| Service | Role | Notes |
|---------|------|--------|
| **`os-gateway`** | Node.js monolith: API, React client build, Gemini Live proxy (`geminiVoice.ts`), Twilio webhooks, tool/canvas validators | Expose **only** to reverse proxy internally; no direct public Node port in hardened layout |
| **`voice-engine`** | Python sidecar: FastAPI, VAD, Faster-Whisper, Kokoro TTS (see `server/local-voice/sidecar/`) | CPU-optimized ONNX defaults; optional GPU passthrough on larger VPS |
| **`llm-runtime`** | Ollama — local worker plane per `.cursor/rules/local-agent-governance.mdc` | Heaviest container; pull policy for default model (e.g. env-driven `LOCAL_LLM_MODEL`) on first boot |
| **`edge-proxy`** | Caddy (or equivalent) — TLS termination, reverse proxy to `os-gateway`, optional path routing to sidecars | **Required** for production Twilio-facing URLs |

Network: single Docker network; only **edge-proxy** publishes **443** (and **80** for ACME).

## VPS sizing (operator-facing)

| Template | Approx. RAM | Local Ollama | Local voice sidecar | Primary use |
|----------|-------------|--------------|---------------------|-------------|
| **Cloud-first** | ~8 GB (e.g. “KVM 2” class) | **Off** or stubbed | Optional light / stubs | Gemini Live + cloud path; set `LOCAL_VOICE_USE_STUBS=true` (or equivalent) where local WS is non-essential |
| **Sovereign full** | **16–32 GB** (e.g. KVM 4 / 8 class) | **On** | **On** | Whisper + Kokoro + Qwen-class models — **document minimum RAM** on install page to avoid OOM during calls |

Under-provisioned nodes will fail during **collect** / first model load — distribution docs must state **tier recommendations** explicitly.

## Hostinger-style rollout (phased)

### Phase A — Compose from URL (near-term)

1. Publish a **versioned** `docker-compose.vps.yml` (name TBD) in a public or open-core repo.
2. Operator flow: provision **Docker VPS** → Docker Manager → **Compose from URL** → paste raw URL to the tagged file.
3. Gateway marketing page: “Install on Hostinger / Docker VPS” with **SKU table** + env checklist + link to Compose.

### Phase B — Official marketplace template (strategic)

1. Stable open-source or **open-core** repo with clear license and README.
2. Images on a public registry (e.g. `your-org/ai-os-gateway:latest`) with reproducible builds.
3. **Partnership / template submission** with the host (e.g. Hostinger partnerships) — maps Compose + env UI to hPanel “1-click” (dedicated `/vps/docker/...` style URL is **vendor-dependent**).

## Environment injection (checkout / hPanel prompts)

Providers often inject a **subset** of env vars at deploy time. Consolidate **prompts** against the full truth in [`docs/SOVEREIGN_ENV_MANIFEST.md`](../../docs/SOVEREIGN_ENV_MANIFEST.md) and [`.env.example`](../../.env.example).

**Minimum prompts for a voice-capable public deploy** (illustrative — reconcile names with manifest before shipping):

| Variable | Required for | Notes |
|----------|----------------|-------|
| `GEMINI_API_KEY` | Gemini proxy / Live | Never client-exposed |
| `GEMINI_MODEL_ID` | Voice + chat model selection | From env only per api-lockdown |
| `DATABASE_URL` | Persistence | Postgres container or managed |
| `APP_URL` / `SERVER_URL` / `CLIENT_URL` | Twilio callbacks, TwiML, CORS | Align with Caddy public hostname |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Webhooks / Verify / SMS router | Plus numbers per manifest |
| `LOCAL_VOICE_TWILIO_STREAM` | Route PSTN to local vs Gemini path | `true` / `false` |
| `LOCAL_VOICE_USE_STUBS` | Cloud-first SKU | Relax local WS when stubs acceptable |
| `SESSION_SECRET` / `ENCRYPTION_KEY` | Sessions + crypto | Strong random |
| `LOCAL_LLM_BASE_URL` / `LOCAL_LLM_MODEL` | Ollama service | Point at `llm-runtime` service name |

**Admin / operator access** (e.g. initial `PLATFORM_ADMIN_PASSWORD` or bootstrap token) must be **governed** — define in manifest and security review before template publish; do not hardcode in images.

## Engineering backlog (ordered)

1. **Root-level Compose** wiring four services + healthchecks + volume strategy for models.
2. **Production Dockerfile** (or multi-stage) for `os-gateway` if not already suitable for registry push.
3. **Caddyfile** (or Traefik alternative) with ACME + upstream to Node + path rules for sidecars.
4. **Env template** for VPS: `env.vps.example` with SKU-specific comments (cloud-first vs sovereign).
5. **First-boot docs**: migrate DB, seed optional admin; Twilio webhook checklist — voice/SMS per ops runbook + [`docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md`](../../docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md) (Debugger + `TWILIO_WEBHOOK_SIGNATURE_BASE_URL`).
6. **CI**: build/push images; optional `compose config` validation.
7. **Partnership / listing** track (owner: GTM) after Phase A is stable.

## Governance constraints

- **No secrets in images.** All keys via env / secret store pattern consistent with Doppler doctrine for managed installs; self-hosted operators use provider injection or `.env`.
- **Voice lockdown files** (`geminiVoice.ts`, `voiceStream.ts`, etc.) change only under explicit voice governance tasks — distribution work must **not** rewrite protocols; it **packages** existing behavior.
- **Monolith ban** on `server/routes.ts` unchanged — new routes stay modular.

## Related

- `GOVERNANCE_EXECUTION_PLAN_V1.md` — Phase **11** / pre-launch gate
- `docs/SOVEREIGN_ENV_MANIFEST.md` — full env authority
- `TWILIO_RELIABILITY_ARCHITECTURE.md` — HTTPS + observability expectations in production
- `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md` — Debugger URL + signature base for proxy-terminated TLS
- `SESSION_IDENTITY_BINDING_SPEC.md` — tool binding parity when PSTN tools wire into `voice-stream`
