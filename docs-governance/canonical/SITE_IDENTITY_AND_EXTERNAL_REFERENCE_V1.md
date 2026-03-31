---
status: canonical
truth_domain: schema
enforced_by: scripts/check-site-identity-governance.ts, tests/test-site-identity-boardwalk-resolver.ts
backed_by:
  schema: true
  service: partial
  route: partial
last_verified: 2026-03-30
---
# Site Identity and External Reference (V1)

## Purpose

This document is the **canonical identity contract** for Gateway Global AI: what counts as internal business/site identity versus external vendor or third-party references. It exists to prevent **Google Place ID**, **PMS property IDs**, and other foreign keys from being mistaken for **platform identity**.

**Hard rule (scope resolution):**

> **Platform ID in, external ID out. Never the reverse for scope resolution.**

Internal routes, authorization scope, routing scope, durable ownership, and cross-subsystem joins **must** anchor on **`site_configs.id`** (Gateway UUID). External identifiers are loaded **after** that scope is established, used only to talk to the right external system, and persisted **under** the Gateway UUID — never the other way around for business scope.

---

## Canonical site identity rule

**`site_configs.id`** is the **sole authoritative internal identifier** for a business / site / workspace in Gateway Global systems.

External identifiers, including but not limited to:

| Kind | Role |
|------|------|
| Google Place ID | Non-canonical **locator** for Google Places / Maps APIs; may drift |
| Cloudbeds (and other PMS) property ID | **Vendor-scoped** foreign identifier |
| Stripe customer / account IDs | Payment vendor reference |
| Twilio SIDs | Telecom vendor reference |
| CRM / marketing vendor IDs | Integration reference |

These are **reference attributes only**. They may be stored, indexed for lookup, and used when communicating with external systems. They **do not** define internal identity, authorization scope, routing scope, or durable business ownership inside the platform.

---

## Forbidden patterns

The following are **prohibited** in production and normal operator flows:

- Using **`place_id`** (or any external ID) as a **surrogate** for `site_configs.id`
- Helpers that **silently** resolve “the site” from Google ID without an explicit **migration-only** label, env gate, and warning
- **API parameters** that accept `placeId` **where business scope** (auth, tenancy, site-scoped mutation) **is intended** — use `siteConfigId` (or resolve server-side from session), then load `place_id` from storage if a Google call is needed
- **DB uniqueness or join semantics** that imply Google (or any vendor) **owns** business identity
- Documentation, comments, prompts, or tests that describe Google Place ID or vendor property ID as **“stable identity”** or **canonical business key**

---

## Allowed patterns

- Accept **`siteConfigId`** (Gateway UUID) on internal routes and scripts intended as **normal** operators
- Load the row from `site_configs`, read stored **`place_id`** (or other external fields) from that row
- Call Google (or vendor) APIs with those stored references **only when needed**
- Persist enrichment results keyed by **`site_configs.id`**

---

## Transitional exception (migration / debug only)

A **temporary** resolver may use an external identifier **only** to **discover** the canonical `site_configs.id` during migration or one-off repair. All of the following must hold:

1. The code path is **explicitly named** (e.g. `*MigrationShim*`, `*LegacyGooglePlaceId*`) or lives under **allowlisted** migration scripts documented in [`scripts/check-site-identity-governance.ts`](../../scripts/check-site-identity-governance.ts)
2. **`NODE_ENV === 'production'`** must **not** use this shim for routine behavior (shim returns `null` in production unless a separate break-glass process is approved and documented)
3. Non-production use requires **`GOVERNANCE_LEGACY_GOOGLE_PLACE_ID_LOOKUP=1`** (see [`.env.example`](../../.env.example))
4. Every invocation **must** emit a **loud warning** (fixed prefix `[GOVERNANCE][MIGRATION-ONLY]`)
5. A **documented removal target** applies: **`2026-12-31`** (extend only by explicit governance revision)

When the shim returns a UUID, **all subsequent logic** must treat that value as **`site_configs.id`** only — not “Google resolved, therefore Google is truth.”

---

## Type and naming discipline

Prefer unmistakable names in new code:

| Concept | Name |
|---------|------|
| Gateway site primary key | `SiteConfigId` (UUID string; branded type in [`shared/siteIdentity.ts`](../../shared/siteIdentity.ts)) |
| Google Places resource id | `GooglePlaceId` (string; not a platform scope key) |
| Cloudbeds property | `CloudbedsPropertyId` (vendor string; not internal identity) |

Do not pass a `GooglePlaceId` where a `SiteConfigId` is required without an explicit conversion at a **governed** boundary (DB load or migration shim).

---

## Repo-check policy (enforcement)

**Script:** `npm run validate:site-identity`

**Behavior:**

- Scans a defined set of paths for **suspicious patterns** (e.g. business-scope route params named `placeId`, undocumented `getSiteConfigByPlaceId` usage outside storage/migration)
- Maintains an **allowlist** for legitimate cases (storage layer, migration scripts, governed shims)
- Exits non-zero on **new** violations (CI / local governance gate)

**Related tests:** `npm run test:site-identity` (resolver + policy invariants)

This check is **not** a substitute for code review; it blocks **accidental** regression into place-id-first architecture.

---

## Related documents

- [`CONTEXT_KEYS.md`](./CONTEXT_KEYS.md) — `siteConfigId` as core context key
- [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md) — `siteConfigs` anchor
- [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) — route context requirements
