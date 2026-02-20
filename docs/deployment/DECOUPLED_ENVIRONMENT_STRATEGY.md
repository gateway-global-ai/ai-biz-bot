# Decoupled Environment Strategy

This document describes the **three-pillar** setup used to eliminate port collisions, instruction drift, and WebSocket (1006) crashes: **Doppler** for secret isolation, **PM2** for process management, and **Nginx** for domain-specific routing.

---

## 1. Why Decouple?

| Problem | Cause | Solution |
|--------|--------|----------|
| **Port collisions** | Multiple apps fighting for the same port | One port per environment, set in Doppler and enforced by PM2 |
| **Instruction drift** | Dev and Stage sharing or overwriting config | Handover Service + per-environment DB; ConciergePanel fetches stable config via API |
| **1006 WebSocket crashes** | One broken process or bad prompt taking down everything | Isolated processes; only the affected environment restarts |
| **502 Bad Gateway** | Nginx pointing at wrong port or missing WebSocket headers | Explicit proxy_pass per subdomain; Upgrade/Connection headers for Gemini Live |

---

## 2. Port & Secret Isolation (Doppler)

Instead of a single `.env` for all environments, we use **separate Doppler configs**. The Handover Service for Dev never touches Staging data.

| Environment | Doppler config | Port | Injected at runtime |
|-------------|----------------|------|----------------------|
| **Development** | `dev` | 3004 | `doppler run --config dev -- node dist/index.mjs` |
| **Staging** | `stg` | 3003 | `doppler run --config stg -- node dist/index.mjs` |
| **Production** | `prd` | 3002 | `doppler run --config prd -- node dist/index.mjs` |

- **Variable injection:** `doppler run --` injects `PORT`, `DATABASE_URL`, and all other secrets at the moment of execution.
- **Sync secrets between configs:** Use `npm run doppler:copy-config` (or `./scripts/doppler-copy-config.sh`) to copy dev → stg and prd; then `npm run doppler:sync-ports` to set PORT per config.
- See [API_KEYS_DOPPLER.md](../API_KEYS_DOPPLER.md) and [SECRET_MANAGER_SETUP.md](SECRET_MANAGER_SETUP.md).

---

## 3. Process Management (PM2 Ecosystem)

We use a **centralized `ecosystem.config.cjs`** instead of manual `npm start` so each app has a fixed port and lifecycle.

- **Idempotent execution:** PM2 starts Dev and Stage (and Prod) as separate processes; no port fighting.
- **Auto-restart:** If a 2.5 Flash Native Audio preview triggers a memory spike or connection reset, PM2 restarts only that instance.
- **ESM support:** The config targets `dist/index.mjs` to match the modern build output and avoid "File Not Found" at startup.

**Dev repo ecosystem** (this repo) example:

- `aibizbot-dev.gatewayglobal.ai` → `doppler run --config dev -- node dist/index.mjs` (cwd: dev repo)
- `aibizbot.gatewayglobal.ai` (prod) → `doppler run --config prd -- node dist/index.mjs` (cwd: dev repo)

**Stage** can run from the same repo (same build, different Doppler config) or from a separate stage repo with its own `ecosystem.config.cjs` and `doppler run --config stg`. In both cases, PORT and secrets come from Doppler.

---

## 4. Nginx “Switchboard” Routing

Public subdomains are mapped to the correct internal port so 502s and WebSocket failures are avoided.

| Environment | Public URL | Internal proxy_pass |
|-------------|------------|----------------------|
| **Development** | aibizbot-dev.gatewayglobal.ai | http://localhost:3004 |
| **Staging** | aibizbot-stage.gatewayglobal.ai | http://localhost:3003 |
| **Production** | aibizbot.gatewayglobal.ai | http://localhost:3002 |

- **WebSocket upgrade:** Both dev and stage Nginx configs must include proper `Upgrade` and `Connection` headers so the Gemini Live handshake is not stripped by the proxy.
- **Timeouts:** Use `proxy_read_timeout` and `proxy_send_timeout` (e.g. 3600s) for long-lived WebSocket connections.

See [nginx_config.md](../../client/src/components/chat/gemini_2_5_flash_react_instructions/nginx_config_dev_stage/nginx_config.md) for examples.

---

## 5. Structural Stability: Handover Service

To prevent **instruction drift** and connection loops:

1. **Discovery:** The app validates the business prompt through the UPAValidator.
2. **Persistence:** The prompt is saved as an immutable database artifact.
3. **Consumption:** The ConciergePanel in both Dev and Stage fetches this pre-built config via `GET /api/site-configs/:id`, so the voice engine never starts with a malformed instruction.

Dev can test “Alpha” system prompts while Stage keeps “Beta” prompts stable; each environment uses its own Doppler-backed DB and config.

---

## 6. Same Code, Different Brains (Target Model)

When Dev and Stage run from the **same project directory** and the **same build artifact**:

- **Single build:** One `dist/index.mjs` contains the full platform.
- **Environment-specific “permits”:** When PM2 starts Dev, it runs with the **Dev** Doppler config (Port 3004, Dev DB). When it starts Stage, it uses the **Staging** config (Port 3003, Staging DB).
- **Isolation:** Breaking Dev (e.g. a radical new prompt) only crashes the Dev process; Stage stays up.

**Note:** On this server, Stage may run from a separate repo (`aibizbot-stage.gatewayglobal.ai`) with its own build (`dist/index.cjs`). The same principle applies: different Doppler config (stg) and port (3003), so behavior is still isolated from Dev and Prod.

---

## 7. How This Fixes the Issues

| Issue | How the setup fixes it |
|-------|-------------------------|
| **Instruction drift** | Handover Service + per-environment DB; Dev can test Alpha prompts, Stage keeps Beta stable. |
| **Port conflicts** | Doppler configs pin PORT (3004 / 3003 / 3002); PM2 runs one process per app, so no collision. |
| **Connection loops (1006)** | If Dev breaks, only the Dev process restarts; Stage and Prod remain healthy. |
| **Build mismatches** | Standardizing on `.mjs` (or one build per repo) ensures the correct ESM engine and routes (e.g. `/api/health`) are used. |

---

## 8. Operational Workflow (“Jason” Standard)

1. **Develop:** Break things on aibizbot-dev (Port 3004).
2. **Verify:** Once stable, promote changes to aibizbot-stage (Port 3003) for internal review.
3. **Deploy:** Push to production (aibizbot.gatewayglobal.ai, Port 3002).

Each environment is a **clean room** for testing (e.g. new system prompts) without risking the rest of the platform.

---

## 9. Related Docs

- [ENVIRONMENTS_DEV_STAGE_PROD.md](ENVIRONMENTS_DEV_STAGE_PROD.md) – Ports, subdomains, branch strategy, deploy commands.
- [API_KEYS_DOPPLER.md](../API_KEYS_DOPPLER.md) – Doppler copy/sync, stage token, health checks.
- [SECRET_MANAGER_SETUP.md](SECRET_MANAGER_SETUP.md) – Doppler setup and service tokens.
- [DEPLOY_STAGE_AND_DEV_CHECKLIST.md](DEPLOY_STAGE_AND_DEV_CHECKLIST.md) – First-time VPS setup for stage and dev.
