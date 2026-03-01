# nova-handshake

Run the **Nova Sovereign Handshake Test (Flight 001)** from the **project root** of this worktree.

**Full setup checklist:** [docs/NOVA_HANDSHAKE_SETUP.md](../../docs/NOVA_HANDSHAKE_SETUP.md)

## One-time setup (if not done yet)

1. **Dependencies:** `npm install`
2. **Doppler:** `doppler login` (or set `DOPPLER_TOKEN` / `DOPPLER_TOKEN_DEV`).
3. **Nova RSA keys in Doppler:** Run `./scripts/generate-nova-keys.sh`, add printed PEMs to Doppler as `NOVA_RSA_PUBLIC_KEY` and `NOVA_RSA_PRIVATE_KEY`. Ensure Doppler also has `DATABASE_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `PLATFORM_SENDER_EMAIL`.
4. **Prereq check:** `npm run nova-handshake:prereq` — lists missing env vars.
5. **DB:** `npm run db:migrate:nova` (creates `nova_idv_sessions`).
6. **Server:** Start from **this** repo so `/api/nova` routes exist: `doppler run -- npm run dev` (port 3004).

## Run the test

`./scripts/run-nova-handshake.sh` or `npm run test:nova-handshake`. Optionally set `BASE_URL` or `TEST_EMAIL`.

**Success:** "Target Status: 200 OK. Signature Valid. DB Updated. Email Sent. Invoice Generated. NO EXCEPTIONS."

**Failure:** See [docs/NOVA_HANDSHAKE_SETUP.md](../../docs/NOVA_HANDSHAKE_SETUP.md) "Common failures" or run `npm run nova-handshake:prereq`.

# This command will be available in chat with /nova-handshake
