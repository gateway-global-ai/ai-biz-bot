# Nova Handshake Test — Setup Checklist

Use this so **Flight 001** reaches **"Target Status: 200 OK"** with no exceptions.

## 1. Project (this worktree)

- **Path:** This repo/worktree (must have `server/routes/novaSovereignRoutes.ts` and `scripts/nova-sovereign-handshake-test-flight-001.ts`).
- **Dependencies:** `npm install`

## 2. Doppler

- **Login:** `doppler login` in this directory (or set `DOPPLER_TOKEN` / `DOPPLER_TOKEN_DEV`).
- **Project/config:** Use the same Doppler project and config that has your app secrets (e.g. `dev`).

## 3. Secrets in Doppler

Add these to your Doppler config if missing:

| Secret | Purpose |
|--------|--------|
| `DATABASE_URL` | DB for `nova_idv_sessions` and app |
| `NOVA_RSA_PUBLIC_KEY` | PEM (server verifies Nova request signatures) |
| `NOVA_RSA_PRIVATE_KEY` | PEM (test signs requests) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Gmail / platform email |
| `PLATFORM_SENDER_EMAIL` | From address; also fallback test recipient |

**Generate Nova keys (if needed):**  
Run `./scripts/generate-nova-keys.sh`, then in Doppler paste the printed PEMs into `NOVA_RSA_PUBLIC_KEY` and `NOVA_RSA_PRIVATE_KEY`.

**Check:**  
`npm run nova-handshake:prereq` — lists any missing env vars.

## 4. Database

Create the Nova table (once per DB):

```bash
npm run db:migrate:nova
```

This runs `migrations/0009_nova_idv_sessions.sql`. If the table already exists, the migration is safe (IF NOT EXISTS).

## 5. Server

- **Must be this codebase** (Nova routes under `/api/nova`).  
- Start: `doppler run -- npm run dev`  
- Default port: 3004. Override with `PORT` in Doppler or env.  
- If something else is on 3004, stop it or set `PORT` and use `BASE_URL` when running the test (see below).

## 6. Run the test

```bash
npm run test:nova-handshake
```

Or: `./scripts/run-nova-handshake.sh`

**Optional:**  
- `BASE_URL=http://localhost:PORT` if the app is not on 3004.  
- `TEST_EMAIL=you@example.com` to receive the platform email (otherwise `PLATFORM_SENDER_EMAIL` is used).

## Success

You should see:

```
Target Status: 200 OK. Signature Valid. DB Updated. Email Sent. Invoice Generated. NO EXCEPTIONS.
```

## Common failures

| Symptom | Fix |
|--------|-----|
| `relation "nova_idv_sessions" does not exist` | Run `npm run db:migrate:nova` |
| `column "reseller_id" does not exist` (seed/admin) | Run `npm run db:migrate:resellers` |
| `Cannot POST /api/nova/billing/receive` (404) | Run the server from **this** repo so Nova routes are mounted. |
| `Missing required env: NOVA_RSA_*` | Add keys to Doppler; use `./scripts/generate-nova-keys.sh` then paste into Doppler. |
| Doppler "must specify a project" / "fallback file does not exist" | `doppler login` in this directory or set `DOPPLER_TOKEN` / `DOPPLER_TOKEN_DEV`. |
| Email `invalid_grant` | Fix `GOOGLE_SERVICE_ACCOUNT_JSON` and/or sender/recipient in Doppler (Gmail API / domain). |
