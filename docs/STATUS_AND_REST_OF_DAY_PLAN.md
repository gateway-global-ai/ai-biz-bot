# Status Check & Rest-of-Day Plan

**Date:** March 1, 2026  
**Scope:** Plans from this morning + end-to-end test (company → team of voice agents → Twilio).

---

## 1. Plans reviewed

### A. Workspace lifecycle follow-up plan  
**File:** `~/.cursor/plans/workspace_lifecycle_follow-up_a15e6d39.plan.md`

| Deliverable | Status | Notes |
|-------------|--------|--------|
| Doc: create-or-return sentence | **Done** | `docs/BUSINESS_ONBOARDING_PIPELINE.md` created (worktree); same content can live in main if desired. |
| State flip (demo → provisioned) | **Done** | In `server/services/agentProvisioning.ts` (main + worktree). |
| Guardrail Test A (create-or-return) | **Done** | `tests/test-guardrails.ts`; Test A passes on main (2 passed). |
| Guardrail Test B (provision idempotency) | **Partial** | Test exists but **skips on main** until `agents.siteConfigId` (and Concierge assignment) exist in main repo. |
| Doppler-or-fallback for db:migrate | **Done** | In worktree `package.json`; main repo still uses `doppler run --` only (optional to add fallback there). |

**Deferred (unchanged):** Partial unique index on `(owner_id, place_id)`; claim endpoint.

---

### B. Minimal schema + create-or-return safety (original patch set)

| Item | Status | Notes |
|------|--------|--------|
| Drizzle schema: workspaceState, claimedAt, createdByType | **Done** | `shared/schema.ts` (main + worktree). |
| Migration 0016 | **Done** | `migrations/0016_site_configs_workspace_lifecycle.sql` (main + worktree). Run `npm run db:migrate` on each env. |
| Storage: getUnclaimedSiteConfigByPlaceId | **Done** | `server/storage.ts` (main + worktree). |
| POST /api/site-configs create-or-return | **Done** | Uses getUnclaimedSiteConfigByPlaceId; 200 existing / 201 new (main + worktree). |
| Optional createSchema: workspaceState, createdByType, claimedAt | **Done** | `server/routes/siteConfigRoutes.ts` (main). |

---

### C. PTT and standardized chat interface (separate plan)

**File:** `.cursor/plans/ptt_and_chat_interface_fix.plan.md`

- **Status:** Not started this morning; independent of workspace lifecycle.
- **Content:** Home page should use standardized chat (resize + PTT), not legacy embed; remove/repurpose broken VoiceVisualizer; document requirements.
- **For rest of day:** Optional; can be scheduled after E2E company/team/Twilio test.

---

## 2. What’s complete vs what’s left

### Complete

- Workspace lifecycle schema + migration + storage + route + state flip (main repo).
- Create-or-return safety (unclaimed demo/provisioned only).
- Guardrail test script; Test A passing on main; FK fix for customer_accounts in test.
- Doc sentence in `docs/BUSINESS_ONBOARDING_PIPELINE.md` (worktree).

### Remaining / optional

- **Test B to run on main:** Requires adding `agents.siteConfigId` (and related idempotency/Concierge logic) to main repo if you want provision idempotency guardrail there.
- **Doppler fallback on main:** Add same `db:migrate` “Doppler or DATABASE_URL” pattern to main `package.json` if you want local migrate without Doppler.
- **PTT / chat plan:** Implement when you’re ready (separate from today’s E2E focus).

---

## 3. Rest-of-day plan: test company → team → Twilio

Goal: **One clear path** that (1) creates a company (site), (2) creates a team of voice agents, and (3) connects a Twilio phone number, with verification steps.

---

### 3.1 Where each piece lives

- **Create company (site):**  
  - **API:** `POST /api/site-configs` with `name`, `placeId` (optional), `placeData` (optional).  
  - Create-or-return: if placeId given and an unclaimed demo/provisioned workspace exists, returns 200 with that config; otherwise 201 with new config.
- **Create team of voice agents:**  
  - **API:** `POST /api/intelligence/provision` with `siteConfigId`, `placeTypes`, `businessName`.  
  - **Main repo:** Creates 6 agents from industry templates; **agents are not linked to site** (no `agents.siteConfigId` in main schema). No Concierge assignment to `site_configs.assignedAgentId`.  
  - **Worktree:** Same endpoint; agents have `siteConfigId`; Concierge is set on `site_configs.assignedAgentId`; `workspaceState` flips to `provisioned`.
- **Connect Twilio number:**  
  - **Per-agent:** Developer UI → Agent → Telephony: search by area code, provision number, then `PATCH /api/agents/:id` with `phoneNumber` and `phoneSid`.  
  - **Platform default:** Telephony config stores one default number (voice/SMS webhooks).  
  - **Site-level (if present):** Some flows use `site_configs.provisionedPhoneNumber` / `provisionedPhoneSid`; admin may have “provision number for site” (e.g. GatewayAdmin / provision-number). Check your deploy for which UI is enabled.

So for a **single E2E path** you can either:

- Use the **worktree** (has full create-site + provision + site-scoped agents + Concierge), or  
- Use the **main repo** and accept that agents are created but not linked to the site until you merge `agents.siteConfigId` and related logic.

---

### 3.2 Quick start (script)

With the app **already running** (e.g. `npm run dev` in another terminal):

```bash
npm run e2e:company-team
```

Optional env: `BASE_URL`, `E2E_BUSINESS_NAME`, `E2E_PLACE_ID`. The script creates (or returns) a site, provisions 6 agents, and prints the site config ID plus **next steps for connecting a Twilio number**.

---

### 3.3 Recommended E2E test flow (step-by-step)

**Prereqs**

- App running (e.g. `npm run dev` or `npm run serve` with Doppler/env).
- DB migrated (`npm run db:migrate`).
- Twilio: account SID, auth token, (optional) sub-account for multi-tenant. At least one number for voice/SMS or ability to search/provision.

**Step 1 — Create company (site)**

1. **Option A (UI):** If your client has “Create site” or “Create AI team” (e.g. worktree BusinessPage: pick place → confirm → creates site + provisions agents):
   - Open the business/onboarding page.
   - Select a business (place).
   - Trigger “Create AI team” / equivalent.  
   This typically does: resolve place types (if present) → `POST /api/site-configs` → `POST /api/intelligence/provision`.
2. **Option B (API only):**
   ```bash
   # Create or return site (use a real or test placeId if you have one)
   curl -X POST http://localhost:5000/api/site-configs \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Business","placeId":"ChIJ_TEST_OR_REAL_PLACE_ID"}'
   ```
   Save `id` from response (e.g. `SITE_CONFIG_ID`).

**Step 2 — Create team of voice agents**

1. If you used Option A above, the team may already be created (6 agents). Skip to Step 3.
2. If you used Option B:
   ```bash
   curl -X POST http://localhost:5000/api/intelligence/provision \
     -H "Content-Type: application/json" \
     -d '{"siteConfigId":"SITE_CONFIG_ID","placeTypes":["establishment"],"businessName":"Test Business"}'
   ```
   Expect `agentsCreated` (6 on first call; 0 on repeat if idempotent).

**Step 3 — Verify agents and Concierge (worktree or after main has site-scoped agents)**

- **Worktree / site-scoped:**  
  - `GET /api/site-configs/:id/agents` (if implemented) to list agents for the site.  
  - `GET /api/site-configs/SITE_CONFIG_ID` and confirm `assignedAgentId` is set (Concierge).
- **Main (no siteConfigId yet):**  
  - List agents via your admin/agent list API and confirm 6 exist; Concierge assignment on site won’t be present until you add the worktree provisioning logic to main.

**Step 4 — Connect Twilio number**

1. **Per-agent (recommended for “voice agent”):**
   - Open Developer → Agent Telephony (or equivalent).
   - Select the Concierge (or any) agent.
   - Search numbers by area code (e.g. `POST /api/telephony/numbers/search` or `/api/twilio/numbers/available` with `areaCode`).
   - Provision a number (e.g. `POST /api/telephony/numbers/provision` with `phoneNumber`).
   - Update agent: `PATCH /api/agents/AGENT_ID` with `phoneNumber` and `phoneSid` from provision response.
2. **Default platform number:**  
   - If your app uses a single default Twilio number from telephony config, set that in env or admin so voice/SMS webhooks point to your server.

**Step 5 — Sanity checks**

- Call the Twilio number: expect voice webhook to be hit (and agent to respond if routing is wired).
- Send SMS to the number: expect SMS webhook and any opt-out handling you have.
- In the client: open the business/site page and use chat/voice; confirm Concierge (or assigned agent) is used when `assignedAgentId` is set.

---

### 3.3 Checklist for “rest of day”

- [ ] **Env:** App + DB + Twilio credentials; migration 0016 applied.
- [ ] **Create company:** One site created (UI or `POST /api/site-configs`); note `siteConfigId`.
- [ ] **Create team:** `POST /api/intelligence/provision`; confirm 6 agents; on worktree confirm `assignedAgentId` and `workspaceState=provisioned`.
- [ ] **Connect Twilio:** One number provisioned and linked to an agent (or to default config); webhooks configured.
- [ ] **Voice:** Place a test call to the number; confirm webhook and behavior.
- [ ] **SMS:** Send test SMS; confirm webhook and behavior.
- [ ] **Guardrails:** Run `npm run test:guardrails`; expect Test A pass; note Test B skip on main until agents.siteConfigId is merged.

---

### 3.5 If something fails

- **Create-or-return returns 201 every time:** Normal if you use a new placeId each time or if the only existing row is claimed. Use same placeId twice with no claimed workspace to see 200.
- **Provision fails (500):** Check industry_agent_templates and DB (migration 0013); check logs for constraint/insert errors.
- **Agents not linked to site:** Expected on main until `agents.siteConfigId` and provisioning updates are merged from worktree.
- **Twilio webhook not hit:** Check `voiceUrl`/`smsUrl` on the number; ensure base URL is reachable from Twilio (ngrok or public URL).

---

## 4. Summary

- **Workspace lifecycle and create-or-return:** Implemented and merged to main; Test A passing; Test B skipped on main until schema/provisioning alignment.
- **Rest of day:** Use the E2E flow above to test “company → team of voice agents → Twilio” on your chosen codebase (worktree for full behavior, main for current production-like path), and run the guardrail script to confirm create-or-return safety.
