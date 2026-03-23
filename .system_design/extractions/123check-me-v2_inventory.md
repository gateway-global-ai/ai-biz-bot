# Clean-room inventory: `123check-me-v2.zip`

**Source:** `user_uploads/new/123check-me-v2.zip`  
**Extracted (quarantine):** `/tmp/_quarantine_extraction` — **incinerated after this report** per clean-room protocol.  
**Date:** 2026-03-22

This document is **read-only reconnaissance**. No code from the archive was merged into `server/`, `client/`, or routing.

---

## 1. Archive layout (high level)

| Path | Description |
|------|-------------|
| `123checkme-dashboard/` | React + Vite + shadcn UI: marketing pages, login/signup, dashboard, **ApiKeysPage**, verification playground, ID docs, signing |
| `mcp-server/` | Node MCP server calling Supabase Edge Functions as backend |
| `user_input_files/` | Sample travel app (Gemini/Twilio), logos, screenshots, **pasted architecture text**, nested zips |
| `secrets_check.json` | **Security artifact** — see §7 |
| `test-progress.md` | Test notes |

---

## 2. Flows (product)

### 2.1 Developer / ISV

1. Sign in (Supabase Auth implied by dashboard code).
2. **API Keys** (`ApiKeysPage.tsx`): create named keys via Edge Function `generate-api-key` with permissions:
   - `verification.read`, `verification.write`, `document.read`, `document.write`
3. Keys expose **prefix**, rate tier, last used, optional expiry; revoke via `revokeApiKey`.
4. Docs show **SDK-style** usage and `curl` to `https://api.123checkme.com/v1/verification/send` with `Authorization: Bearer YOUR_API_KEY`.

### 2.2 Verification (dashboard playground)

`VerificationPage.tsx`:

1. **Send:** `create-customer` → `send-verification` (channel: email | sms | whatsapp | messenger, purpose e.g. signup).
2. **Verify:** `verify-code` with `verification_code_id` + 6-digit code.

### 2.3 MCP integration (agents)

Tools: `create_customer`, `get_customer`, `send_verification`, `verify_code`, `resend_verification`, `upload_document`, `sign_document`, `generate_document`, `list_verifications`, `get_verification_status`.

**Customer model:** `platform_id` (caller’s ID) maps to internal `customer_id` UUID — **multi-tenant SaaS pattern**: ISV’s customer namespace is `platform_id`.

---

## 3. Multi-tenant SaaS (explicit)

| Mechanism | Evidence |
|-----------|----------|
| **API keys per developer account** | `ApiKeysPage` + `generate-api-key` + permission scopes |
| **Platform-scoped customer ID** | MCP `create_customer.platform_id` — “Your unique identifier for the customer” |
| **Backend** | Supabase Edge Functions + auth; not shipped in zip as SQL |
| **Blueprint doc** | `pasted-text-2025-12-01T03-38-10.txt` requires **tenant isolation model**, OAuth/RBAC, rate limits, idempotency, webhooks |

**Conclusion:** The archive models a **verification SaaS**: ISV holds API keys; end-users are **customers** with UUIDs; channels and codes hang off `customer_id`. Gateway **Nova Verify** today is **site-scoped** (`siteConfigId`, `guest_verification_sessions`) — different shape, not ISV-first.

---

## 4. Data / API sketches (from code + blueprint)

### 4.1 API key (dashboard)

```ts
interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit_tier: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}
```

### 4.2 MCP / Edge payloads (abbrev.)

- `CreateCustomer`: `platform_id`, optional `email` | `phone`, `name`, `metadata`
- `SendVerification`: `customer_id`, `channel`, `purpose`, `recipient`, `template_data?`
- `VerifyCode`: `customer_id`, `code` (6), `channel`

### 4.3 Blueprint schema (excerpt — aspirational)

- `customers` with `123check_me_platform_id`, channel tables (`email_channels`, `phone_channels`, …), `verification_codes` (hash, TTL, attempts), `documents`, audit — **full KYC/AML depth** beyond OTP.

---

## 5. UI patterns (reuse ideas only)

- **ApiKeysPage:** create/revoke/copy, code samples (JS/Python/curl), permission badges.
- **VerificationPage:** tabs Send / Verify, channel select, purpose select, dev code display if present.
- **Components:** `SignatureCanvas`, `IDDocumentUpload`, `RichTextEditor` for signing/ID flows.

**Gateway note:** NovaGate embedded mode already separates **canvas** styling; **do not** copy purple marketing chrome wholesale — align with `client/src/config/brand.ts` and APP_SHELL.

---

## 6. Explicit non-imports (do not merge)

- `123checkme-dashboard/App.tsx`, `vite.config.ts`, Supabase client wiring, Edge Function names as runtime deps without Gateway rewrite.
- MCP server **stdio** bridge — we have our own tool plane (`server/tools/*`).
- `user_input_files/travel-app/*` — duplicate Gemini/Twilio app; **ignore** for verification merge.

---

## 7. Security flags

1. **`mcp-server/src/index.ts`:** default `SUPABASE_URL` string embedded — **anti-pattern**; env-only in Gateway.
2. **`secrets_check.json`:** contains **entries resembling hashed secrets** (names like `SUPABASE_*`, `STRIPE_*`, etc.). **Do not paste values into repos.** Treat as **compromised if ever real** — rotate if this zip originated from production.
3. **`user_input_files/travel-app/.env.local`:** present in tree — **never commit** similar files.

---

## 8. Build notes

Per clean-room skill: **no** `npm install` or `pnpm build` was run in quarantine.

---

## 9. Quarry status

Quarantine directory `/tmp/_quarantine_extraction` **deleted** after authoring this file.
