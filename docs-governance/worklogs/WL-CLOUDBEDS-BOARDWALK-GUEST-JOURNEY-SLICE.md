---
status: active
truth_domain: operations
owner: platform
last_verified: 2026-03-28
---

# Worklog: Boardwalk guest journey / reservation summary (governed vertical slice)

**Goal:** One end-to-end **Concierge → `pms_lookup_guest_journey`** story, fully demonstrable with readiness proof, smoke, one focused test, and demo artifacts — without expanding to booking writes, housekeeping, or M2 browser gateway.

**Canonical capability:** `cb_guest_journey_lookup` → tool `pms_lookup_guest_journey`.

---

## Phase A — Environment truth (no code)

| Step | Command / action | Artifact |
|------|------------------|----------|
| A1 | `doppler run -- npm run system:check -- --json` | Save JSON; note `overallStatus`, `criticalBlockers` |
| A2 | `doppler run -- npm run integration:readiness` | Confirm Boardwalk `site_configs` + `site_pms_integrations` row (`pms_type=cloudbeds`, creds, `propertyId`) |
| A3 | `doppler run -- npm run governance:daily` (optional) | Daily envelope + `reportId` for the same day |

**Boardwalk constants:** `scripts/setup-boardwalk-suites.js` (`BOARDWALK_SUITES`), skill [`.cursor/skills/cloudbeds-hospitality/SKILL.md`](../../.cursor/skills/cloudbeds-hospitality/SKILL.md).

---

## Phase B — Smoke existing spine (before edits)

| Step | Command | Notes |
|------|---------|--------|
| B1 | `doppler run -- npm run test:cloudbeds` | Today exercises **availability** (`fetchCloudbedsAvailability`) + optional direct API — **not** guest journey. Still validates DB row + auth path. |
| B2 | If guest journey smoke is missing, add **only** after Phase D test (see below) — do not duplicate broad HTTP mocks without governance review. |

---

## Phase C — Trace the governed path (read-only audit)

Execute in order; do not change behavior until gaps are listed.

| # | File | What to verify |
|---|------|----------------|
| C1 | [`registry-yaml/integration-capabilities/cloudbeds.v1.yaml`](../../registry-yaml/integration-capabilities/cloudbeds.v1.yaml) | `cb_guest_journey_lookup` → `pms_lookup_guest_journey` |
| C2 | [`registry-yaml/integration-adapters/cloudbeds.v1.yaml`](../../registry-yaml/integration-adapters/cloudbeds.v1.yaml) | `handler_entry: pms_lookup_guest_journey` |
| C3 | [`server/config/geminiToolDeclarations.ts`](../../server/config/geminiToolDeclarations.ts) | `pms_lookup_guest_journey` declaration + args |
| C4 | [`server/config/operationalModes.ts`](../../server/config/operationalModes.ts) | Tool allowed for concierge / relevant modes |
| C5 | [`server/services/cloudbedsApi.ts`](../../server/services/cloudbedsApi.ts) | `cloudbedsGetJson`, `loadCloudbedsPmsRow`, capability / broker headers for `cb_guest_journey_lookup` |
| C6 | [`server/tools/cloudbedsSwarmTools.ts`](../../server/tools/cloudbedsSwarmTools.ts) | `handlePmsLookupGuestJourney` — OTP gate, `getReservations`, journey classification, return shape |
| C7 | [`server/services/toolHandler.ts`](../../server/services/toolHandler.ts) | Case `pms_lookup_guest_journey` → `resolveBoundPhoneForGuestTools` → handler |
| C8 | [`server/services/guestToolPhoneBinding.ts`](../../server/services/guestToolPhoneBinding.ts) | PSTN / voice phone binding for guest tools |
| C9 | [`server/routes/cloudbedsRoutes.ts`](../../server/routes/cloudbedsRoutes.ts) | OAuth / owner routes — **not** primary path for model tool (tool path is handler); note `CB_CAPABILITY_GUEST_JOURNEY` if used |

**Registry gate:** `npm run validate:integration-registry` after any YAML change.

---

## Phase D — One proving test (surgical)

**Location:** add `tests/test-cloudbeds-guest-journey-handler.ts` (or under `tests/` alongside other tool smoke tests).

**Scope (pick one style):**

1. **Unit-style:** Import `handlePmsLookupGuestJourney` and mock `cloudbedsGetJson` / `loadCloudbedsPmsRow` to return a fixed reservation row with a matching phone → assert `success`, `journey`, `reservations.length`, and failure path when API returns non-OK.
2. **Contract-only:** Zod or snapshot on **exported** return type shape for `success: true` (if exports need adjustment, keep surface minimal).

**Must include:**

- Happy path: normalized `journey` ∈ `GuestJourneyKind`
- Failure: no PMS row / API error message surfaced (no secret leakage)

**Avoid:** live Cloudbeds HTTP in CI unless you already have secrets + stable sandbox policy.

**package.json:** add `"test:cloudbeds-guest-journey": "npx tsx tests/test-cloudbeds-guest-journey-handler.ts"` and add to [`server/services/systemReadinessCore.ts`](../../server/services/systemReadinessCore.ts) `TEST_CATALOG` when stable.

---

## Phase E — Voice / canvas demo checklist (manual)

| # | Check |
|---|--------|
| E1 | Hospitality site with Boardwalk `siteConfigId` in session |
| E2 | Concierge operational mode allows `pms_lookup_guest_journey` |
| E3 | Phone: use verified flow if `siteRequiresOtpForGuestPmsLookup` — [`novaGuestVerification`](../../server/services/novaGuestVerification.ts) |
| E4 | Tool result appears in chat; **pinned canvas** only via `/api/canvas-control` per execution plan — inline ToolRouter is OK for legacy display |
| E5 | Short notes: URL, time, journey enum, screenshot or redacted JSON snippet |

---

## Phase F — Demo artifact bundle (for ticket / PR)

- [ ] `system:check` JSON (or excerpt): `overallStatus`, `provenance`
- [ ] `integration:readiness` stdout (Boardwalk line)
- [ ] `npm run check` clean
- [ ] `test:cloudbeds` result (smoke path)
- [ ] New `test:cloudbeds-guest-journey` result (when added)
- [ ] Manual demo notes (E5)
- [ ] Optional: redacted `governance_daily_report.json` `summaryCompact`

---

## Explicitly out of scope for this worklog

- `post_reservation` / booking writes
- Full Housekeeping + Dashboard in the same sprint
- M2 `/canvas/*` browser gateway implementation
- New Cloudbeds endpoints beyond what `cb_guest_journey_lookup` already uses

---

## Related

- [`PLATFORM_CAPABILITY_MILESTONE_V1.md`](../canonical/PLATFORM_CAPABILITY_MILESTONE_V1.md) — M1 + sequencing
- [`INTEGRATION_GRAPH_DISCIPLINE.md`](../canonical/INTEGRATION_GRAPH_DISCIPLINE.md)
- [`GOVERNANCE_TEST_READINESS_V1.md`](../canonical/GOVERNANCE_TEST_READINESS_V1.md)
