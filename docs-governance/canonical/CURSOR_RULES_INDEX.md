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
# Cursor Rules Index — Tiered Governance Map

## Purpose

This document maps **Tier 2** Cursor rules ([`.cursor/rules/*.mdc`](../.cursor/rules)) to **governance pillars** so agents resolve "rule fragmentation" without merging everything into one file. **Tier 1** is the root [`.cursorrules`](../.cursorrules) (Sovereign Core). **Tier 3** is [`docs-governance/`](./) (policy source of truth).

**Count:** 36 `.mdc` files (plus [`SKILL.md`](../.cursor/rules/SKILL.md) permit helper in the rules folder).

| Pillar | Role |
|--------|------|
| **Core OS** | Mission, control plane, review gates, filesystem, imports, legacy archive |
| **Registry & Routing** | Logical routes, views/actions, schema anchors, modular routes, QR |
| **Agent & Runtime** | Policies, provisioning, execution plane, prompts, handover, protected chat internals |
| **Voice & Audio** | Voice lockdown, Clear Voice audio ops, PTT/chat physical contract |
| **UI & Brand** | Jason Standard, sovereign UI, brand tokens, app shell, assets |
| **Secrets & Platform** | API lockdown, Doppler/GitHub bridge, env signatures, DB migrations |
| **Specialized** | CMO agent, R3F backgrounds, Gemini model discipline |

---

## Full registry

| File | `alwaysApply` | Scope (`globs`) | Primary pillar | Governance doc(s) |
|------|---------------|-----------------|----------------|-------------------|
| `platform-mission.mdc` | yes | — | Core OS | Platform mission / S4 |
| `ai-os-control-plane.mdc` | yes | — | Core OS | `SYSTEM_MANIFEST.md` |
| `preflight-review-required.mdc` | yes | — | Core OS | `GOVERNANCE_REVIEW_ENGINE.md` |
| `file-system-governance.mdc` | yes | — | Core OS | `FILE_SYSTEM_GOVERNANCE.md` |
| `import-discipline.mdc` | yes | — | Core OS | `IMPORT_DISCIPLINE_MATRIX.md` |
| `legacy-archive-governance.mdc` | yes | — | Core OS | `SCHEMA_ARCHAEOLOGY.md` (archive ref) |
| `logical-route-registry.mdc` | yes | — | Registry & Routing | `LOGICAL_ROUTE_REGISTRY.md` |
| `view-and-action-registry.mdc` | yes | — | Registry & Routing | `VIEW_REGISTRY.md`, `ACTION_REGISTRY.md` |
| `schema-anchor-registry.mdc` | yes | — | Registry & Routing | `SCHEMA_ANCHOR_REGISTRY.md` |
| `integration-graph-discipline.mdc` | yes | — | Registry & Routing | `INTEGRATION_GRAPH_DISCIPLINE.md`, `INTEGRATION_CAPABILITY_GRAPH_SPEC_V1.md` |
| `modular-routing.mdc` | yes | `server/routes.ts`, `server/routes/**` | Registry & Routing | Monolith ban in `.cursorrules` |
| `qr-system.mdc` | no | QR routes/services + public/admin pages | Registry & Routing | QR / site_configs |
| `agent-policy-registry.mdc` | yes | — | Agent & Runtime | `AGENT_POLICY_REGISTRY.md`, `SAFE_MODE_CONTRACT.md` |
| `teams-agents-provisioning-matrix.mdc` | yes | — | Agent & Runtime | Provisioning / agents |
| `execution-plane-boundary.mdc` | yes | — | Agent & Runtime | `EXECUTION_PLANE_BOUNDARY_SPEC.md` |
| `prompt-runtime-governance.mdc` | yes | — | Agent & Runtime | `PROMPT_RUNTIME_GOVERNANCE.md` |
| `handover-protocol.mdc` | yes | site config routes, storage, Concierge | Agent & Runtime | Handover / UPA |
| `architect.mdc` | yes | `geminiService`, `agentConfig` (paths in file) | Agent & Runtime | Integrity guardian |
| `sovereign-voice-lockdown.mdc` | yes | — | Voice & Audio | Voice protected file list |
| `clear-voice-ops.mdc` | no | `server/services/audio/**`, worklets | Voice & Audio | Audio enhancement patterns |
| `sovereign-chat-lockdown.mdc` | yes | chat widgets, Concierge, etc. | Voice & Audio / Chat | Chat layout contract |
| `chat-ptt-requirements.mdc` | no | WebsitePreview, BusinessPage, chat components | Voice & Audio / Chat | PTT / layout cycle |
| `jason-standard.mdc` | yes | `client/src/**`, Tailwind, index.css | UI & Brand | Jason Standard |
| `sovereign-ui-lockdown.mdc` | no | `client/src/**` | UI & Brand | UI design system |
| `brand-tokens.mdc` | yes | `client/src/**` | UI & Brand | `brand.ts` / shell zones |
| `app-shell-contract.mdc` | no | App.tsx, AppShell, ContextBar | UI & Brand | `APP_SHELL_CONTRACT.md` |
| `ai-design-studio.mdc` | no | `gateway-sdk-manifest.yaml`, Design Studio paths, spec | UI & Brand | `AI_DESIGN_STUDIO_GOVERNED_SPEC_V1.md`, `gateway-sdk-manifest.yaml` |
| `hero-image-no-compress.mdc` | no | hero asset paths | UI & Brand | Asset quality |
| `threejs-backgrounds.mdc` | no | `**/*.tsx` | Specialized | R3F backgrounds |
| `sovereign-twilio-lockdown.mdc` | yes | — | Secrets & Platform | Twilio / SMS compliance |
| `api-lockdown.mdc` | yes | server routes, secretManager, client | Secrets & Platform | BFF / keys |
| `github-doppler-bridge.mdc` | no | `.github`, doppler scripts, env docs | Secrets & Platform | Sovereign DevOps |
| `doppler-cli.mdc` | no | doppler/ecosystem scripts | Secrets & Platform | Doppler usage |
| `env-example-signature.mdc` | no | `.env.example` | Secrets & Platform | Naming constitution |
| `db-migrations.mdc` | yes | migrations, schema, scripts | Secrets & Platform | DB migrations |
| `create-cmo-agent.mdc` | no | `server/**` | Specialized | CMO tier-2 agent |
| `gemini-3-flash.mdc` | yes | — | Specialized | `GEMINI_MODEL_ID` / Interactions API |
| `SKILL.md` (in `.cursor/rules`) | — | — | Secrets & Platform | Permit check script |

---

## Sentinel skills (umbrellas)

High-level entry points under [`.cursor/skills/`](../.cursor/skills/) link here; deep procedural content remains in existing skill folders.

| Sentinel | Pillar coverage | See |
|----------|-----------------|-----|
| Sovereign Voice Architect | Voice + audio + Live bridge docs | `sovereign-voice-architect/SKILL.md` |
| Registry Governance Expert | Routes, views, schema, QR | `registry-governance-expert/SKILL.md` |
| Knowledge Engineering Lead | KAP, audit plane, governance review, data | `knowledge-engineering-lead/SKILL.md` |
| Sovereign DevOps Sentinel | Doppler, GitHub, migrations, permits | `sovereign-devops-sentinel/SKILL.md` |
| Technical debt triage | `tsc` classification, v1 relevance, YAML + MD reports (no auto-fix) | `technical-debt-triage/SKILL.md` |
| Governance linter | Alignment / drift vs plans, rules, skills, docs; emits `docs/governance/` alignment artifacts | `governance-linter/SKILL.md` |
| Governance review | GOVERNANCE_REVIEW_AGENT: Phase 1 artifact preflight (PF-*); Phase 2 approve / conditional / reject / escalate | `governance-review/SKILL.md` |
| Archive governance | Post-review unmount, `quarantine/`, deprecation notes, registry updates | `archive-governance/SKILL.md` |

---

## Related

- [`GOVERNANCE_EXECUTION_PLAN_V1.md`](./GOVERNANCE_EXECUTION_PLAN_V1.md) — **Phased governance execution (source of truth)**; **Runtime Trust Parity** milestone (Phase 3 QA + PSTN binding + Twilio 10a); **Phase 10** reliability plane
- [`TWILIO_RELIABILITY_ARCHITECTURE.md`](./TWILIO_RELIABILITY_ARCHITECTURE.md) — Telecom-grade Twilio subsystem + **vendor telemetry discovery** rule for skills/integrations
- [`TWILIO_ERROR_NORMALIZATION_SPEC.md`](./TWILIO_ERROR_NORMALIZATION_SPEC.md) / [`registry-yaml/twilio-platform-failure-classes.v0.yaml`](../../registry-yaml/twilio-platform-failure-classes.v0.yaml) — platform failure `class_id` vocabulary
- [`TWILIO_FALLBACK_POLICY_REGISTRY.md`](./TWILIO_FALLBACK_POLICY_REGISTRY.md) — policy dimensions and fallback actions
- Twilio refs: [Alerts](https://www.twilio.com/docs/usage/monitor-alert), [Events](https://www.twilio.com/docs/usage/monitor-events), [Debugger webhook](https://www.twilio.com/docs/usage/troubleshooting/debugging-event-webhooks), [Alarms](https://www.twilio.com/docs/usage/monitor-alarms)
- [`SESSION_IDENTITY_BINDING_SPEC.md`](./SESSION_IDENTITY_BINDING_SPEC.md) — trusted session ANI overrides model identity for protected tools (`guestToolPhoneBinding.ts`)
- [`PSTN_VOICE_TOOL_PARITY_PATH_B.md`](./PSTN_VOICE_TOOL_PARITY_PATH_B.md) — Runtime Trust Parity B: minimal PSTN tool loop blueprint (post–QA; `voiceStream.ts` only under voice governance task)
- [`SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md`](./SOVEREIGN_OS_DISTRIBUTION_BACKLOG.md) — **Phase 11** pre-launch: 1-click VPS Docker (gateway, voice sidecar, Ollama, TLS proxy)
- [`REGISTRY_AUTHORITY_CHARTER.md`](./REGISTRY_AUTHORITY_CHARTER.md) — Canonical vs derived registry authority
- [`AGENT_CAPABILITY_SPEC_V0.md`](./AGENT_CAPABILITY_SPEC_V0.md) — Agent capability schema (v0)
- [`KNOWLEDGE_PLAN_ORCHESTRATOR.md`](./KNOWLEDGE_PLAN_ORCHESTRATOR.md) — KAP / certification
- [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) — Safe Mode + Phase 5B
- [`VOICE_PHASE_5D_BRIDGE.md`](./VOICE_PHASE_5D_BRIDGE.md) — Voice certification bridge
