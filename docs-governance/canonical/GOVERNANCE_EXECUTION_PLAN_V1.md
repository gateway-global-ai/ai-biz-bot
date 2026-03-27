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

# Governance Execution Plan v1 (Source of Truth)

**Supersedes ad hoc phase ordering.** Peer-reviewed against repo reality (audit pack `user_uploads/governane_plan3_26/5_cursor_audit.md`, migration planner `4_registery_migration_planner.md`).

**Cursor / agents:** Canonical phase order is also pinned in **Tier 1** [`.cursorrules`](../.cursorrules) (item 7).

## North star

**Capabilities + boundaries + registries** enforce behavior. Prompts for customer-facing runtime are **compiled outputs**, not authority.

**Operating chain:** `Charter → Plan → Spec → controlled PRs`  
(`REGISTRY_AUTHORITY_CHARTER.md` → this file → `AGENT_DEPLOYMENT_CONTRACT_V1.md` / `AGENT_CAPABILITY_SPEC_V0.md` → scoped code changes.)

**Customer-facing deploy:** `AGENT_DEPLOYMENT_CONTRACT_V1.md` defines mandatory **identity, knowledge authority, tools, fallbacks, proficiency, and enforcement** for **deployed** agents; Phase **5** adds validators/CI against that contract (incremental).

## Tight sequence (reviewer checklist)

1. Phase order pinned (`.cursorrules` + this doc).
2. Short **voice QA**: canvas narration + transport after `canvas_grounding` forward.
3. **Deprecated canvas bypass** removed (tool metadata → pinned canvas); legacy tools render **inline** only.
4. **Phase 4:** derive `REGISTERED_VIEW_IDS` from `shared/canvasViewContract.ts`.
5. **Skill YAML ↔ `skillDispatchRoutes` enum** alignment.
6. **Agent exemplars:** `registry-yaml/agent-capabilities/ui_agent.v0.yaml` and `coding_agent.v0.yaml` (✅ present).
7. **Registry gate:** `npm run validate:agent-capabilities` — structural YAML only; no DB/codegen (✅).
8. **Twilio reliability plane** canon present: `TWILIO_RELIABILITY_ARCHITECTURE.md`, `TWILIO_ERROR_NORMALIZATION_SPEC.md`, `TWILIO_FALLBACK_POLICY_REGISTRY.md`, `registry-yaml/twilio-platform-failure-classes.v0.yaml` (✅); Phase **10** implements ingestion + policy (see § below).
9. **Vendor telemetry discovery:** When adding skills or integrating critical providers (telecom, SMS, payments, IDV), complete the provider’s **error/monitor/webhook** inventory per reliability architecture doc — do not ship happy-path-only integrations.
10. **Session identity binding:** `SESSION_IDENTITY_BINDING_SPEC.md` canonical; `npm run test:guest-tool-phone-binding` passes for resolver + Zod scenarios (✅).
11. **Sovereign distribution (pre-launch):** `SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md` — 1-click VPS / Docker topology + Hostinger-style phases tracked before broad go-live (⏳ implementation).
12. **Runtime Trust Parity** milestone (§ below): Phase 3 human voice QA + PSTN tool path uses same bound-identity resolver as Live + Twilio Debugger webhook (**10a**) live — then Phase 4 / Phase 11 on stable ground.
13. **Agent deployment contract:** `AGENT_DEPLOYMENT_CONTRACT_V1.md` canonical (✅); Phase **5** implements **validation + CI** hooks (⏳).

## Phase map

| Phase | Name | Code? | Objective |
|-------|------|-------|-----------|
| 1 | System audit | Read-only | Inventory authority vs drift (ongoing; baseline: artifacts 0–5). |
| 2 | Doctrine lock | Docs | `REGISTRY_AUTHORITY_CHARTER.md` + this plan (✅ v1). |
| 3 | Critical integrity | Yes, minimal | Fix contract violations without new parallel systems. |
| 4 | Structural alignment | Yes | Single-source views; skill enum ↔ YAML; route convergence. |
| 5 | Governance enforcement | Process + CI | Linter → review → validation scripts → aptitude. |
| 6 | UI discipline | Yes, incremental | `@/ui-core` only; shadcn MCP = discovery. |
| 7 | Voice compliance | Governed tasks | Lockdown-respecting; contract-based tools. |
| 8 | MCP normalization | Docs + config | Allowed patterns; secrets hygiene. |
| 9 | Command & test alignment | Yes | Slash commands + npm scripts → one health story. |
| 10 | **Twilio reliability plane** | Phased (see § below) | Observer → normalize → **policy** → fallback + audit; Monitor / Debugger / Alarms — platform-owned. |
| 11 | **Sovereign OS distribution** | Pre-launch gate | 1-click VPS Docker Compose (gateway + voice sidecar + Ollama + TLS proxy); cloud-first vs sovereign RAM SKUs. |

## Phase 3 — Status

| Item | Status | Validation |
|------|--------|------------|
| Website chat: `loadBuyerJourney` before prompt compile | ✅ Done | `server/routes/chatRoutes.ts` |
| Voice: forward `canvas_grounding` as `clientContent` | ✅ Done | `server/geminiVoice.ts` |
| Remove deprecated **pinned** canvas from `shared_canvas` / `show_canvas` tool metadata | ✅ Done | No `applyCanvasPayload` on that path; inline `ToolRouter` renders legacy tools |
| PSTN **jail** stream URL includes `siteConfigId` query when present | ✅ Done | `resolvePublicVoiceStreamUrl(req, siteConfigId)` in `/webhook/voice/jail` |
| `/ws/twilio-sovereign`: Tier-2 `siteConfigId` from `start.customParameters`; media gate until prompt ready | ✅ Done | `server/twilioSovereignStream.ts` |
| **Telecom trust anchor:** `From` / `CallSid` / `To` via TwiML → WebSocket → session + system prompt | ✅ Done | See § Telephony session identity below |
| Voice QA (narration + stability) | ⏳ Human | Run before closing Phase 3 — script: [`docs/deployment/PHASE_3_VOICE_QA_EXECUTION_SCRIPT.md`](../../docs/deployment/PHASE_3_VOICE_QA_EXECUTION_SCRIPT.md) |

## Milestone: Runtime Trust Parity (internal alignment)

**One-line goal:** Close the **voice integrity gate**, make **native PSTN** obey the **same session trust model** as browser Live, and stand up **Twilio’s first real observability intake** — then proceed to structural alignment and distribution without GTM outrunning runtime.

This milestone is **peer-reviewed** as the right pre-launch combination of integrity, security, and operations.

| Criterion | Meaning | Status |
|-----------|---------|--------|
| **A. Voice integrity** | Phase **3** closed only after **human** voice QA: canvas narration, transport stability, no hidden regressions on the voice path. | ⏳ Until QA sign-off |
| **B. PSTN trust parity** | `/ws/voice-stream` tool execution (when wired under voice governance) uses **`ToolCallContext`** + **`resolveBoundPhoneForGuestTools`** — **same resolver, no second implementation** (`SESSION_IDENTITY_BINDING_SPEC.md`). Blueprint: [`PSTN_VOICE_TOOL_PARITY_PATH_B.md`](./PSTN_VOICE_TOOL_PARITY_PATH_B.md) (after Phase 3 QA sign-off). | ⏳ |
| **C. Twilio observability intake** | Phase **10a**: Debugger webhook ingestion with **`X-Twilio-Signature`** validation, correlation IDs (`CallSid`, `error_code`, …), structured logs (DB persistence = later). | ✅ Ingest route live — configure Twilio Console Debugger URL to `POST /api/twilio/monitor/debug-event` |

**Work sequencing (peer-reviewed session order: A → 10a → B):**

- **Path A:** Human **Phase 3 voice QA** first when it can be signed off — integrity gate before trusting runtime.
- **Path 10a:** Debugger webhook **before** widening PSTN execution — operational visibility without editing lockdown voice stream first (✅ modular route + `normalizeTwilioDebuggerPost`; `npm run test:twilio-debugger-normalize`).
- **Path B:** **Governed PSTN tool-wiring** last — same `handleToolCall` + `resolveBoundPhoneForGuestTools` after QA confidence and with Debugger logs available if regressions occur.

**Practical:** If a session cannot complete human QA, implement **10a** (done here) while QA runs in parallel; still treat **A** as the formal Phase 3 close before declaring integrity complete.

**After this milestone:** Phase **4** (views, skills, routes) and Phase **11** (VPS distribution) proceed on **stable** runtime ground.

**Protected tools policy (sequence):** Prove binding in guest tools (✅ Live) → extend to **PSTN** voice → then payments, account recovery, cross-channel verification, sensitive lookups — **one binding model**, not per-feature drift.

## Telephony session identity & verification (zero-trust ANI)

**Principle:** **Caller ID from Twilio signaling (`From`) is the trust anchor**, not anything the caller says. Spoofing and social engineering target LLM-supplied “phone numbers” in tool args — **tool execution must bind to session `trustedCallerId` server-side.**

### Implemented data path (current)

1. **HTTP webhook** (`server/routes/telephonyRoutes.ts`): `POST /webhook/voice/stream` and `POST /webhook/voice/jail` read `From`, `To`, `CallSid` from Twilio’s signed body (existing `createCallLog` unchanged).
2. **TwiML `<Stream>`:** Parameters `callerId`, `callSid`, `dialedNumber` echo those fields into the Media Stream.
3. **WebSocket `start`:**  
   - **Gemini PSTN** (`server/voiceStream.ts`): reads `customParameters`, stores `trustedCallerId` / `dialedNumber` on `VoiceSession`, appends **TELECOM TRUST ANCHOR** block to the Gemini setup `system_instruction`.  
   - **Local sovereign** (`server/twilioSovereignStream.ts`): merges `customParameters` + `start.callSid`, logs session line, appends the same anchor text to the Ollama system prompt after `resolveSystemPrompt`.

### Required next (tool plane — not yet exhaustive)

- **Session identity binding:** Canonical policy: `SESSION_IDENTITY_BINDING_SPEC.md`. **Browser / bridged Live (`geminiVoice.ts`):** `guest_phone_verification` and `pms_lookup_guest_journey` use `resolveBoundPhoneForGuestTools` + `ToolCallContext.trustedCallerId` (✅). **`/ws/voice-stream` (native PSTN):** when Live tools are wired, pass `trustedCallerId` / `callSid` from `voiceSessionManager` into the **same** resolver — do not fork logic (⏳). Tests: `npm run test:guest-tool-phone-binding`.
- **Sovereign Ollama:** When adding tools beyond plain chat, pass `sessionTelecom` from the WebSocket closure into the tool executor (today sovereign path is chat-only).  
- **Per-number routing:** `LOCAL_VOICE_TWILIO_STREAM` remains a **process-global** flag; tenant-specific Gemini vs local requires moving routing into DB / `siteConfig` / number metadata (future phase).

## Twilio observability, debugging, and fallback policy (platform-owned)

**Principle:** Twilio is part of the **sovereign execution plane**. When webhooks fail, Media Streams error, or Twilio raises Monitor **Alerts**, the **platform** must receive structured feedback — not optional “no-code” console-only triage. This is **Phase 10**; full automation is **not** required immediately, but **capability must exist** in architecture and runbooks.

**Peer-reviewed doctrine:** *Twilio provides telemetry; the OS provides policy.* Ingestion without normalization and policy is **passive logging**, not reliability. Canonical subsystem docs:

- `TWILIO_RELIABILITY_ARCHITECTURE.md` — Observer → normalization → policy engine → fallback + audit (telecom-grade placement).
- `TWILIO_ERROR_NORMALIZATION_SPEC.md` — Twilio → platform failure classes, correlation keys, visibility split.
- `TWILIO_FALLBACK_POLICY_REGISTRY.md` — policy dimensions and fallback action vocabulary.
- `registry-yaml/twilio-platform-failure-classes.v0.yaml` — stable `class_id` list (v0).

### Pipeline (conceptual)

`Twilio → Platform Observer (capture) → Normalization (interpret) → Policy engine (decide) → Fallback actions + operator notify + audit (respond).`

### Official Twilio surfaces (authoritative references)

| Surface | Role | Documentation |
|--------|------|----------------|
| **Alerts** | Log entries for webhook failures and API errors; single-alert fetch returns full HTTP request/response for RCA | [Monitor REST API: Alerts](https://www.twilio.com/docs/usage/monitor-alert) |
| **Events** | Broad audit log (resource changes, API/Console actions); export to SIEM | [Monitor Events resource](https://www.twilio.com/docs/usage/monitor-events) |
| **Debugging Events webhook** | Console Debugger pushes **ERROR** / **WARNING** events to your HTTPS URL (`Payload` JSON); validate **`X-Twilio-Signature`** like any webhook | [Debugging Events Webhook](https://www.twilio.com/docs/usage/troubleshooting/debugging-event-webhooks) |
| **Alarms** | Email / webhook notifications tied to Monitor conditions | [Monitor Alarms](https://www.twilio.com/docs/usage/monitor-alarms) |

### Platform responsibilities (non-negotiable)

1. **Inbound validation:** Any endpoint that accepts Twilio Monitor or Debugger POSTs **must** use `validateTwilioSignature` (same discipline as `telephonyRoutes` voice webhooks). See [Secure your app by validating incoming Twilio requests](https://www.twilio.com/docs/usage/webhooks/webhooks-security).
2. **Correlation keys:** Persist and propagate **`CallSid`**, **`streamSid`** (when present), and **`error_code`** / `resource_sid` from Alert or Debugger payloads so incidents tie to `call_logs` / voice sessions.
3. **Fallback UX:** TwiML `<Say>` / `<Hangup>` paths in `telephonyRoutes` remain the **caller-facing** fallback; **Monitor/Debugger** paths are the **operator-facing** fallback — both are required; neither replaces the other.
4. **Not customer-configured:** Tenants do not own Twilio subaccount Debugger URLs or Alert polling; **Gateway ops / control plane** does (future admin surface may *display* derived status only).

### Implementation sequence (when built — no mandatory code in this doc revision)

| Step | Deliverable |
|------|-------------|
| **10a** | ✅ `POST /api/twilio/monitor/debug-event` — modular route; fail closed on bad signature; `TWILIO_WEBHOOK_SIGNATURE_BASE_URL` for proxy URL parity; log raw form + normalized + validation URL; fast `200`; ingestion-only; DB later |
| **10b** | ⏳ **Partial:** Debugger `error_code` → `failureClassId` via `twilio-debugger-error-code-hints.v0.yaml` (logged on normalize). **Remainder:** full normalization service, Alert shapes, severity scoring beyond Level |
| **10c** | **Policy engine (core):** retryable vs non-retryable, fail-open vs fail-closed, customer-visible vs internal-only, escalation thresholds — driven by `TWILIO_FALLBACK_POLICY_REGISTRY.md` |
| **10d** | **Fallback execution:** TwiML safe paths, degradation (e.g. voice → text where allowed), suppress duplicate retries, incident record |
| **10e** | Background job or on-demand script: list/fetch [Alerts](https://www.twilio.com/docs/usage/monitor-alert) filtered by `logLevel`; optional single-SID fetch for forensic request/response |
| **10f** | Twilio Console **Alarms** → HTTPS webhook → internal alerting (Pager / Slack / email) |
| **10g** | Optional: poll [Events](https://www.twilio.com/docs/usage/monitor-events) for security-relevant `resource_type` / `event_type` (e.g. voice geographic permission changes) |

**10a acceptance (peer-reviewed):** Signature validation uses the **exact** URL Twilio posted to (documented `TWILIO_WEBHOOK_SIGNATURE_BASE_URL` when TLS terminates before Node). **403** on invalid signature. **Raw form + normalized** correlation fields in structured logs; **no** downstream policy work in the handler (ingestion slice only).

**Current state:** **10a** Debugger ingestion is **live** (platform operator configures Console URL; see `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md`). **10b** has registry-backed **`failureClassId`** on normalized Debugger events; **10b–10g** otherwise backlog. Application logs + `createCallLog` + Twilio Console remain complementary.

## Pre-launch — Sovereign OS distribution (Phase 11)

**Gate:** Before treating the platform as **broadly self-deployable** by non-operators, complete the backlog in **`SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md`**.

Summary:

- **Four-container topology:** `os-gateway` (Node), `voice-engine` (Python sidecar), `llm-runtime` (Ollama), `edge-proxy` (Caddy or equivalent) for **automatic HTTPS** (Twilio requirement).
- **Two SKUs:** **Cloud-first** (~8 GB, local stacks stubbed or off) vs **Sovereign full** (16–32 GB for local Whisper + Kokoro + Ollama).
- **Go-to-market phases:** (A) **Compose from URL** in provider Docker Manager; (B) official **marketplace / partnership** listing once images and docs are stable.
- **Env prompts** for checkout flows must stay aligned with **`docs/SOVEREIGN_ENV_MANIFEST.md`** — no duplicate secret authority.

Root-level `docker-compose.vps.yml` (or equivalent) is **explicit engineering output** of this phase; existing `server/local-voice/sidecar/docker-compose.yml` is only the sidecar slice.

## Phase 4 — Next (ordered)

1. Derive or codegen `REGISTERED_VIEW_IDS` from `shared/canvasViewContract.ts`.
2. Align `skillDispatchRoutes` `z.enum` with implemented `skill-dispatch-registry.yaml` rows.
3. Logical route union: `LOGICAL_ROUTE_REGISTRY.md` ↔ `App.tsx` ↔ `AdminShell` / `adminNav.ts` ↔ os-core `SET_ROUTE` (table first, code adapters second).

## Phase 5 — Enforcement loop

- **Agent deployment contract:** PRs that change customer-facing agent behavior, tool gating, knowledge certification wiring, or deploy/readiness semantics MUST align with [`AGENT_DEPLOYMENT_CONTRACT_V1.md`](./AGENT_DEPLOYMENT_CONTRACT_V1.md). **Target state:** deploy-time or CI validation that **blocks** or **degrades** when mandatory sections fail or **blocking** proficiency probes fail (implementation incremental — spec is authoritative now).
- Required for registry-touched PRs: run **governance-linter** skill → **governance-review** skill before merge (human gate).
- CI: `npm run check`, `npm run validate:skill-identity`, `npm run validate:agent-capabilities`, `npm run governance:score` (warn → fail policy TBD).
- Identity binding changes: `npm run test:guest-tool-phone-binding` (no DB).
- Twilio Debugger normalize: `npm run test:twilio-debugger-normalize` (no DB).
- Twilio Debugger hints registry: `npm run test:twilio-debugger-hints-integrity` (YAML cross-reference).

## Hard rules

1. No new parallel source of truth without charter amendment.
2. Obey `.cursorrules` and lockdown `.mdc` files.
3. No scope expansion inside a phase without updating this document.

## Cursor operating prompt

Use the **corrected production prompt** from peer review (capabilities + compiled prompts + phased execution + governance obeyed). **Begin Phase 1 read-only** only when onboarding a new session without context; otherwise continue from **current phase** in this file.

## Related

- `REGISTRY_AUTHORITY_CHARTER.md`
- `AGENT_DEPLOYMENT_CONTRACT_V1.md` — customer-facing **deployed** agent contract (knowledge authority, tools, proficiency, enforcement)
- `AGENT_CAPABILITY_SPEC_V0.md`
- `registry-yaml/agent-capabilities/*.yaml`
- `TWILIO_RELIABILITY_ARCHITECTURE.md` / `TWILIO_ERROR_NORMALIZATION_SPEC.md` / `TWILIO_FALLBACK_POLICY_REGISTRY.md` / `registry-yaml/twilio-platform-failure-classes.v0.yaml` / `registry-yaml/twilio-debugger-error-code-hints.v0.yaml` / `docs/deployment/TWILIO_DEBUGGER_WEBHOOK_CHECKLIST.md`
- `SESSION_IDENTITY_BINDING_SPEC.md` — protected tools; trusted caller overrides model phone
- `SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md` — Phase 11; 1-click VPS / Docker before go-live
- `INTERNAL_AGENT_CREATION_DOCTRINE.md` (if present) / `AGENT_POLICY_REGISTRY.md`
