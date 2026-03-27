# Legacy Audit and Migration Guide

## 1. Purpose

This document is the **Do Not Touch** quarantine list for the Gateway Global AI OS. Any coding agent building new sales agents, swarms, or funnel workflows **must** consult this document to ensure they do not import, extend, or wire into legacy systems.

**Canonical build path for AI OS agents:**

- `server/services/agentProvisioning.ts` (DB-backed provisioning)
- `buildBehavioralPrompt` (or equivalent prompt compiler entry points) from **parameterized** roles (DISC, ARCH, stability dials, registry fragments)

**Agents are not created by:**

- Writing inline system prompts in application code
- Using in-memory `Map` structures for agent or swarm state
- Calling the Gemini SDK with hardcoded model strings

This file is the firewall between the old world and the governed OS. Treat every quarantined path as **read-only for audit** until a governed migration removes it.

---

## 2. CRITICAL: `server/agents/` (Entire Directory — QUARANTINED)

This directory implements a **parallel in-memory swarm system** that directly conflicts with:

- The AI OS prompt compiler and fragment stack
- DB-backed agent provisioning and auditability
- Context and governance registries (CGR-aligned patterns)

### Why It Must Be Replaced

| Artifact | Problem |
|----------|---------|
| `swarm-manager.ts` | In-memory `Map`s for agent state — no durable persistence, no governed context keys, no audit trail |
| `default-templates.ts` | Large inline system prompts (hundreds of lines) — violates `docs-governance/PROMPT_RUNTIME_GOVERNANCE.md` |
| `specialized-agents.ts` | Hardcoded prompts (e.g. SWOT-style agents) — same governance violation |
| `agent-routes.ts` | Overlaps with `agentSystemRoutes.ts` — **dual API surface**, risk of divergent behavior |
| `ai-bizbot-consultant.ts` | Uses `ai-gateway` with a `GEMINI_MODELS` map instead of `process.env.GEMINI_MODEL_ID` — violates env-only model selection |

### Files in `server/agents/` (11 total)

- `index.ts`
- `agent-types.ts`
- `agent-routes.ts`
- `swarm-manager.ts`
- `default-templates.ts`
- `specialized-agents.ts`
- `business-research.ts`
- `ai-cmo-agent.ts`
- `businessAnalyst.ts`
- `ai-bizbot-consultant.ts`
- `agent-testing.ts`

### Migration Path

1. Extract recoverable business logic from each template into **YAML skill manifests** (or governed registry artifacts), not TypeScript string blobs.
2. Map legacy prompt behaviors to **DISC / ARCH / stability dial** parameter ranges and compiler inputs.
3. Create or align **`industry_agent_templates`** (and related) DB rows via existing provisioning flows (`provisionAgentsForBusiness`, etc.).
4. Remove all imports and route registration that depend on `server/agents/`.
5. Delete the `server/agents/` directory once nothing references it.
6. Remove `registerAgentRoutes` (or equivalent) from `server/routes.ts` after modular replacement is mounted and verified.

---

## 3. Legacy Services (17 Files — Needs Review)

These live under `server/services/` unless noted. Status is **audit-first**; deletion or replacement must preserve production paths until traffic is migrated.

### Placeholder Stubs (Safe to Delete After Call-Site Audit)

| File | Behavior |
|------|----------|
| `intelligenceService.ts` | Returns static placeholder SWOT-style output — not real intelligence |
| `audioAnalysis.ts` | Fixed neutral values — no real prosody analysis |
| `discAnalysis.ts` | Fixed DISC estimation — no real analysis |

Confirm zero remaining imports before removal.

### Hardcoded Model Violations

| File | Issue |
|------|--------|
| `geminiService.ts` | Hardcoded fallback such as `gemini-2.0-flash` — violates env-only model rule. Heavily used by BI-style paths; **replace** with an env-driven wrapper aligned to `GEMINI_MODEL_ID`. |
| `sageIngestService.ts` | Direct `@google/generative-ai` usage with hardcoded model |
| `parsePlanService.ts` | Direct SDK with default model string |
| `demo-enrichment.ts` | Direct SDK parallel to the governed compiler — consolidate or gate |

### VLM (Voice Lead Machine) Stack — Separate Product

These services implement outbound / prospecting workflows distinct from core concierge. Do not wire new OS sales funnels through them without an explicit product decision.

| File | Role |
|------|------|
| `vlm-google-maps.ts` | Prospect discovery |
| `vlm-email-enrichment.ts` | Website scraping for emails |
| `vlm-website-analyzer.ts` | Website quality scoring |
| `vlm-quality-scoring.ts` | Lead quality heuristics |
| `vlm-csv-export.ts` | CSV export |
| `vlm-outbound-caller.ts` | Twilio outbound calls |
| `vlm-auto-agent.ts` | VLM campaign orchestration |

### Misplaced Script

| File | Issue |
|------|--------|
| `seed-knowledge-base.ts` | Operational seeding script living under `services/` — should live under `scripts/` (or a governed tooling package) |

---

## 4. Orphan Routes (4 Files — Compliance Risk)

Modular route files that are **imported** but **not** mounted create silent dead code and can hide production-critical behavior (especially SMS compliance).

### HIGH PRIORITY: `server/routes/twilioWebhooks.ts`

- Contains **compliance-critical** opt-out / opt-in SMS handling.
- If imported in `server/routes.ts` but **never** attached with `app.use()`, inbound STOP/HELP flows may not run — **Sev-1 compliance risk**.

**Action:** Verify mount status in the running app; mount with correct middleware and path prefix as defined by Twilio configuration.

### Lower Priority — RESOLVED

All four orphan routes were mounted in Commit 1 (Tourniquet):

| File | Mount Path | Status |
|------|-----------|--------|
| `twilioWebhooks.ts` | `app.use(twilioWebhooks)` — full path in route | **MOUNTED** |
| `a2pPreflightRoutes.ts` | `app.use('/api/a2p/preflight', a2pPreflightRoutes)` | **MOUNTED** |
| `demoEligibilityRoutes.ts` | `app.use('/api/demo/check-eligibility', demoEligibilityRoutes)` | **MOUNTED** |
| `placesImageRoutes.ts` | `app.use('/api/places/generate-image', placesImageRoutes)` | **MOUNTED** |

---

## 5. Schema Deprecation Candidates (`shared/schema.ts`)

`shared/schema.ts` is large (~3,120 lines, on the order of 100 tables). The following zones are **candidates** for deprecation, extraction to a documented legacy zone, or read-only archival — not default anchors for new features.

### Self-Documented Legacy

- **`swot_analyses`** — Schema or adjacent comments indicate legacy status relative to `workspace_configurations` (or successor). New work should not depend on SWOT rows without governance sign-off.

### B2B Travel OS (7 tables)

Separate from core concierge; served in part by `server/routes/b2b-routes.ts`.

- `b2b_travel_itineraries`
- `b2b_hotels`
- `b2b_flights`
- `b2b_activities`
- `b2b_curation_audits`
- `b2b_lead_handoffs`
- `b2b_commission_events`

### VLM Outbound (3 tables)

Parallel product surface; aligns with VLM services.

- `vlm_prospects`
- `vlm_campaigns`
- `vlm_call_attempts`

### Storefront (4 tables)

Separate product surface.

- `storefront_categories`
- `storefront_items`
- `storefront_reports`
- `storefront_images`

### Organization / Project MVP (3 tables)

Labeled or treated as MVP in storage layers; verify usage before removal.

- `organizations`
- `projects`
- `project_tasks`

### Classroom (3 tables)

Educational product vs. core concierge.

- `knowledge_topics`
- `lesson_plans`
- `lesson_sessions`

### Other Candidates

- **`associations`** — Niche surface; low traffic in many deployments
- **`tour_specifications`**, **`featured_partners`** — Travel B2B adjacency
- **`agent_knowledge_base`** — May overlap with `knowledgeLibrary` / artifact pipelines; deduplicate before new writes

**Rule:** Do not add new foreign keys or business logic that **requires** these tables unless the System Manifest and schema anchor registry explicitly approve the anchor.

---

## 6. Storage Bloat (`server/storage.ts`)

`server/storage.ts` is large (~2,391 lines, 120+ methods). Methods that exist only to serve deprecated tables should be removed **in the same change** as table retirement (or after a deprecation window with zero callers).

### Target Method Families

- **VLM:** `getVlm*`, `createVlm*`, `updateVlm*`, and related
- **Org / project / task** methods
- **Classroom:** `getKnowledgeTopic*`, `getLesson*`, and related
- **SWOT** methods tied to legacy analyses
- **`getFrontDeskSessions`** — Large in-file projection; candidate to split into a dedicated module when touched for other reasons

---

## 7. Config Deprecation

| File | Issue |
|------|--------|
| `server/config/geminiSystemInstructions.ts` | Reportedly **not imported** by any TypeScript file. Prompt material in static config conflicts with **prompt runtime governance** — prompts belong in compiler inputs, templates, or DB-backed artifacts validated for persistence. |

**Action:** Confirm zero imports; remove or relocate content into the governed prompt pipeline; delete file if redundant.

---

## 8. `routes.ts` Monolith

`server/routes.ts` remains large (~2,314 lines, on the order of 100+ inline registrations). It still centralizes many domains:

| Domain | Examples |
|--------|----------|
| Auth | `/api/auth/*`, `/api/customer/*` |
| Plans / demo | `/api/plans`, `/api/demo/*` |
| Admin | `/api/admin/*` (mixed concerns) |
| Places / public | `/api/places/*`, `/api/gemini-key` |
| Site configs | **Overlaps** `server/routes/siteConfigRoutes.ts` — registration order matters (**first registered wins**) |
| MCP | `/api/mcp/*` stubs |
| Classroom | Partially decommissioned (503 / 410 style responses) |

### Migration

Extract each domain into **`server/routes/<domain>Routes.ts`** (or existing modular files) and mount from `routes.ts` with **import + `app.use` only**. **Do not** grow inline handler count in `routes.ts` for new work.

---

## 9. Migration Execution Order (Purge Session)

Execute in this order to minimize compliance and production risk:

1. **Fix orphan routes** — especially Twilio webhooks and any SMS compliance path.
2. **Extract** agent business logic to YAML / registry manifests and compiler inputs.
3. **Delete** `server/agents/` after routes and imports are clean.
4. **Prune** deprecated schema tables (document moves to a **LEGACY DEPRECATION ZONE** in governance docs and migrations).
5. **Remove** corresponding `storage.ts` methods.
6. **Extract** inline domains from `routes.ts` into modular routers.
7. Run **`npx tsc --noEmit`** (and relevant tests) to validate nothing breaks.
8. Record any intentionally broken or removed endpoints in **`docs-governance/LEGACY_AUDIT_REPORT.md`** (or successor) for operators and agents.

---

## 10. Absolute Prohibitions (All Future Development)

| Prohibition | Governed Alternative |
|-------------|----------------------|
| Import from `server/agents/` | `agentProvisioning.ts`, prompt compiler, `industry_agent_templates` |
| Call `geminiService.ts` directly for new features | Env-driven model wrapper; prompt compiler stack; server proxies |
| Hardcode model strings | `process.env.GEMINI_MODEL_ID` (and related env-only configuration) |
| Inline system prompts in TypeScript | Templates, fragments, compiler, validated DB artifacts |
| In-memory `Map`s for agent / swarm state | Durable storage, session contracts, governed context keys |
| New tables in deprecated zones (Section 5) | Approved schema anchors per `docs-governance/SCHEMA_ANCHOR_REGISTRY.md` |
| New routes inside `server/routes.ts` | New files under `server/routes/` + mount line only |
| Outbound messaging outside Sovereign SMS Router | Route through `server/services/smsRouter.ts` and registered A2P intents |

---

## Cross-References

- `docs-governance/PROMPT_RUNTIME_GOVERNANCE.md`
- `docs-governance/SAFE_MODE_CONTRACT.md`
- `docs-governance/SCHEMA_ANCHOR_REGISTRY.md`
- `docs-governance/SYSTEM_MANIFEST.md`
- `.cursor/rules/modular-routing.mdc`
- `.cursor/rules/sovereign-twilio-lockdown.mdc`
- Programmatic sales engine skill: `.cursor/skills/programmatic-sales-engine/SKILL.md`

---

*Last updated: maintained as part of the programmatic sales engine skill. Update this file when quarantine boundaries move after a governed migration.*
