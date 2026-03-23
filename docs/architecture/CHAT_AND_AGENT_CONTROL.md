# Chat-First Agent Control and KB Prompt Access

This document defines the **chat-first** control model: business owners manage agent behavior and knowledge access from the in-chat menu. The backend compiles high-quality system prompts from structured controls (DISC/ARCH/guardrails) instead of freeform paragraphs. Knowledge Base access is session-scoped and RBAC-enforced.

**Related:** [AGENT_SYSTEM.md](./AGENT_SYSTEM.md), [CHAT_ARCHITECTURE.md](./CHAT_ARCHITECTURE.md).

---

## 1. Chat-First Control Model

- **Owner workflows stay in chat:** Identity, Voice, DISC, ARCH, Sys prompt, and Knowledge are available from the ConciergePanel menu. Owner controls are shown when `showOwnerControls` is true (e.g. owner/admin context); public/customer pages set `showOwnerControls={false}` so the menu stays simplified.
- **Knowledge opens in-chat overlay:** The "View & activate docs" menu item opens the Knowledge overlay inside the panel. It does **not** navigate to `/platform/knowledge`. Search and Upload may still open the platform knowledge page for full management.
- **Links section:** When `websiteUrl` is provided, the menu shows a Links section (Website, Online store) that open in a new tab so the user stays in the chat context.
- **Single behavior source:** Voice, chat, and telephony all use the same compiled prompt pipeline (see below). No ad hoc prompt assembly in channel-specific code.

---

## 2. System Prompt Compile Contract

### 2.1 Pipeline

All channels (website chat, voice live, telephony) build the system instruction from:

1. **Identity / behavior** — `buildBehavioralPrompt(agent, businessContext)` from `server/services/promptCompiler.ts` (short-term memory, long-term identity, DISC, ARCH, business context).
2. **Structured guardrails** — Merged from `agent.structuredControls.guardrails` and `site_configs.structured_guardrails` (always / never / believe). Compiled by `server/services/systemPromptCompiler.ts`.
3. **Mirroring** — Optional line from `agent.structuredControls.mirroring` (enabled + intensity).
4. **User-directed additions** — `site_configs.system_prompt_override` appended as a distinct section, not as a full replacement of identity.

Full compilation for website chat (when an assigned agent exists) uses `compileFullSystemPrompt(agent, siteConfig, businessContext)` so guardrails and mirroring are included.

### 2.2 Voice-Specific Additions

The voice path (`server/geminiVoice.ts`) adds, after the compiled persona:

- **Introduction protocol** — First response: greet, introduce by name/role, state company and what you can help with.
- **Runtime policy** — No booking/scheduling offers; tools only for maps and manual input; direct pricing/booking to the Links menu or website.
- **Links menu block** — Built from `placeData` (website, etc.) so the model can direct users to the in-chat Links menu.
- **Pricing rule** — Do not offer to book or schedule; point to Links menu or website only.

Free tier appends `FREE_TIER_SYSTEM_INSTRUCTION` (no tools, data-only, no calendar).

### 2.3 Schema for Structured Controls

- **Agents:** `structured_controls` jsonb — `{ mirroring?: { enabled?, intensity? }, guardrails?: { always?, never?, believe? } }`.
- **Site configs:** `structured_guardrails` jsonb — `{ always?, never?, believe? }`. Merged with agent guardrails at compile time (site can override/append).

Validation and formatting live in `server/services/systemPromptCompiler.ts` (`validateGuardrails`, `compileFullSystemPrompt`).

---

## 3. Knowledge Base: Artifacts and Session Keys

### 3.1 Data Model

- **`knowledge_artifacts`** — First-class KB documents with:
  - `agent_access_key` (unique), `title`, `content` or `source_path`
  - `scope`: platform | franchise | business
  - `visibility`: public | private
  - Optional: `site_config_id`, `owner_id`, `reseller_id`, `group_level`

- **`artifact_session_activations`** — Which document keys are active for a given chat/session:
  - `session_id`, `agent_access_key`, optional `site_config_id`
  - Unique on `(session_id, agent_access_key)`; used for activate/deactivate without leaving chat.

### 3.2 RBAC Matrix

| Role / context        | List artifacts              | Activate key     | Fetch content (by key)   |
|-----------------------|-----------------------------|------------------|--------------------------|
| Unauthenticated       | Public only for site        | Public only      | Public only              |
| Owner (site)          | Public + private for site   | Public + private | Public + private         |
| Platform / franchise  | As implemented per scope    | Per scope        | Per scope                |

- **List:** `GET /api/knowledge/artifacts?siteConfigId=&sessionId=` — Returns items visible to the requester (public only if not owner) and `activeKeys` for the given `sessionId`.
- **Activate:** `POST /api/knowledge/artifacts/activate` — Body: `sessionId`, `agentAccessKey`, optional `siteConfigId`. Server validates artifact exists and requester may activate (private requires owner).
- **Deactivate:** `POST /api/knowledge/artifacts/deactivate` — Body: `sessionId`, `agentAccessKey`.
- **Content:** `GET /api/knowledge/artifacts/content/:agentAccessKey` — Returns markdown. Private artifacts only for owner (or other RBAC as extended).

Only **active** document keys for the current session should be passed into retrieval/context for agent responses.

### 3.3 In-Chat Overlay

The ConciergePanel Knowledge overlay:

- Lists artifacts for the current `siteConfigId` (and session).
- Checkbox to activate/deactivate each document key for the current session.
- Lock icon for private docs; checkbox disabled for private when not owner.
- No redirect; overlay closes back to chat.

---

## 4. Deprecation Notes

- **Ad hoc voice persona:** Building the voice system instruction from raw `systemPromptOverride` or `agentDef.persona` without `buildBehavioralPrompt` is deprecated. Use the unified compiler path in `geminiVoice.ts`.
- **Prompt logic in UI:** System prompts are DB artifacts. ConciergePanel (and any client) must not build or hardcode system prompts; they are loaded via `GET /api/site-configs/:id` and compiled server-side.
- **KB only at platform landing:** Primary KB UX for owners is the in-chat overlay (list/activate). The platform knowledge landing remains for search/upload and admin; it is not the only way to manage “what the agent knows” in session.

---

## 5. Verification Checklist

- [ ] Owner can adjust DISC/ARCH/guardrails in chat and see behavior change (compiled prompt).
- [ ] Agent introduces itself by name/role/company and does not offer booking on free/data-only mode.
- [ ] Knowledge overlay works without leaving the chat; active keys are session-scoped.
- [ ] Private docs show lock and are not activatable by non-owners.
- [ ] Agent retrieval uses only active document keys for the session.
- [ ] Public chat menu stays simple (no owner-only controls when `showOwnerControls` is false).
