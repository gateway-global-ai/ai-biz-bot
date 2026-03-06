# Industry Package Playbook

Repeatable pipeline for analyzing failed or legacy projects and converting them into **tools**, **skills**, and **agents** in a reusable industry package.

## Steps

| Step | Action | Output |
|------|--------|--------|
| **Ingest** | Extract app source + skills + config from the failed project. Do **not** copy `.git/`, `.local/state/`, or binary state. | Staging folder under `docs/knowledge-base/<project>-extract/`. |
| **Analyze** | Document: stack (Replit/Vite/etc.), voice/chat integration points, APIs used (e.g. Cloudbeds), what worked vs what failed. | `docs/knowledge-base/<project>-extract/ANALYSIS.md`. |
| **Map to our stack** | Map their concepts to: **Tools** (server/tools, geminiToolDeclarations), **Skills** (.cursor/skills), **Agents** (industry_agent_templates, knowledgeLibrary.agents), **UI** (components in client/src). | Mapping table in ANALYSIS.md or this playbook. |
| **Convert** | Add or extend: server tools, declarations in geminiToolDeclarations, optional Cursor skills, industry templates in seed-industry-templates, knowledge library docs. | Patches to codebase + optional new skills. |
| **Package** | One checklist per industry: docs, templates, booking/UI component, and any new tools/skills. Single doc that ties it together for sales/onboarding. | Checklist + package doc (e.g. HOSPITALITY_PACKAGE.md). |

## Ingest rules

- Extract to `docs/knowledge-base/<project>-extract/`.
- **Exclude**: `.git/`, `.local/state/`, `*.bin`, any env files or secrets.
- **Include**: App source (`src/`, `client/`, `server/` as present), config files (`package.json`, `vite.config.ts`, etc.), `.local/skills/*.md` (as reference only).

## First run: Boardwalk-Rewards

Boardwalk-Rewards is the first project run through this playbook. See:

- **Extract**: `docs/knowledge-base/boardwalk-rewards-extract/`
- **Analysis**: `docs/knowledge-base/boardwalk-rewards-extract/ANALYSIS.md`
- **Resulting package**: Hospitality (Cloudbeds docs, hospitality_travel templates, booking block, GRN/Cloudbeds availability API).
