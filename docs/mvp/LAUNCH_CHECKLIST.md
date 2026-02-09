# MVP launch checklist

Use this before going live with the current stable release (prod).

## 1. Environment and deployment

- [ ] **Prod env:** `.env` on prod server has `PORT=3002`, `NODE_ENV=production`, `WEBHOOK_BASE_URL=https://aibizbot.gatewayglobal.ai`, plus `DATABASE_URL`, Twilio, and API keys (see [../deployment/server_deployment.md](../deployment/server_deployment.md) and repo [.env.example](../../.env.example)).
- [ ] **Deploy prod:** On prod server run:  
  `cd /opt/gatewayglobal/aibizbot.gatewayglobal.ai && ./script/deploy-server.sh aibizbot.gatewayglobal.ai`
- [ ] **Smoke test:** Open https://aibizbot.gatewayglobal.ai — client loads; chat and PTT work in preview/demo flow.

## 2. Lead machine (outbound + free websites)

- [ ] **Twilio:** Voice and SMS webhooks point at prod base URL (e.g. `https://aibizbot.gatewayglobal.ai/webhook/voice/...`, `/webhook/sms`). Test with a call/SMS.
- [ ] **VLM / outbound:** If using Voice Lead Machine or outbound flows, confirm `WEBHOOK_BASE_URL` is set and TwiML actions use it (see [../deployment/OUTBOUND_CAMPAIGN_WORKFLOW.md](../deployment/OUTBOUND_CAMPAIGN_WORKFLOW.md)).
- [ ] **Free-websites flow:** End-to-end test: discover business → generate site → preview with chat/PTT → optional lead capture.

## 3. Chat and PTT

- [ ] **Embed script:** `/sdk/gateway-chat.js` is served from **platform/chat** (server uses `platform/chat/src`).
- [ ] **Preview chat:** BusinessPage (customer preview) shows chat with layout control (float/fixed/fullscreen) and PTT “Hold to Record” without errors.

## 4. Post-launch

- [ ] **Stage:** Deploy and test on aibizbot-stage.gatewayglobal.ai before next prod push (see [../deployment/ENVIRONMENTS_DEV_STAGE_PROD.md](../deployment/ENVIRONMENTS_DEV_STAGE_PROD.md)).
- [ ] **Monitoring:** Confirm logging/health endpoints if you use them; fix any critical errors.

---

**Scope and standard vs paid:** [SCOPE.md](SCOPE.md)
