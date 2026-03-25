# Voice Concierge — Gateway Global AI (`ai-biz-bots`)

Version: 1.0  
Status: Deploy spec (runtime lookup by slug)

## Target surface

| Field | Value |
|-------|--------|
| **Public URL** | `/agent/ai-biz-bots` ([`AgentPage`](client/src/pages/agents/AgentPage.tsx) loads via `GET /api/site-configs/by-slug/ai-biz-bots`) |
| **Slug** | `ai-biz-bots` |
| **Site row** | `site_configs` where `slug = 'ai-biz-bots'` (UUID varies per environment — **do not hardcode**; use API below) |
| **Primary agent** | `site_configs.assigned_agent_id` → Concierge row (`agents.role_type = 'concierge'`) |
| **Seed** | [`migrations/0053_seed_aibizbot_demo_agent.sql`](migrations/0053_seed_aibizbot_demo_agent.sql), [`server/index.ts`](server/index.ts) `seedDemoAgents()` / `DEMO_AGENT_PROFILES["ai-biz-bots"]` |

## Resolve `site_config.id` at runtime

```bash
curl -sS "https://YOUR_ORIGIN/api/site-configs/by-slug/ai-biz-bots" | jq '.id, .assignedAgentId, .metadata, .communicationGovernance'
```

## Demo flags (governance)

| Key | Location | Purpose |
|-----|----------|---------|
| `platformMarketingDemo` | `site_configs.metadata.platformMarketingDemo` | Platform-owned marketing site; shell should not treat as SMB “claim” demo (see ConciergePanel / product rules). |
| `communication_governance` | `site_configs.communication_governance` | PPP + disclosure; set by [`migrations/0054_voice_concierge_ai_biz_bots_governance.sql`](migrations/0054_voice_concierge_ai_biz_bots_governance.sql) and seed. |

## Agent persona (seed)

- **Name:** Nova  
- **Role label:** Platform Advisor  
- **Company:** Gateway Global AI  
- **Voice:** Puck  

## Related

- [VOICE_CONCIERGE_OPENING_PROTOCOL.md](./VOICE_CONCIERGE_OPENING_PROTOCOL.md)  
- [VOICE_CONCIERGE_KB_SCHEMA.md](./VOICE_CONCIERGE_KB_SCHEMA.md)  
- [VOICE_CONCIERGE_DEMO_CHECKLIST.md](./VOICE_CONCIERGE_DEMO_CHECKLIST.md)  
- [VOICE_CONCIERGE_VOICE_MANUAL_SCRIPT.md](./VOICE_CONCIERGE_VOICE_MANUAL_SCRIPT.md)  
- [VOICE_CONCIERGE_LOCAL_LLM_BATCH.md](./VOICE_CONCIERGE_LOCAL_LLM_BATCH.md)  
- [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md)
