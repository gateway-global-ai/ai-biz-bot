# Verification API plane — implementation backlog

**Governance spec:** [`NOVA_VERIFICATION_GOVERNANCE.md`](NOVA_VERIFICATION_GOVERNANCE.md) §2  
**Status:** Core backlog items implemented (2026-03-22). Optional items remain.

---

## PR 1 — Schema + anchors

- [x] Add migration(s) for API key storage — [`migrations/0055_verification_installation_api_keys.sql`](../migrations/0055_verification_installation_api_keys.sql)
- [x] Update [`SCHEMA_ANCHOR_REGISTRY.md`](SCHEMA_ANCHOR_REGISTRY.md) — `verificationInstallationApiKeys`
- [x] Run `npm run db:migrate` in target environment.

## PR 2 — Modular HTTP API

- [x] [`server/routes/verificationApiV1Routes.ts`](../server/routes/verificationApiV1Routes.ts) — `POST /guest/start`, `POST /guest/complete`
- [x] [`server/routes/verificationInstallationKeysRoutes.ts`](../server/routes/verificationInstallationKeysRoutes.ts) — owner CRUD on `/api/site-configs/:id/verification-installation-keys`
- [x] Mount in [`server/routes.ts`](../server/routes.ts)
- [ ] Rate limits / idempotency keys (future hardening)

## PR 3 — Diagnostics

- [x] Comment in [`scripts/check-google-key-permissions.ts`](../scripts/check-google-key-permissions.ts) (Twilio-backed v1 routes)

## PR 4 — Owner / platform UI

- [x] [`client/src/pages/admin/PlatformSettingsPage.tsx`](../client/src/pages/admin/PlatformSettingsPage.tsx) — create / list / revoke; full key once + copy

## PR 5 — Docs & SDK (optional)

- [x] `curl` examples (below)
- [ ] Optional `client/src/sdk/` re-export for typed client — only if product requires.

### curl — remote OS (replace base URL and key)

```bash
export BASE=https://your-gateway.example.com
export KEY=gwv_...   # full key from Platform Settings after create

curl -sS -X POST "$BASE/api/v1/verification/guest/start" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","flowType":"guest_phone"}'

curl -sS -X POST "$BASE/api/v1/verification/guest/complete" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","code":"000000","sessionId":"<from start>"}'
```

(`X-API-Key: $KEY` is also accepted instead of `Authorization`.)

---

## Explicit non-goals for this backlog

- Importing 123check Supabase Edge Functions or MCP server code into the monolith.
- Embedding Twilio Account SID / Auth Token on remote machines.
