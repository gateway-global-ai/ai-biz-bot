# Voice Concierge — structured knowledge base schema

Version: 1.0  
Purpose: Repeatable format for documents ingested into `site_configs.knowledge_library` (JSONB array) for the Voice Concierge demo.

## Document shape (per item)

Each entry is one object in the `knowledgeLibrary` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | yes | Stable id for updates; generate on insert. |
| `title` | string | yes | Short title for retrieval and admin UI. |
| `content` | string | yes | Plain text or markdown body (retrieval uses substring match). |
| `addedAt` | string (ISO-8601) | yes | Ingestion timestamp. |
| `category` | string | no | e.g. `platform`, `pricing`, `onboarding`, `resonance`, `compliance`. |
| `topic` | string | no | Finer label for filters (`voice_concierge`, `governance`, `sales`). |
| `labels` | string[] | no | Machine tags for future routing, e.g. `["gateway_global","voice","ppp"]`. |
| `visibility` | `"public"` \| `"owner"` | no | Default `public` for customer-facing concierge. |

## Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Opening protocol — three moves",
  "content": "Ground reality (CGR)... Demonstrate competence... Direction (next step)...",
  "addedAt": "2026-03-22T12:00:00.000Z",
  "category": "platform",
  "topic": "voice_concierge",
  "labels": ["gateway_global", "opening_protocol", "ppp"],
  "visibility": "public"
}
```

## Ingestion pipeline

- **Server:** [`storage.searchKnowledgeLibrary`](server/storage.ts) scores against title/content.  
- **Scripts:** [`scripts/ingest-aibizbot-user-uploads.ts`](scripts/ingest-aibizbot-user-uploads.ts), [`scripts/ingest-aibizbot-folder.ts`](scripts/ingest-aibizbot-folder.ts) (default `TARGET_SITE_SLUG=ai-biz-bots`).  
- **Runtime:** Do not duplicate full prompts in `client/` — use [PROMPT_RUNTIME_GOVERNANCE.md](./PROMPT_RUNTIME_GOVERNANCE.md).

## Alignment

- Compiler + `query_knowledge_library` tool use this corpus; agent system prompt remains compiled from DB + governance, not raw uploads alone.
