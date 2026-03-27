---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: false
  service: true
  route: false
last_verified: 2026-03-25
---
# Phased Industry Funnel Specification

**Version:** 1.0  
**Status:** Active  
**Related:** [SALES_FUNNEL_SPEC.md](./SALES_FUNNEL_SPEC.md), [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md), [INTENT_DRIVEN_CANVAS_SPEC.md](./INTENT_DRIVEN_CANVAS_SPEC.md)

---

## Purpose

Extend each entry in `site_configs.sales_funnels` with an optional **`conversationWorkflow`**: ordered **phases** with **required context keys**, **output contracts** (must / must-not), and optional **industry knowledge** references. The prompt compiler injects **only the resolved current phase** so agents do not ramble through full technical or pricing detail before the buyer context warrants it.

Industry research (e.g. `Reports/nail_salon_report.md`) belongs in **`knowledgeLibrary`** (or cited artifacts), referenced by `industryKnowledgeRef` — not pasted into `system_prompt_override`.

---

## JSON shape (`conversationWorkflow`)

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Schema version (default 1) |
| `industryVertical` | string | e.g. `nail_salon` |
| `phases` | array | Ordered phases (see below) |
| `transitions` | array | Optional documentation of edges; runtime uses **first phase with missing required keys** |
| `industryKnowledgeRef` | object | `{ source: 'knowledge_doc_id' \| 'artifact_key' \| 'slug', value, title? }` |

### Phase object

| Field | Description |
|-------|-------------|
| `id` | Stable id, e.g. `capture_snapshot` |
| `label` | Human label for UI and prompt |
| `goal` | What this phase achieves |
| `allowedIntent` | `visitor` \| `owner` \| `both` |
| `requiredContextKeys` | Keys that must be present **before** this phase is considered complete (non-empty array per phase for deterministic resolution) |
| `outputContract` | `must[]`, `mustNot[]`, optional `maxSentences` |
| `boldClaimHint` | Optional one-line angle for a strong opening |
| `disclosureTierHint` | `minimal` \| `standard` \| `full` — aligns with progressive disclosure |

---

## Phase resolution (deterministic)

`resolveCurrentPhase(workflow, funnelContextKeys)` returns the **first** phase (in order) for which **any** `requiredContextKeys` entry is missing from `funnelContextKeys`. Phases with **empty** `requiredContextKeys` are skipped. If all non-empty phases are satisfied, the **last** phase is returned.

Context keys are **not** inferred by the LLM; the client/session supplies them (e.g. `owner_salon_name`, `owner_city`, `demo_ready`).

---

## Context keys (Nail Salon v1)

| Key | When set |
|-----|----------|
| `owner_salon_name` | Owner provided salon name |
| `owner_city` | City/state for demo |
| `demo_ready` | Owner acknowledged or requested personalized demo |

---

## Templates

Reference implementations live in:

- [`shared/industryFunnelTemplates/nailSalonV1.ts`](../shared/industryFunnelTemplates/nailSalonV1.ts) — **Nail Salon v1** (`NAIL_SALON_FUNNEL_V1_ENTRY`)

Apply to a site via `POST /api/site-configs/:id/funnels/apply-template` with `{ "templateId": "nail_salon_v1" }`.

---

## Prompt compiler

When `primaryFunnel.conversationWorkflow` is present and `siteConfig` is passed to `buildBehavioralPrompt`, the compiler appends `### CURRENT CONVERSATION PHASE` using `resolveCurrentPhase` + `formatPhasePromptFragment`.

---

## UI (MVP)

Structured JSON editor for `sales_funnels` with Zod validation; **drag-and-drop graph editor** is out of scope for v1 (see rollout in [SALES_FUNNEL_SPEC.md](./SALES_FUNNEL_SPEC.md)).

---

## Replication

Clone a template onto a `site_config` with the apply-template endpoint; adjust `industryVertical`, knowledge docs, and phases per vertical without changing core OS routing.
