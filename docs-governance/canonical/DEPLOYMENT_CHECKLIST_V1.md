# AI OS Core — Production Deployment Checklist (v1)

**Status:** Canonical
**Depends on:** Core Locked Declaration, Docker Extraction Manifest v1
**Effective:** March 31, 2026

---

## Purpose

This checklist gates every deployment of the AI OS Core. No deployment ships
without every required item verified. The system is governed — the deployment
process must be governed too.

---

## Pre-build verification

### 1. Registry integrity

- [ ] `registry-yaml/policy-gates.yaml` parses without error
- [ ] All gates referenced in `actions.yaml` exist in `policy-gates.yaml`
- [ ] All gates referenced in `logical-routes.yaml` exist in `policy-gates.yaml`
- [ ] All gates referenced in `views.yaml` exist in `policy-gates.yaml`
- [ ] Drift warnings = 0 (`policyGateCatalog` boot check)

### 2. Policy enforcement audit

- [ ] `npm run audit:policy-bypass` exits 0
- [ ] Coverage percentage >= previous release (never decreases)
- [ ] No new BYPASS routes without documented exemption
- [ ] All exemptions have a rationale in the scanner's EXEMPTIONS map

### 3. Contract validation

- [ ] `PolicyDecisionSchema` parses sample decisions without error
- [ ] `DOCTRINE_VIOLATION_CODES` array matches doctrine document
- [ ] All factory functions (`allowDecision`, `denyDecision`, `escalateDecision`, `degradeDecision`) produce valid schema output
- [ ] `@gateway/contracts` package exports match `shared/policyDecisionContract.ts`

### 4. Doctrine enforcement

- [ ] `doctrineEnforcer.ts` STRICT_SURFACES set includes all protected paths
- [ ] Protected surfaces throw on violation (strict mode verified in tests)
- [ ] No `resolveEnforcementMode()` returns "permissive" for listed strict surfaces

### 5. Test suite

- [ ] Policy decision flow tests pass (31/31 or current count)
- [ ] Integration registry validation passes
- [ ] Onboarding contract hash validation passes
- [ ] Agent aptitude tests pass (if applicable to this release)

---

## Build verification

### 6. Build output

- [ ] `npm run build` completes without error
- [ ] `dist/index.mjs` exists and is a valid Node.js module
- [ ] `dist/public/` contains HTML entry point and JS bundles
- [ ] No source maps leak secrets or internal paths in production build

### 7. Container build

- [ ] Docker image builds without error
- [ ] `registry-yaml/` is present in the image at expected path
- [ ] `migrations/` is present in the image
- [ ] `node_modules/` contains only production dependencies
- [ ] Image size is reasonable (track and alert on >2x growth)

---

## Pre-deployment verification

### 8. Environment

- [ ] `DATABASE_URL` configured (Doppler or Secret Manager)
- [ ] `GEMINI_API_KEY` in Secret Manager (not in image, not in env file)
- [ ] `GEMINI_MODEL_ID` set in Doppler (not hardcoded)
- [ ] All required Twilio credentials in Doppler
- [ ] `NODE_ENV=production`

### 9. Database

- [ ] Target database is accessible from deployment environment
- [ ] Migrations tested against a staging database first
- [ ] No destructive migrations without explicit approval
- [ ] Backup taken before migration run

---

## Deployment verification

### 10. Boot sequence

- [ ] Container starts and connects to PostgreSQL
- [ ] Migrations run successfully
- [ ] Registry YAML loads without error
- [ ] Policy gate catalog builds (no missing YAML)
- [ ] Drift detection produces 0 warnings
- [ ] Health endpoint responds: `GET /api/health` → 200

### 11. Smoke tests

- [ ] Public chat endpoint responds: `POST /api/website-chat`
- [ ] Canvas control responds: `POST /api/canvas-control`
- [ ] WebSocket upgrade succeeds: `/ws/gemini-live`
- [ ] Policy gate denies unauthenticated access to protected gate
- [ ] Policy gate allows authenticated access to permitted gate

### 12. Voice path (if applicable)

- [ ] `/ws/gemini-live` WebSocket connects and proxies to Gemini
- [ ] Audio frames flow bidirectionally
- [ ] Tool calls execute through `executeContract()` with `PolicyDecision`
- [ ] No `1006` WebSocket close loops in logs

---

## Post-deployment verification

### 13. Monitoring

- [ ] Policy decision logs flowing (`[PolicyGate]` prefix in structured logs)
- [ ] Mutation gate metrics flowing (`mutation_gate.*` events)
- [ ] No `DoctrineViolation` warnings in logs (or expected count for current phase)
- [ ] Error rate within acceptable threshold
- [ ] Latency within acceptable threshold (voice: sub-150ms mouth-to-ear target)

### 14. Audit trail

- [ ] `audit_events` rows being created for executed actions
- [ ] PolicyDecision `decisionId` traceable in logs
- [ ] No orphaned actions (every action has a corresponding policy decision)

---

## Rollback criteria

Immediately rollback if:

1. Boot fails (migrations, registry load, or health check)
2. Voice path produces `1006` loops
3. Policy gate returns 500 instead of structured 403
4. `executeContract()` bypasses PolicyDecision (doctrine violation in logs)
5. Error rate exceeds 5x baseline within 15 minutes of deployment
6. Any `DOCTRINE_VIOLATION_DIRECT_EXECUTION` on a strict surface

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| System Architect | | | |
| Platform Engineer | | | |
| Security Review | | | |

---

*End of Deployment Checklist v1.*
