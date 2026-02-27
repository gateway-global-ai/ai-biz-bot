---
name: clean-room-extraction
description: Strict read-only extraction from external ZIPs or folders into documentation; quarantines, audits, documents, then incinerates. No routing or voice AI logic merged.
---
# SKILL: Clean Room Extraction Protocol

**Description:** A strict, read-only extraction process used when importing external code, AI Studio ZIP exports, or legacy UI components into the workspace. The goal is to extract visual assets, data schemas, and business logic without polluting the active project's context window, routing, or dependencies.

**Trigger:** When the user requests **"Execute Clean Room Extraction on [Path/ZIP]"** or **"Run Clean Room on [Folder]"**.

---

## Execution Steps

### Phase 1: Quarantine (Isolate)

1. If dealing with a ZIP, extract the contents into a **temporary, isolated directory**: `/tmp/_quarantine_extraction`.
2. **STRICT CONSTRAINT:** Do NOT execute, run, or build any files in this directory.
3. **IGNORE DIRECTIVE:** Completely ignore and bypass all configuration and routing files in the quarantine zone. Do **not** attempt to resolve their dependencies. Explicitly **skip**:
   - `package.json`, `tsconfig.json`, `vite.config.ts`
   - `App.tsx`, `index.tsx`, `main.tsx`
   - Any `routes/*.ts` or equivalent routing modules

### Phase 2: Reconnaissance (Audit)

Perform a **read-only** sweep of the quarantine directory specifically looking for:

1. **TypeScript Interfaces/Types:** Data schemas, configuration objects, and API payload structures.
2. **UI/UX Tokens:** Tailwind classes, color hex codes, glassmorphic layer formulas, border radii, and animations.
3. **Valuable Business Logic:** Reusable functions (e.g., upsell triggers, data formatting, state management patterns).
4. **Mock Data:** JSON arrays or objects used to populate dashboards or charts.

### Phase 3: Extraction (Document)

1. Create a detailed Markdown report in the project's documentation folder:
   - **Path:** `/.system_design/extractions/extraction_YYYY-MM-DD.md` (use today's date).
2. The report **MUST** contain:
   - Raw code blocks of the valuable interfaces, logic loops, and mock data found in Phase 2.
   - A **UI Blueprint** section detailing the exact CSS/Tailwind classes required to replicate the external design.
   - **Report sections:** TypeScript Interfaces, API/Service Hooks (if documented only — no merge), UI Blueprint, Mock Data Inventory, Security Flags (e.g. hardcoded keys), Build Notes.
3. Do **not** copy WebSocket handlers, `useLiveApi`-style hooks, or Gemini Live session config into active project files during this protocol.

### Phase 4: Incineration (Sanitize)

1. Once the Markdown report is generated and verified, **DELETE** the `/tmp/_quarantine_extraction` directory and all its contents completely.
2. Confirm to the user that **"Quarry has been burned"** and the context window is secure.
3. Await further instructions on how to integrate the extracted Markdown data into the live codebase.

---

## Project Guardrails

- **Legacy archive:** Normal workspace rules forbid reading from `_legacy_archive/`. The Clean Room protocol is the **authorized bypass**: user may direct extraction from a path inside the archive; extract to `/tmp/_quarantine_extraction` first, then run Phases 2–4. Do not leave extracted files in agent-accessible project folders after the report is written.
- **No merge of sensitive logic:** Under no circumstances should external service layers, WebSocket handlers, or routing logic from the quarantine zone be merged into the active project files (`server/routes.ts`, `server/routes/*.ts`, or voice AI pipeline) during this protocol. Extraction is documentation-only unless the user explicitly requests integration in a follow-up step.
