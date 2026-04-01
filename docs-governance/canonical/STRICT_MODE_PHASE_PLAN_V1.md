# AI OS — Strict Mode Phase Plan (v1)

**Status:** Canonical
**Depends on:** Core Locked Declaration (AI_OS_OPERATING_DOCTRINE_V1.md)
**Effective:** March 31, 2026

---

## Purpose

The enforcement model is complete. Every execution surface has a policy gate.
This document defines the phased escalation from **permissive** (warn + record)
to **strict** (throw + block) enforcement across the system.

Strict mode is not a feature toggle. It is a maturity indicator — each phase
represents a measurable increase in deterministic control.

---

## Phase definitions

### Phase 0: Audit Only (COMPLETED)

**Mode:** `audit_only`
**Scope:** CI batch scanning
**Behavior:** Silent record; no runtime impact
**Purpose:** Discover violations without breaking existing flows
**Exit criteria:** Violation inventory complete

### Phase 1: Permissive (CURRENT)

**Mode:** `permissive` (global default)
**Scope:** All surfaces
**Behavior:** `console.warn()` + record violations; no throws; no blocks
**Purpose:** Rollout enforcement without breaking production
**Exit criteria:**

- [ ] All mutation HTTP routes have `requirePolicy()` or documented exemption
- [ ] `executeContract()` bridges PolicyDecision for all tool calls
- [ ] `usePolicyEnforcement()` integrated in ConciergePanel
- [ ] Zero unregistered gates in secondary registries (drift warnings = 0)
- [ ] `npm run audit:policy-bypass` exits 0

### Phase 2: Strict on Protected Surfaces (ACTIVE)

**Mode:** `permissive` globally, `strict` on protected surfaces
**Scope:** Protected surfaces defined in `doctrineEnforcer.ts` STRICT_SURFACES
**Behavior:** Throw on violation for protected surfaces; warn elsewhere

**Protected surfaces (currently):**

| Surface | File prefix | Rationale |
|---------|------------|-----------|
| Mutation gate | `executionMutationGate` | Tool execution boundary |
| Policy middleware | `policyGate` | Enforcement mechanism itself |
| Site config | `siteConfigRoutes` | Business identity mutations |
| Agent system | `agentSystemRoutes` | Swarm configuration |
| Telephony | `telephonyRoutes` | Revenue-bearing infrastructure |
| Billing | `billingRoutes` | Financial mutations |
| Secure vault | `secureVaultRoutes` | Zero-LLM sensitive data |
| Business telephony | `businessTelephonyRoutes` | Paid number provisioning |
| Platform licenses | `platformLicenseRoutes` | License key management |
| Action registry | `action-registry` | OS-core authority |
| Policy registry | `policy-registry` | OS-core authority |

**Exit criteria:**

- [ ] All protected surface violations are caught and thrown
- [ ] No silent bypasses on protected paths
- [ ] Protected surface tests pass with strict mode
- [ ] Coverage: 100% of protected surface mutations gated

### Phase 3: Strict on All Core

**Mode:** `strict` for all server-side enforcement; `permissive` for client
**Scope:** All `server/` and `os-core/` paths
**Behavior:** Throw on any server-side doctrine violation

**Additions to strict set:**

- All `server/routes/*.ts` mutation handlers
- All `server/services/*.ts` that produce side effects
- Canvas control routes
- Knowledge routes
- Inquiry routes
- Chat routes
- Workspace routes

**Exit criteria:**

- [ ] `setDoctrineEnforcementMode("strict")` passes all server tests
- [ ] `npm run audit:policy-bypass` shows 100% coverage (0 bypasses)
- [ ] All gates in secondary registries exist in `policy-gates.yaml`
- [ ] `POLICY_ROLE_ALLOWLIST` legacy fallback is never triggered (registry-first covers all gates)
- [ ] WebSocket tool execution: 100% of `executeContract()` calls produce `policyDecision`

### Phase 4: Strict System-Wide

**Mode:** `strict` everywhere including client
**Scope:** All planes: HTTP, WS, client, canvas, CI
**Behavior:** Block unauthorized renders, throw on unauthorized actions

**Client enforcement changes:**

- `usePolicyEnforcement()` default mode → `strict`
- `isViewAllowed()` returns false → canvas shows fallback, not the requested view
- `isActionAllowed()` returns false → action blocked with structured message
- `filterMenuItems()` removes items not in server-provided surface
- `localAdminMode` bypass removed — admin controls require server-verified entitlements

**Exit criteria:**

- [ ] No client-rendered view exists outside `allowedViewIds`
- [ ] No menu item exists outside server-provided action surface
- [ ] `localAdminMode` removed or server-gated
- [ ] `GLOBAL_ADMIN_ROLES` client-side checks replaced with server entitlements
- [ ] CI: `npm run audit:policy-bypass --json` shows `coverage: 100`
- [ ] CI: doctrine violation count trending to zero

---

## Enforcement mode configuration

```typescript
// Phase 1 (current)
setDoctrineEnforcementMode("permissive");

// Phase 2 (active — protected surfaces auto-escalate)
// No code change needed — resolveEnforcementMode() handles it

// Phase 3
setDoctrineEnforcementMode("strict");

// Phase 4
// Client: usePolicyEnforcement({ enforcementMode: 'strict' })
// Server: setDoctrineEnforcementMode("strict");
```

---

## Measurement

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Mutation routes gated | ~30% | ~30% | 100% | 100% |
| Protected surfaces strict | 0 | 11 | All server | All |
| Client enforcement | None | None | None | Strict |
| CI exit on bypass | Yes | Yes | Yes | Yes |
| Drift warnings | Tolerated | Tolerated | Zero | Zero |
| Doctrine violations/week | Measured | Decreasing | Zero | Zero |

---

## Anti-regression rules

1. Once a surface enters strict mode, it never goes back to permissive
2. New surfaces default to the current phase's mode
3. Exemptions require a governance task with explicit rationale and expiry
4. The audit scanner runs in CI on every PR — `npm run audit:policy-bypass`
5. Coverage percentage is tracked and must not decrease between releases

---

*End of Strict Mode Phase Plan v1.*
