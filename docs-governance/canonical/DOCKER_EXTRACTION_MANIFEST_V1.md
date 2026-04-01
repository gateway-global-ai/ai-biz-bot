# AI OS Core — Docker Extraction Manifest (v1)

**Status:** Canonical
**Depends on:** Core Locked Declaration, Strict Mode Phase Plan v1
**Effective:** March 31, 2026

---

## Purpose

This manifest defines exactly what ships in the AI OS Core Docker container.
The system is now safe to package because authority is no longer split —
every execution surface converges on a single decision system.

---

## Container architecture

```
┌─────────────────────────────────────────────────────┐
│  AI OS Core Container                                │
│                                                      │
│  dist/index.mjs          ← Node.js server bundle     │
│  dist/public/            ← Vite-built client assets   │
│  registry-yaml/          ← Single-authority registries │
│  migrations/*.sql        ← Database schema            │
│  scripts/run-migration.ts ← Migration runner          │
│  node_modules/           ← External dependencies      │
│                                                      │
│  Environment: Doppler / Secret Manager               │
│  Database: PostgreSQL (external or sidecar)           │
│  Ports: 3000 (HTTP + WS)                             │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Runtime server (REQUIRED)

**Build output:** `dist/index.mjs` — esbuild bundle of `server/index.ts`

Includes (bundled):

| Component | Source | Ships as |
|-----------|--------|----------|
| Express server + routes | `server/index.ts`, `server/routes.ts`, `server/routes/*.ts` | Bundled in `dist/index.mjs` |
| Policy middleware | `server/middleware/policyGate.ts` | Bundled |
| Mutation gate + policy bridge | `server/services/executionMutationGate.ts` | Bundled |
| Intent loop resolver | `server/services/intentLoopResolver.ts` | Bundled |
| Policy merge | `server/services/intentLoopPolicyMerge.ts` | Bundled |
| Site runtime resolver | `server/services/siteRuntimeResolver.ts` | Bundled |
| Canvas control plane | `server/services/canvas*.ts` | Bundled |
| Surface derivation | `server/services/surfaceDerivationService.ts` | Bundled |
| Policy gate catalog bridge | `server/os-core-bridge/policyGateCatalogBridge.ts` | Bundled |
| Site scoped access | `server/utils/siteScopedAccess.ts` | Bundled |
| Voice pipeline (frozen) | `server/geminiVoice.ts`, `server/voiceStream.ts`, etc. | Bundled |
| Shared contracts | `shared/*.ts` | Bundled |

**External dependencies (not bundled):** `node_modules/` for esbuild externals
(socket.io, socket.io-client, sharp, and other native modules).

---

## Layer 2: Client assets (REQUIRED)

**Build output:** `dist/public/` — Vite build of `client/`

| Content | Source |
|---------|--------|
| HTML entry | `client/index.html` |
| JS bundles | `client/src/**` (compiled) |
| CSS | Tailwind + component styles |
| Static assets | `client/public/` (worklets, favicons) |
| Policy enforcement hook | `client/src/hooks/usePolicyEnforcement.ts` (compiled) |

**Not shipped as source** — only the compiled output in `dist/public/`.

---

## Layer 3: Registry YAML (REQUIRED — runtime dependency)

The server reads these at boot from `process.cwd()`. They MUST be present
in the container at the expected relative path.

| File | Authority |
|------|-----------|
| `registry-yaml/policy-gates.yaml` | **Single gate authority** — policyGateCatalog reads this |
| `registry-yaml/actions.yaml` | Action definitions + requiredPolicy references |
| `registry-yaml/views.yaml` | View definitions + policyGate references |
| `registry-yaml/logical-routes.yaml` | Logical route definitions |
| `registry-yaml/modes.yaml` | Operational modes |
| `registry-yaml/agent-policies.yaml` | Agent policy declarations |
| `registry-yaml/ui-elements.yaml` | UI element registry |
| `registry-yaml/skill-dispatch-registry.yaml` | Skill dispatch mappings |
| `registry-yaml/agent-classification-policy/*.yaml` | Swarm classification rules |
| `registry-yaml/swarm-schematics/*.yaml` | Swarm member blueprints |
| `registry-yaml/agent-capabilities/*.yaml` | Agent capability declarations |
| `registry-yaml/domain-sensitivity/manifest.v1.yaml` | Domain sensitivity rules |
| `registry-yaml/integration-capability-sets.yaml` | Integration graph |
| `registry-yaml/workspace-mcp-actions/manifest.v1.yaml` | Workspace MCP actions |

**Rule:** The full `registry-yaml/` tree ships. No partial extraction.

---

## Layer 4: Database migrations (REQUIRED)

| Path | Purpose |
|------|---------|
| `migrations/*.sql` | ~90 ordered SQL migrations |
| `scripts/run-migration.ts` | Migration runner (`npm run db:migrate`) |

**Startup sequence:** Migrations run before the server binds ports.

---

## Layer 5: Governance docs (OPTIONAL — audit artifact)

| Path | Purpose |
|------|---------|
| `docs-governance/canonical/AI_OS_OPERATING_DOCTRINE_V1.md` | System invariants + Core Locked declaration |
| `docs-governance/canonical/STRICT_MODE_PHASE_PLAN_V1.md` | Enforcement escalation roadmap |
| `docs-governance/canonical/DOCKER_EXTRACTION_MANIFEST_V1.md` | This document |
| `docs-governance/canonical/DEPLOYMENT_CHECKLIST_V1.md` | Production deployment checklist |

Include in the image if policy requires audit artifacts to ship with deployments.

---

## Layer 6: Scripts (CI/operational)

| Script | Purpose | Required in image? |
|--------|---------|-------------------|
| `scripts/run-migration.ts` | DB migrations | Yes |
| `scripts/audit-policy-bypass.ts` | Policy enforcement audit | CI only |
| `scripts/validate-onboarding-contract-hash.ts` | Contract hash validation | CI only |
| `scripts/validate-integration-registry.ts` | Integration registry validation | CI only |

---

## What does NOT ship

| Excluded | Reason |
|----------|--------|
| `_legacy_archive/` | Deprecated code quarantine |
| `client/legacy-ui-reference/` | Deprecated UI reference |
| `client/src/` (raw source) | Only compiled `dist/public/` ships |
| `server/` (raw TS source) | Only compiled `dist/index.mjs` ships |
| `os-core/src/` (raw TS source) | Bundled into `dist/index.mjs` where imported |
| `user_uploads/` | Runtime user data, not application code |
| `.cursor/` | IDE configuration |
| `docs-governance/archive/` | Archived governance docs |
| `tests/` | Test files |
| `node_modules/` (dev deps) | Only production deps ship |

---

## Dockerfile sketch

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/registry-yaml ./registry-yaml
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts/run-migration.ts ./scripts/run-migration.ts
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.mjs"]
```

---

## Startup sequence (container)

1. Load environment (Doppler / Secret Manager in prod)
2. Connect PostgreSQL
3. Run migrations (`npm run db:migrate`)
4. Load `registry-yaml/` — validate integrity
5. Load `policy-gates.yaml` → build gate catalog
6. Drift detection: validate secondary registries reference only known gates
7. Fail boot if registry validation fails in `NODE_ENV=production`
8. Bind HTTP (Express) + WebSocket servers on port 3000
9. Health endpoints available: `/api/health`, `/api/health/ready`

---

## Invariants for the container

1. `registry-yaml/` must be present at `process.cwd()` relative path
2. `DATABASE_URL` must be set (Doppler or env)
3. `GEMINI_API_KEY` must come from Secret Manager, never baked into image
4. No model ID hardcoded — `GEMINI_MODEL_ID` from environment only
5. Boot fails if migrations fail
6. Boot fails if registry validation fails
7. The policy gate catalog loads before the first request is served

---

*End of Docker Extraction Manifest v1.*
