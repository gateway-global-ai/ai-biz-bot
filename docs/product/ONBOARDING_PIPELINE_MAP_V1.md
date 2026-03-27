# Onboarding pipeline map — v1

**Purpose:** Factual map of **business onboarding** in the current codebase: live paths, ambiguous/legacy references, and archive-only context. Informs rebuilds without assuming every documented route is mounted or correct.

**Scope:** Client routes, modular server routes, and schema anchors. **Not** the target “correct” v2 architecture (follow-on doc).

**Related:** [`docs/sdk/ONBOARDING_PIPELINE_SKILL.md`](../sdk/ONBOARDING_PIPELINE_SKILL.md), [`.cursor/skills/sovereign-onboarding-pipeline/SKILL.md`](../../.cursor/skills/sovereign-onboarding-pipeline/SKILL.md).

**Target contract:** [`ONBOARDING_PIPELINE_TARGET_V1.md`](./ONBOARDING_PIPELINE_TARGET_V1.md) — *The map shows what is. The target defines what must be.*

**Customer readiness (LOCKED v1):** [`CUSTOMER_READY_V1.md`](./CUSTOMER_READY_V1.md) — `customer_ready_v1` keystone.

**Go-live graduation (LOCKED v1):** [`ONBOARDING_GO_LIVE_TRANSITIONS_V1.md`](./ONBOARDING_GO_LIVE_TRANSITIONS_V1.md) — exposure axes + transition rules.

**Classification key:**

| Label | Meaning |
|-------|---------|
| **production** | Mounted in [`client/src/App.tsx`](../../client/src/App.tsx) (or equivalent) and exercised on a normal happy path |
| **deprecated_ref** | Still referenced in code or docs; behavior or ordering may be outdated — verify before rebuilding |
| **archive_context** | `_legacy_archive/` or historical notes — read for context only; not runtime truth |

**Onboarding spine (this document must answer these three):**

1. Where **business identity** is first persisted.
2. Where **`siteConfigId` (UUID)** is assigned and returned.
3. Where **first customer interaction** becomes possible (public/agent/phone/QR).

---

## Current live entry points

| Entry | Route / surface | Client | Classification |
|-------|-----------------|--------|------------------|
| Public business onboarding | `/business` | [`BusinessPage.tsx`](../../client/src/pages/customer/BusinessPage.tsx) | **production** |
| Account: add business | `/my-account`, `/app/my-account` (Profile flow) | [`ProfileContent.tsx`](../../client/src/components/account/ProfileContent.tsx) | **production** |
| Reseller prospect | `/app/reseller` | [`ResellerDashboard.tsx`](../../client/src/pages/reseller/ResellerDashboard.tsx) | **production** |
| Platform admin (Places search) | `/platform/businesses` (and related) | [`PlatformBusinesses.tsx`](../../client/src/pages/admin/PlatformBusinesses.tsx) | **production** |
| Compliance / activation gate | `/compliance-gateway`, `/app/compliance-gateway` | [`OnboardingGateway.tsx`](../../client/src/pages/account/OnboardingGateway.tsx) | **production** |
| Public business page | `/biz/:slug` | [`PublicBusinessPage.tsx`](../../client/src/pages/public/PublicBusinessPage.tsx) | **production** |
| Agent page | `/agent/:slug` | [`AgentPage.tsx`](../../client/src/pages/agents/AgentPage.tsx) | **production** |
| Standalone phone UI | `/phone` | [`PhonePage.tsx`](../../client/src/pages/public/PhonePage.tsx) | **production** |

**Note:** **OnboardingGateway** (MSA / A2P / grace) is **production** but is a **parallel track** to Places-driven site creation — not the same funnel as `/business`.

---

## Current identity creation path

**Pattern:** Client collects `name`, optional `placeId`, `placeData` (or manual shapes), then calls **`POST /api/site-configs`**.

**Examples:**

- [`BusinessPage.tsx`](../../client/src/pages/customer/BusinessPage.tsx) — Places autocomplete, `/api/places/search` with grounding hint, manual profile `POST`.
- [`ProfileContent.tsx`](../../client/src/components/account/ProfileContent.tsx) — Places selection → `POST /api/site-configs` → optional `POST /api/customer/claim-business`.
- [`ResellerDashboard.tsx`](../../client/src/pages/reseller/ResellerDashboard.tsx) — `/api/places/search` → `POST /api/site-configs` for prospect.

**Server — canonical create:** [`server/routes/siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts) `POST /`:

1. `createSchema.safeParse(req.body)`.
2. If `placeId` and no `heroImageUrl`: set `heroImageUrl` from `/api/places/photo-proxy/...`.
3. **`slug = generateSlug(name)`** (deterministic base + random suffix).
4. **`await storage.createSiteConfig(data)`** — persists **`site_configs`** row.
5. **`runAgentSwarmProvisionOrchestrated({ siteConfigId, placeTypes, businessName, source: 'site_config_create' })`** — agent swarm; failures logged; **site row still exists**.
6. If `placeId` or `placeData`: **`preloadBusinessAndReviews(config.id)`** (async, non-blocking).

**Schema anchor:** `siteConfigs` (`shared/schema.ts` / Drizzle).

---

## Current `siteConfigId` assignment path

| Step | Location |
|------|----------|
| UUID assigned | Inside **`storage.createSiteConfig`** (insert); returned as **`config.id`** |
| Returned to client | **`201`** JSON body from `POST /api/site-configs` |
| Client handoff | e.g. navigate to `/agents?siteConfigId=…` ([`BusinessPage`](../../client/src/pages/customer/BusinessPage.tsx)); claim flow uses returned `id` ([`ProfileContent`](../../client/src/components/account/ProfileContent.tsx)) |

---

## Current first customer touch path

| Touch | Resolution | Notes |
|-------|------------|--------|
| Public concierge | `GET /api/site-configs/by-slug/:slug` on [`PublicBusinessPage`](../../client/src/pages/public/PublicBusinessPage.tsx) | Full viewport Concierge + hero; `?from=qr`, `?view=` deep links |
| Agent entry | `/agent/:slug` | [`AgentPage`](../../client/src/pages/agents/AgentPage.tsx) |
| Phone | `/phone` | Query params `siteConfigId` / `slug` per route contract in `App.tsx` |
| QR | Website slug QR and route-based shadow telecom | See [`.cursor/rules/qr-system.mdc`](../../.cursor/rules/qr-system.mdc); redirect often lands on `/biz/{slug}` |

**Behavior source of truth:** `site_configs` for the resolved site (slug, prompts, assigned agent, etc.) — not transient UI state.

---

## Places / search / enrichment (production touchpoints)

| API / behavior | Used from (examples) |
|----------------|----------------------|
| `POST /api/places/search` | [`BusinessPage`](../../client/src/pages/customer/BusinessPage.tsx), [`ResellerDashboard`](../../client/src/pages/reseller/ResellerDashboard.tsx), [`PlatformBusinesses`](../../client/src/pages/admin/PlatformBusinesses.tsx), [`StorefrontCategoryPage`](../../client/src/pages/storefronts/StorefrontCategoryPage.tsx) |
| Hero / photo proxy | Set on create when `placeId` present; [`PublicBusinessPage`](../../client/src/pages/public/PublicBusinessPage.tsx) fallback to photo-proxy |
| `preloadBusinessAndReviews(siteConfigId)` | After create (and on PATCH when place fields change) in [`siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts) |

---

## Deprecated / ambiguous references

| Topic | Classification | Notes |
|-------|----------------|--------|
| “Site create does not provision swarm” | **deprecated_ref** | **Current code** runs **`runAgentSwarmProvisionOrchestrated`** on `POST /api/site-configs` success; older docs/matrix text may predate this — re-verify any runbook |
| Single funnel for “onboarding” | **ambiguous** | **Places + site create** vs **OnboardingGateway compliance** are both production; product must name ordering and ownership |

---

## Archive-only context

- **`_legacy_archive/`** — **archive_context** only. Do not import. See [`.cursor/rules/legacy-archive-governance.mdc`](../../.cursor/rules/legacy-archive-governance.mdc).

---

## Mismatches / gaps / open questions

1. **Provision failures:** Site exists if DB insert succeeds; swarm may fail — is there a **required** user-visible “agents incomplete” state?
2. **Preload:** `preloadBusinessAndReviews` is async — define **“knowledge ready”** vs **“site live”** for marketing copy.
3. **Canonical entry:** Which path is **primary** for GA: `/business`, account, reseller, or admin?
4. **Compliance vs public QR:** Should **`/compliance-gateway`** complete **before** first shareable `/biz` link? (Policy + implementation alignment.)

---

## Rebuild candidates (input to target architecture doc)

- Single **spine diagram** documented in-repo: entry → `POST /api/site-configs` → slug → public resolve → first session.
- **Explicit state machine** for ops: `site_created` → `agents_provisioned` → `preload_finished` (or explicit failure) → `compliance` → `go_live`.
- **Telemetry** surfacing for provision + preload errors (beyond server logs).

---

## Blocked questions (product / legal / ops)

- **Activation date** for billing/grace: tied to OnboardingGateway “Let’s Talk” vs site create vs first inbound — needs contract owner.
- **QR go-live policy** when compliance is pending.

---

## Spine summary

| Anchor | Location |
|--------|----------|
| **Identity creation** | `POST /api/site-configs` → `storage.createSiteConfig` in [`siteConfigRoutes.ts`](../../server/routes/siteConfigRoutes.ts) |
| **`siteConfigId`** | UUID `config.id` in `201` response |
| **First customer touch** | `GET /api/site-configs/by-slug/:slug` → [`PublicBusinessPage`](../../client/src/pages/public/PublicBusinessPage.tsx); also `/agent/:slug`, `/phone`, QR → `/biz/...` |

---

## Document history

| Version | Date | Notes |
|---------|------|--------|
| v1 | 2026-03-25 | Initial map from codebase pass; refresh when routes or `POST /` side effects change |
