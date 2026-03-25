---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: true
  service: true
  route: true
last_verified: 2026-03-25
---
# NOVA Verification Governance

**Purpose:** Govern guest and owner verification behavior, map external reference designs (e.g. 123check inventory) to Gateway implementation, and define the **Verification API plane** for remote OS installs and ISV-style tenants.

**Transparency gate (always-on for verification HTTP):** Every passage through `POST /api/v1/verification/guest/*` and `POST /api/nova/guest/verify/*` is **logged** (including anonymous and failed auth) and **rate-limited** at the boundary — see [`VERIFICATION_GATE_TRANSPARENCY.md`](VERIFICATION_GATE_TRANSPARENCY.md).

**Caller ID vs OTP (hospitality):** Twilio **Caller Name / CNAM** on inbound PSTN — when the business enables it and the optional `caller_id_lookup` skill is on — is a **convenience signal** for greeting or CRM hints. It does **not** satisfy guest verification. **OTP** and `guest_verification_sessions` remain the gate for PMS guest journey and tools that expose guest-specific records — see [`AGENT_POLICY_REGISTRY.md`](AGENT_POLICY_REGISTRY.md) (Hospitality guest access).

**Inventory source:** [`../.system_design/extractions/123check-me-v2_inventory.md`](../.system_design/extractions/123check-me-v2_inventory.md)

---

## 1. Gap matrix: 123check (archive) vs Nova (Gateway)

| Area | Current platform (Nova / Gateway) | From 123check inventory | Decision |
|------|-----------------------------------|---------------------------|----------|
| **Guest OTP (hospitality / PMS)** | Twilio Verify (or dev bypass), `guest_verification_sessions`, `POST /api/nova/guest/verify/start` & `/complete`, [`server/services/novaGuestVerification.ts`](../server/services/novaGuestVerification.ts) | Dashboard: `create-customer` → `send-verification` → `verify-code`; multi-channel (email, SMS, WhatsApp, Messenger) | **Keep Gateway implementation.** Adopt **optional** UX copy patterns (tabs, channel labels) only via NovaGate / docs — not Supabase Edge Functions. |
| **Owner / NOVA IDV** | `/api/nova/verify/*`, `novaIdvSessions`, [`NovaGate`](../client/src/components/nova/NovaGate.tsx) claim/sign-in/billing | Full KYC blueprint (documents, cases, EDD) in pasted doc; dashboard pages: ID docs, signing | **Keep** owner flows on Gateway. **Defer** KYC depth unless a separate compliance project maps to schema anchors. |
| **Multi-tenant SaaS / ISV** | **Not first-class.** Verification is **site-scoped** (`siteConfigId`, skills on `siteConfigs.config`). No `platform_id` for arbitrary ISV customers. | **First-class in product shape:** API keys + permissions + `platform_id` → `customer_id` UUID; MCP tools; `api.123checkme.com/v1/...` style docs | **Build** per §2 (Verification API plane): tenant hierarchy, scoped keys, modular routes — **Gateway-native**, not imported runtime. |
| **Remote / installation API** | **Shipped:** `POST /api/v1/verification/guest/start` & `complete` with installation API key; key CRUD under `/api/site-configs/:id/verification-installation-keys` | Bearer API key + SDK docs in archive | **Keep** Gateway routes; manage keys in Platform Settings. |
| **Documents & e-sign** | Out of scope for current Nova guest service | `upload_document`, `sign_document`, `generate_document` in MCP | **Defer** to future anchor work (`documents` / compliance registry) unless product prioritizes. |
| **MCP for agents** | Platform tools in `server/tools/*`, Gemini orchestration | 123check MCP calls Edge Functions | **Do not merge** 123check MCP server; if needed, add **thin** Gateway tools that call **our** verification service only. |

**Principle:** Reuse **patterns** (key lifecycle, permission strings, idempotency ideas) from the inventory; **do not** merge foreign server code, Supabase URLs, or secrets.

---

## 2. Verification API plane (specification)

This section satisfies the **draft** for tenant anchors, API keys, route prefix, Twilio boundary, and governance alignment. Implementation tasks live in [`VERIFICATION_API_PLANE_BACKLOG.md`](VERIFICATION_API_PLANE_BACKLOG.md).

### 2.1 Tenancy model

| Layer | Role | Mapping (proposal) |
|-------|------|---------------------|
| Platform | Gateway Global AI | Operates Twilio, policies, audit |
| Account / reseller | Billing and onboarding scope | [`customerAccounts`](SCHEMA_ANCHOR_REGISTRY.md) |
| Site / business | Tenant of record for AI OS | [`siteConfigs`](SCHEMA_ANCHOR_REGISTRY.md) |
| ISV "customer" (optional) | External platform's end-user | Align with [`customers`](SCHEMA_ANCHOR_REGISTRY.md) **or** new anchor — **registry update required** before treating as canonical |
| Guest verification session | Short-lived proof | `guest_verification_sessions` (promote to registry when referenced in policies) |

**Hierarchy:** `platform → customerAccount → siteConfig → (optional) customers` for ISV-style data; API keys must declare **scope** (which `siteConfigId`(s) or account they may act on).

### 2.2 API keys

- **Storage:** hashed secret (e.g. SHA-256 of `prefix + secret`), `key_prefix` for display, `permissions[]`, `rate_limit_tier`, `expires_at`, `last_used_at`, `created_by`, `revoked_at`.
- **Permissions (examples):** `verification.guest.send`, `verification.guest.complete`, `verification.owner.read` — align with least privilege; mirror inventory strings only where useful (`verification.read` / `write`).
- **Issuance:** control-plane UI (owner or platform admin) — see backlog.
- **Remote OS:** receives **only** the key and Gateway base URL — **never** Twilio credentials.

### 2.3 Transport

- **Prefix:** `https://<gateway>/api/v1/verification/...` (HTTPS only).
- **Auth:** `Authorization: Bearer <api_key>` or `X-API-Key` (single convention per implementation PR).
- **Implementation:** new modular router under [`server/routes/`](../server/routes/) and **mount only** in [`server/routes.ts`](../server/routes.ts) (`app.use('/api/v1/verification', ...)`).
- **Idempotency / rate limits:** follow blueprint ideas; enforce per key + per site in application layer.

### 2.4 Twilio boundary

- All SMS/Verify calls remain in **server** (`novaGuestVerification`, Twilio helpers). **Remote systems** call Gateway APIs; Gateway sends OTP.

### 2.5 Governance

- Update [`SCHEMA_ANCHOR_REGISTRY.md`](SCHEMA_ANCHOR_REGISTRY.md) when new tables/anchors are added for API keys or ISV linkage.
- Prompt/runtime: verification copy remains out of raw UI — follow [`PROMPT_RUNTIME_GOVERNANCE.md`](PROMPT_RUNTIME_GOVERNANCE.md) for any user-facing text templates.
- **Permit diagnostics:** Google/Twilio checks in [`scripts/check-google-key-permissions.ts`](../scripts/check-google-key-permissions.ts) — new verification routes use **Twilio**, not Gemini; document in script header when routes exist (see backlog).

**Implementation backlog:** [`VERIFICATION_API_PLANE_BACKLOG.md`](VERIFICATION_API_PLANE_BACKLOG.md)

---

## 3. UI reference

- Nova embedded guest/owner: [`NOVA_VERIFY_UI_REFERENCE.md`](../docs/NOVA_VERIFY_UI_REFERENCE.md) (update when copy changes).
- Canvas: white content zone per APP_SHELL; no duplicate "NOVA Security" chrome in embedded mode.

---

## 4. Related code (Nova)

| Component | Path |
|-----------|------|
| Guest service | `server/services/novaGuestVerification.ts` |
| Guest routes | `server/routes/novaGuestVerifyRoutes.ts` |
| NovaGate | `client/src/components/nova/NovaGate.tsx` |
| PMS tool gate | `server/tools/cloudbedsSwarmTools.ts` (guest journey) |
