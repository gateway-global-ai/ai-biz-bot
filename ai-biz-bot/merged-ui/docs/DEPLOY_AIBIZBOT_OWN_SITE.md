# Deploy AI Biz Bot for Gateway Global’s Own Website (aibizbot.gatewayglobal.ai)

Gateway Global’s main product site is **http://aibizbot.gatewayglobal.ai** (use **https** in production). The AI Biz Bot (chat + voice) should be **deployed and live on this site** so visitors can use the same experience we sell to customers. This doc gives concrete steps to get the bot on our own site.

---

## 1. Base URL and OG

- **Base URL:** `https://aibizbot.gatewayglobal.ai` (prefer HTTPS in production; HTTP is already referenced in some OG tags).
- **Existing references in repo:**
  - `server/routes.ts`: `DEFAULT_OG.ogUrl` and `ogImage` point to `http://aibizbot.gatewayglobal.ai`.
  - `client/index.html`: `og:url`, `og:image`, `twitter:image` point to `http://aibizbot.gatewayglobal.ai`.
- **Action:** Ensure the **deployed** site and API use this base URL everywhere (canonical, embed script, webhooks). Optionally switch to `https://` and update OG and any hardcoded links.

---

## 2. Where the “main” site is served

- The **client** (React app in `client/`) is the main dashboard/landing that can be hosted at **aibizbot.gatewayglobal.ai**.
- The **server** (Node/Express in `server/`) serves API, embed script (`/embed.js`), and site configs. It may be deployed at the same host (e.g. `aibizbot.gatewayglobal.ai`) or at a separate API host (e.g. `twilio.gatewayglobal.ai` for webhooks, or `api.gatewayglobal.ai`).

For “our own website” we need:
1. The **public site** at **aibizbot.gatewayglobal.ai** (the marketing/landing + any app shell).
2. The **chat/voice widget** (the same one we sell) embedded on that site so visitors can talk to Gateway’s AI.

---

## 3. Embedding the bot on aibizbot.gatewayglobal.ai

The server exposes **`/embed.js`**, which renders a chat widget. The script uses `window.GATEWAY_API_URL` or the current request’s origin as the API base. To embed the bot on the Gateway site:

**Option A – Same-origin (site and API on aibizbot.gatewayglobal.ai)**  
- Deploy the **server** so it is reachable at `https://aibizbot.gatewayglobal.ai`.  
- On the **landing/app** page, add:
  ```html
  <script src="https://aibizbot.gatewayglobal.ai/embed.js" data-bot-id="YOUR_SITE_CONFIG_ID" defer></script>
  ```
- Replace `YOUR_SITE_CONFIG_ID` with the **site config ID** for “AI Biz Bot – Gateway Global” (create one in the admin if it doesn’t exist). That config holds the bot name, greeting, placeholder, and backend behavior.

**Option B – API on a different host**  
- If the API runs at e.g. `https://twilio.gatewayglobal.ai` or another host:
  ```html
  <script>
    window.GATEWAY_API_URL = 'https://YOUR_API_HOST';
  </script>
  <script src="https://YOUR_API_HOST/embed.js" data-bot-id="YOUR_SITE_CONFIG_ID" defer></script>
  ```
- Ensure CORS allows requests from `https://aibizbot.gatewayglobal.ai` to the API host.

---

## 4. Site config for “Gateway Global – AI Biz Bot”

- In the **admin** (e.g. AI Biz Bot Admin or site-config API), create or edit a **site config** that represents the Gateway Global product site:
  - **Name:** e.g. “AI Biz Bot” or “Gateway Global”.
  - **Place ID / business:** Optional (for our own business listing).
  - **Chat/voice:** greeting message, placeholder, model, system prompt tuned for “we’re Gateway Global, we offer free AI websites and voice for small business.”
- Use that config’s **ID** as `data-bot-id` in the embed script above.

---

## 5. Webhooks and Twilio (if voice/SMS are on this domain)

- If **Twilio** webhooks (voice, SMS) for the Gateway bot are served from the same server:
  - Set **WEBHOOK_BASE_URL** (or equivalent) to `https://aibizbot.gatewayglobal.ai` if the server is there, or to the actual host that serves `/webhook/voice`, `/webhook/sms`, etc.
- If webhooks live on **twilio.gatewayglobal.ai** (as in some routes), keep that; no need to point Twilio at aibizbot for webhooks unless you intentionally move them.

---

## 6. Checklist

| Step | Action |
|------|--------|
| 1 | Confirm production base URL: **https://aibizbot.gatewayglobal.ai** (or http if not on TLS yet). |
| 2 | Create or identify the **site config** for the Gateway Global AI Biz Bot; note its ID. |
| 3 | Add the **embed script** to the page(s) at aibizbot.gatewayglobal.ai that should show the bot: `src` = same host or API host, `data-bot-id` = site config ID. |
| 4 | Set **GATEWAY_API_URL** if the API is on a different host than the page. |
| 5 | Update **OG/meta** to **https** if you switch to HTTPS. |
| 6 | Test: open https://aibizbot.gatewayglobal.ai, confirm the widget loads and chat (and voice, if enabled) work. |

Once this is done, the AI Biz Bot is deployed for our own website and visitors get the same chat (and optionally voice) experience we sell.
