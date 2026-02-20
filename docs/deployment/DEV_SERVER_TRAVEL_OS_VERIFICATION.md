# Dev Server – Travel OS Sync & Verification Checklist

This document records the synchronization and verification steps for aligning the **aibizbot-dev.gatewayglobal.ai** environment with the Gateway Global Travel OS architecture (for GRN Connect demo: https://aibizbot-dev.gatewayglobal.ai/test-b2b).

---

## 1. Sync the Codebase

| Task | Status | Notes |
|------|--------|--------|
| `git pull origin main` | ⚠️ Partial | Run on the dev server where `.cursor/` is writable. Pull failed in this environment with: `unable to create file .cursor/DEPLOY_KEY.md: Read-only file system`. Merge from `main` may add `src/`, Multi-Agent Relay, B2B components, and `tests/simulate-travel-relay.ts`. |
| `npm install` | ✅ Done | Completed; 643 packages audited. No `dnd-kit` in current `package.json`—if main adds it, run `npm install` again after merging main. |

**Recommendation:** On the actual dev server (with writable `.cursor/`), run:

```bash
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
git pull origin main
npm install
```

---

## 2. Verify Environment Secrets

| Variable | Purpose | Where to set |
|----------|---------|----------------|
| `MOCK_TWILIO_SMS=true` | Initial testing without sending real SMS | `.env` (copy from `.env.example`; example now suggests `MOCK_TWILIO_SMS=true`) |
| `SERP_API_KEY` | B2B transactional loop – flights | `.env` (see `.env.example` B2B section) |
| `GRN_API_KEY` | B2B – GRN Connect hotel/grounding | `.env` |
| `NUITEE_API_KEY` | B2B – Nuitée hotel content | `.env` |

**.env:** Not committed; ensure a `.env` file exists on the dev server with the above keys. `.env.example` has been updated with a B2B section and `MOCK_TWILIO_SMS=true` for reference.

---

## 3. Architect Rules & thought_signature

| Task | Status | Notes |
|------|--------|--------|
| Read `.cursor/rules/architect.mdc` | ⚠️ N/A | File not present in this branch. If it exists on `main`, it will appear after merge. |
| Maintain `thought_signature` in `src/services/geminiService.ts` | ⚠️ N/A | No `src/services/geminiService.ts` in this repo layout; no `thought_signature` in codebase. If Travel OS uses this pattern on main, preserve it when merging or refactoring. |

Current rules under `.cursor/rules/`: `chat-ptt-requirements.mdc` (chat/PTT requirements only).

---

## 4. Backend Simulation (Travel Relay)

| Task | Status | Notes |
|------|--------|--------|
| Run `npx ts-node tests/simulate-travel-relay.ts` | ⚠️ N/A | No `tests/simulate-travel-relay.ts` in this branch. Likely added on `main` with Multi-Agent Relay. After merging main, run and verify: Master Orchestrator triggers Maps Specialist and SerpAPI Flights without losing reasoning state. |

---

## 5. B2B UI Verification

| Task | Status | Notes |
|------|--------|--------|
| Navigate to `/test-b2b` | ⚠️ N/A | No `/test-b2b` route in current client (`client/src/App.tsx`). Should be added with B2B components from main. |
| Agent Curation Panel: drag flight/hotel into itinerary, adjust commission (Markup Slider) | Pending | Depends on B2B UI and route. |
| Whitelabel Export from ItineraryCanvas; verify net rates obfuscated | Pending | Depends on B2B UI and export feature. |

---

## 6. Deployment Check (Port 3004)

| Task | Status | Notes |
|------|--------|--------|
| App runs on port 3004 | ✅ Configurable | Server uses `process.env.PORT` (default `5000`). To match `/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai` standard, set in `.env`: `PORT=3004`. `.env.example` now documents this. |

Start dev server:

```bash
PORT=3004 npm run dev
# or ensure .env contains PORT=3004 then:
npm run dev
```

---

## Summary

- **Done in this repo:** `npm install`, `.env.example` updated with `MOCK_TWILIO_SMS=true`, B2B keys (SERP, GRN, NUITEE), and PORT=3004 note.
- **Requires main branch (or merge):** `git pull origin main` (on a machine where `.cursor/` is writable), `architect.mdc`, `src/` layout, `thought_signature` in `src/services/geminiService.ts`, `tests/simulate-travel-relay.ts`, B2B UI and `/test-b2b` route.
- **On dev server:** Ensure `.env` exists with the variables above and `PORT=3004`; after merging main, run the relay test and verify https://aibizbot-dev.gatewayglobal.ai/test-b2b for the GRN Connect demo.
