# Twilio Console Debugger webhook — deployment checklist

Use this when wiring **Phase 10a** ingestion in any environment (GCE, VPS, Docker, k8s).

## Prerequisites

- Public **HTTPS** URL reachable by Twilio ([webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)).
- `TWILIO_AUTH_TOKEN` matches the account that signs requests.
- Route: **`POST /api/twilio/monitor/debug-event`** (see `server/routes/twilioMonitorRoutes.ts`).

## Critical: signature URL vs proxy

Twilio validates using the **exact URL** it POSTs to. If TLS terminates at **Caddy / nginx / load balancer** and Node sees an internal host or `http`, validation fails unless you set:

```bash
TWILIO_WEBHOOK_SIGNATURE_BASE_URL=https://voice.yourdomain.com
```

Rules:

- **No** trailing slash on the base.
- Origin must match what you entered in **Twilio Console** (scheme + host; path is appended from the request, e.g. `/api/twilio/monitor/debug-event`).

Documented in [`.env.example`](../../.env.example) and [`docs/SOVEREIGN_ENV_MANIFEST.md`](../SOVEREIGN_ENV_MANIFEST.md).

## Twilio Console

1. Open **Monitor → Debugger** (or Alerts) and set the **HTTP webhook** to your public URL, e.g.  
   `https://voice.yourdomain.com/api/twilio/monitor/debug-event`
2. Save. Twilio sends `application/x-www-form-urlencoded` with a JSON `Payload` string ([Debugging Events](https://www.twilio.com/docs/usage/troubleshooting/debugging-event-webhooks)).

## Verify

- **Valid request:** `200` + structured log line `[TwilioDebugger]` with `rawForm` + `normalized`.
- **Invalid signature:** `403` — check `TWILIO_WEBHOOK_SIGNATURE_BASE_URL` and that the Console URL matches.

## Do not (10a scope)

- Do not attach retries, policy engine, or DB writes to this route without a **Phase 10+** task — keep intake thin.

## Related

- `docs-governance/canonical/TWILIO_RELIABILITY_ARCHITECTURE.md`
- `docs-governance/canonical/GOVERNANCE_EXECUTION_PLAN_V1.md` — Runtime Trust Parity / Phase 10
