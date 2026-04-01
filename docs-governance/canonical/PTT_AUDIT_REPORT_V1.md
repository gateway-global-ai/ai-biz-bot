---
status: canonical
truth_domain: governance
enforced_by: preflight-review-required.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-31
---

# PTT Control Plane Audit Report Spec v1

## Purpose

Define the validation scenarios that prove the PTT control plane loop is complete and governed. This is not a test suite — it is a system integrity proof. Each scenario validates one or more architectural invariants from `PTT_CONTROL_PLANE_CONTRACT_V1.md`.

## Output format

Each execution produces a `PTT_AUDIT_REPORT_V1.md` with pass/fail per plane:

```
Entry point integrity:      PASS | FAIL
Policy enforcement parity:  PASS | FAIL
Knowledge filtering:        PASS | FAIL
Tool gating:                PASS | FAIL
Canvas synchronization:     PASS | FAIL
Violation correctness:      PASS | FAIL
Coding agent jurisdiction:  PASS | FAIL
```

---

## Scenario 1 — Public entry (no auth)

**Route:** `/ptt/:domain/public`

**Validates:** Entry-point authority, L0 anonymous handling, tool scope

**Steps:**

1. Navigate to `/ptt/gateway/public`
2. Confirm no identity gate or splash renders
3. Confirm PTT runtime boots immediately with `actorClass: 'customer'`, `securityLevel: 'anonymous'`
4. Confirm only public tools are available (no admin/operator tools)
5. Attempt to save a background via voice — confirm identity gate triggers ("I need to set up your profile first")
6. Confirm no protected L2+ views are accessible without auth

**Pass criteria:**

- Entry-point resolves to `public_concierge_home` without auth
- Tool declarations include only public-allowed tools
- Save-as-default is identity-gated (agent requests OTP)
- No admin views render

---

## Scenario 2 — Splash entry

**Route:** `/ptt/:domain/public-splash`

**Validates:** Splash layer, staged entry, runtime boot after splash

**Steps:**

1. Navigate to `/ptt/hospitality/public-splash`
2. Confirm splash renders (branded intro / CTA)
3. Confirm PTT is not active until splash is dismissed
4. Dismiss splash (click CTA or wait for `auto_continue_seconds`)
5. Confirm runtime boots to same public state as Scenario 1

**Pass criteria:**

- Splash view renders before PTT runtime
- PTT turn is not possible during splash
- After dismissal, runtime behaves identically to `/public`

---

## Scenario 3 — Gated entry

**Route:** `/ptt/:domain/public-gate`

**Validates:** L0 identity authority, OTP flow, session binding, policy context creation

**Steps:**

1. Navigate to `/ptt/gateway/public-gate`
2. Confirm OTP form renders (not runtime)
3. Complete OTP verification
4. Confirm `customer_accounts` row is created/retrieved
5. Confirm session is bound with `actorClass`, `securityLevel`, `role`
6. Confirm runtime boots with full actor identity
7. Confirm menu shows L1 categories appropriate for role
8. Confirm admin/operator views are accessible for management role

**Pass criteria:**

- OTP is mandatory before runtime boot
- Session binding creates valid `PolicyDecision` context
- Actor class resolves correctly (customer vs management)
- Protected views become accessible after auth

---

## Scenario 4 — Voice turn -> canvas synchronization

**Validates:** PTT turn lifecycle, canvas sync covenant (Section 4 of contract)

**Steps:**

1. Enter via `/ptt/gateway/public` (anonymous)
2. Press PTT, say "Show me the constellation background"
3. Observe turn state transitions: `idle -> listening -> processing -> resolving -> rendering -> speaking -> idle`
4. Confirm `set_canvas_background` tool call is made
5. Confirm `CanvasBackgroundLayer` renders the constellation effect
6. Confirm speech grounding references the rendered effect (agent says "That's Constellation" while constellation is visible)
7. Confirm canvas render completes BEFORE speech grounding is sent

**Pass criteria:**

- Turn states transition in correct order (no skips)
- Canvas renders the correct background BEFORE agent narrates it
- Agent speech accurately describes what is on screen (no hallucinated view)
- Only one turn active at a time
- Audit record is persisted with `turnId`, `resolvedViewId`, `policyOutcome`

---

## Scenario 5 — Tool execution gating

**Validates:** Tool declaration scope, PolicyDecision enforcement, tool result integrity

**Steps:**

1. Enter as anonymous user
2. Request background categories via voice — confirm `get_background_categories` returns catalog
3. Request backgrounds in a category — confirm `get_backgrounds_in_category` returns items
4. Request to save background — confirm identity gate triggers (tool returns `requires_auth: true`)
5. Enter as authenticated admin
6. Confirm all canvas background tools are available
7. Confirm operator-only tools (if any) are available based on role

**Pass criteria:**

- Anonymous: catalog browse tools work, save is identity-gated
- Authenticated: all tools available per role
- No tool executes outside its declared scope
- Tool results include correct metadata for client rendering

---

## Scenario 6 — Knowledge filtering

**Validates:** Knowledge certification levels, source type filtering per PolicyDecision

**Steps:**

1. Enter with a site config that has mixed knowledge sources (trusted, unverified, external)
2. Make a voice query that would reference knowledge
3. Confirm only `allowedKnowledgeLevels` from `PolicyDecision` are used in speech grounding
4. Confirm unverified knowledge is not presented as authoritative
5. Confirm external knowledge is filtered per policy

**Pass criteria:**

- Knowledge items with certification level below threshold are excluded
- Speech grounding does not reference filtered knowledge
- Audit trail records which knowledge items were used/filtered

---

## Scenario 7 — Coding agent jurisdiction

**Validates:** Route authority hierarchy (L0-L4), `allowed_domains` enforcement, violation detection

**Steps:**

1. Create a coding intent that targets an L2 domain category (e.g., add a menu item)
2. Confirm `coding_agent` can propose changes within `allowed_domains`
3. Confirm review gate is required before promotion
4. Create a coding intent that targets L0 or L1 (e.g., modify identity or system menu)
5. Confirm the intent is rejected with appropriate violation code
6. Confirm `agent_orchestration_runs` row is created for all attempts
7. Confirm violation type is correctly categorized (`unauthorized_domain_access` for L0/L1 breach)

**Pass criteria:**

- L2-L4 intents proceed through orchestration with review gate
- L0-L1 intents are rejected immediately
- Violation codes are correct and distinct
- Orchestration runs are logged for all attempts (no `missing_orchestration_run`)

---

## Execution protocol

### Manual audit

Execute scenarios 1-5 manually against a running dev instance. Document each step with:

- Timestamp
- Action taken
- Expected result
- Actual result
- Pass/fail

### Automated audit (future)

Scenarios 1-5 can be automated via the browser-use MCP (navigate, interact, assert). Scenarios 6-7 require server-side test harness against the orchestration engine and knowledge filtering pipeline.

### Report location

```
docs-governance/artifacts/PTT_AUDIT_REPORT_<date>.md
```

### Frequency

- After any change to L0 or L1 artifacts
- After entry-point registry changes
- After tool declaration changes
- Before any production deployment
- On demand by architect

---

## Architectural invariants validated

| Invariant | Scenario |
|-----------|----------|
| PTT is the only ingress | 1, 2, 3 |
| Entry points are canonical | 1, 2, 3 |
| Identity is L0 authority | 3, 5 |
| System menu is L1 authority | 3, 7 |
| Canvas sync covenant holds | 4 |
| Tool execution is policy-gated | 5 |
| Knowledge is certification-filtered | 6 |
| Route authority hierarchy is enforced | 7 |
| Experience is free, persistence is identity-gated | 1, 5 |
| One active turn at a time | 4 |
| Speech grounding follows canvas state | 4 |
