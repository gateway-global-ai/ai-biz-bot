---
status: canonical
truth_domain: runtime
enforced_by: none
backed_by:
  schema: false
  service: true
  route: true
last_verified: 2026-03-25
---
# ChatGPT Actions — Business Resonance (import schema URL)

Custom GPTs can call **your** HTTPS APIs (Actions). OpenAI does not expose a server API to "invoke this GPT by URL" from Gateway; instead you publish an **OpenAPI 3** document and the GPT calls **you**.

## Schema URL (import in GPT Editor)

After deployment, use **Import from URL** with:

```text
https://YOUR_ORIGIN/openapi/business-resonance-gpt.json
```

Examples (replace with your real host):

- `https://aibizbot-dev.gatewayglobal.ai/openapi/business-resonance-gpt.json`
- `https://aibizbot.gatewayglobal.ai/openapi/business-resonance-gpt.json`

The JSON response sets `servers[0].url` from `APP_URL`, `WEBHOOK_BASE_URL`, or `SERVER_URL` (Doppler), or from the request host when those are unset.

## Authentication in the GPT editor

The documented operations are **public** (same as the marketing site and agent chat):

- Set **Authentication** to **None** unless you add server-side key checks.

If you later gate these paths, use **API Key** → **Bearer** in the editor and implement matching validation on the server (do not commit secrets).

## Operations

| Operation ID | Method | Path | Purpose |
|--------------|--------|------|---------|
| `getSiteConfigBySlug` | GET | `/api/site-configs/by-slug/{slug}` | Load site; read `assignedAgentId` |
| `postGatewayAgentChat` | POST | `/api/chat` | Agent chat with `agentId` + `message` |

**Typical flow:** `GET …/by-slug/ai-biz-bots` → use `assignedAgentId` as `agentId` in `POST /api/chat`.

## Source

- [`server/routes/gptActionsOpenApiRoutes.ts`](../server/routes/gptActionsOpenApiRoutes.ts)
