# Deploy aibizbot.gatewayglobal.ai

Deploy the AI Biz Bot (website, API, webhooks, VLM) on the Gateway Global VPS. **Deployment workflow** (paths, ports, Nginx, SSL) is defined in **[server_deployment.md](server_deployment.md)** — that doc is the single source of truth.

---

## Message to server admin

**We are not deploying twilio.gatewayglobal.ai.** The first (and primary) subdomain to bring live is **aibizbot.gatewayglobal.ai**. That one app serves the website, API, and all Twilio webhooks (single base URL).

Please:

1. **Install** PM2 and Certbot.
2. **Enable first subdomain**: **aibizbot.gatewayglobal.ai** (the Nginx config in `sites-available` for this hostname).
3. **App path**: `/opt/gatewayglobal/aibizbot.gatewayglobal.ai`
4. **Port**: **3002**
5. **Code**: Clone the app repo into that path. Repo: **https://github.com/gateway-global-ai/chat-mvp-merge** (or the correct org/repo if different). Branch: `main` (or the branch we specify).  
   - Then: `npm ci --omit=dev`, add `.env` (see below), `npm run build`, `npm run db:push`, `pm2 start dist/index.cjs --name aibizbot.gatewayglobal.ai -i 1`, `pm2 save`, `pm2 startup`.
6. **SSL**: Run Certbot for **aibizbot.gatewayglobal.ai** after Nginx is enabled.

The app must have a `.env` in `/opt/gatewayglobal/aibizbot.gatewayglobal.ai` with at least: `PORT=3002`, `NODE_ENV=production`, `WEBHOOK_BASE_URL=https://aibizbot.gatewayglobal.ai`, plus `DATABASE_URL`, Twilio, and API keys (see [server_deployment.md](server_deployment.md) and repo `.env.example`).

**twilio.gatewayglobal.ai** is not part of this deploy; everything (site + webhooks) is on **aibizbot.gatewayglobal.ai**.

---

## Quick reference for this app

- **Subdomain**: aibizbot.gatewayglobal.ai  
- **App path**: `/opt/gatewayglobal/aibizbot.gatewayglobal.ai`  
- **Port**: 3002 (from fixed range 3002–3009)  
- **WEBHOOK_BASE_URL**: `https://aibizbot.gatewayglobal.ai`  

Follow [server_deployment.md](server_deployment.md) for:

1. Creating `/opt/gatewayglobal/aibizbot.gatewayglobal.ai` and setting `PORT=3002`
2. Nginx server block for `aibizbot.gatewayglobal.ai` → `http://127.0.0.1:3002`
3. Per-subdomain Certbot SSL
4. **Legacy cleanup**: retiring the old `/var/www` + port 5000 setup and disabling the old Nginx site

## Environment (.env)

In the app directory, set at least:

```bash
NODE_ENV=production
PORT=3002
WEBHOOK_BASE_URL=https://aibizbot.gatewayglobal.ai
DATABASE_URL=postgresql://user:pass@localhost:5432/gateway_ai
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
GEMINI_API_KEY=...
GOOGLE_CLOUD_API_KEY=...
SESSION_SECRET=...   # 32+ chars
ENCRYPTION_KEY=...    # 32+ chars
```

See [../.env.example](../.env.example) for the full list.

## Post-deploy checks

- **https://aibizbot.gatewayglobal.ai** — client loads.
- **Twilio**: Voice webhook `https://aibizbot.gatewayglobal.ai/webhook/voice/kimi`, SMS `https://aibizbot.gatewayglobal.ai/webhook/sms`. Test call/SMS.
- **VLM**: Run discovery or outbound flow; TwiML uses `WEBHOOK_BASE_URL` (see [../OUTBOUND_CAMPAIGN_WORKFLOW.md](../OUTBOUND_CAMPAIGN_WORKFLOW.md)).

## Code

- `server/routes.ts` uses `WEBHOOK_BASE_URL` (or request host) for webhook URLs so the same code works on this subdomain and for customer domains.
