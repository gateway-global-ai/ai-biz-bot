---
status: canonical
truth_domain: operations
enforced_by: none
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-28
---

# Platform capability milestones (M1 / M2)

## Purpose

Separate **provable governed execution** in a known environment (**M1**) from **browser entry sovereignty** (**M2**). Merging them delays a meaningful capability milestone because browser gateway work is still in progress.

| Milestone | Proves |
|-----------|--------|
| **M1** | The governed platform **executes** in a **verified** environment: readiness known, compile health, selected governed test battery, optional vertical/integration or manual voice evidence. |
| **M2** | **Law in code:** browser entry authority moves from client routing to the **governed API** path (resolver + gateway + audit). See [`BROWSER_GATEWAY_CONTRACT_V1.md`](./BROWSER_GATEWAY_CONTRACT_V1.md). |

**Principle:** Do **not** merge M1 and M2.

### Recommended sequencing (normative)

**1. Run and archive M1 first** — Establishes a defensible capability baseline before parallel implementation lanes.

- Execute the **minimum battery** (§ M1) plus capture **readiness JSON** and **`npm run check`**.
- **Archive** for the ticket or PR: command lines used, stdout/stderr or CI links, saved **`system:check -- --json`** (or path to artifact), and the **required summary block** (§ Required PR / ticket summary).
- **Manual Live voice notes** only if live voice is claimed.

**2. Operational rhythm (do not skip)** — Lightweight **daily** governance, heavy **M1-style** battery on a slower cadence.

- **Daily:** `doppler run -- npm run governance:daily` per [`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](./GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md) (cheap: readiness + work plan + `reportId` / `summaryCompact`).
- **Weekly or manual:** full **M1 battery** via `npm run governance:daily -- --run-m1-tests` **or** the individual M1 scripts — use for **milestone / regression** proof, not necessarily every night.

**3. One build lane after M1** — Do **not** open every lane at once (M1 evidence + M2 implementation + governance-daily Phase 2 persistence). Pick **one**:

| If the priority is… | Next implementation lane |
|---------------------|---------------------------|
| **Business proof** in a real vertical | **Cloudbeds / hospitality (or chosen vertical)** — governed demo path, integration evidence, operator runbooks. |
| **Platform routing sovereignty** is the immediate blocker | **M2** — resolver, thin `/canvas/*` loader, entry audit, resolver tests ([`BROWSER_GATEWAY_CONTRACT_V1.md`](./BROWSER_GATEWAY_CONTRACT_V1.md)). |

Default product recommendation when routing is **not** blocking: **vertical proof before M2 code**, while M2 remains **documented and ready**.

**4. Governance daily Phase 2 (persistence + read API)** — **Defer** until the product requires **“latest governance run” inside the app** (dashboards, swarm consumers, multi-host audit). File-based + cron remains sufficient until then ([`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](./GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md) § Phase 2).

---

## M1 — Governed execution (shippable)

### Acceptance statement

> **M1 is complete when the platform produces a valid readiness artifact, passes compile health, passes the selected governed test battery, and includes manual voice evidence only if live voice is claimed. Browser gateway sovereignty is documented but not yet product-enforced.**

### Minimum automated battery (smallest serious M1)

Run with secrets as required (`doppler run --` where scripts expect vault):

1. `doppler run -- npm run system:check -- --json`
2. `npm run check`
3. `npm run test:execution-mutation-gate`
4. `npm run test:execution-contract-registry`
5. `npm run test:cognition-contract`
6. `npm run test:voice-concierge-aptitude`

### Optional (only if in scope)

- **`npm run integration:readiness`** (or `:local`) — PMS / Cloudbeds / tenant integration evidence; **omit** if Cloudbeds/Boardwalk is not in scope so the milestone stays stable.
- **Manual browser Live QA** — only if you claim live voice; capture notes per [`GOVERNANCE_TEST_READINESS_V1.md`](./GOVERNANCE_TEST_READINESS_V1.md) (readiness + tests + manual narrative).

### M1 must **not** claim

- Sovereign browser entry is **shipped**
- `/canvas/*` is active as **sole** ingress
- Legacy routes (`/biz/:slug`, `/agent/:slug`) are **no longer** authoritative
- Browser Live is **proven** without a manual artifact
- Cloudbeds live integration is **proven** without integration readiness and/or demo evidence

### Required PR / ticket summary (one glance)

Attach or paste:

- **`overallStatus`** (from readiness JSON)
- **`provenance`** (at least environment / commit fingerprint as in JSON)
- **Selected test list** with **pass/fail** per script
- Any **blocked** / **degraded** catalog rows relied on
- **Manual notes**, if any (Live voice, Boardwalk, etc.)

---

## M2 — Browser entry sovereignty (separate milestone)

M2 is **not** “more M1 testing.” It **moves routing authority** to the API.

### Scope (see also [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) § Two planes)

- Resolver API — authoritative logical route, surface/view, tenant/site, initial state; URL segments are **hints**, not authority
- Thin `/canvas/*` loader — boot shell **only** from server-resolved payload
- Entry audit — correlation, `adapterSource` for legacy redirects
- Tests — including **resolver artifact tests from day one** (below)
- **`system:check` catalog** — add a row for gateway/resolver smoke when the npm script exists (`TEST_CATALOG` in `server/services/systemReadinessCore.ts`)

### M2 acceptance — resolver tests (required early)

Even before browser E2E (e.g. Playwright), include automated tests that prove:

- **URL hints are not authority** — client cannot substitute its own route resolution
- **Server returns** authoritative `logicalRouteId` / allowed surface / bootstrap state
- **Invalid entry** is **rejected deterministically** (stable error contract)

---

## Related

- [`GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md`](./GOVERNANCE_DAILY_OPERATIONS_SYSTEM_V1.md) — daily ops + Phase 2 persistence gate
- [`GOVERNANCE_TEST_READINESS_V1.md`](./GOVERNANCE_TEST_READINESS_V1.md) — three-artifact bundle, `system:check`
- [`SYSTEM_READINESS_CHECK_V1.md`](./SYSTEM_READINESS_CHECK_V1.md)
- [`BROWSER_GATEWAY_CONTRACT_V1.md`](./BROWSER_GATEWAY_CONTRACT_V1.md) — gateway invariant, audit, anti-patterns
- [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) — syscall vs browser plane
