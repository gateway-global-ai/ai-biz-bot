To implement the security model you've described, we need to move beyond simple environment variables and adopt a **"Secret Generator"** or **"Secret Manager"** pattern. By using a server-side proxy (Backend-for-Frontend), we can keep the keys entirely hidden from the frontend.

### **1. Setup Script: Requesting Restricted Keys**

This bash script uses the `gcloud` CLI to automate the creation of your restricted key for the **`ai-biz-bot`** project.

```bash
# Set project context
PROJECT_ID="ai-biz-bot"
gcloud config set project $PROJECT_ID

# 1. Create the dedicated Grounding Lite Key
KEY_NAME="Grounding-Lite-Key"
gcloud alpha services api-keys create \
    --display-name="$KEY_NAME"

# Get the KEY_ID of the newly created key
KEY_ID=$(gcloud services api-keys list --filter="displayName=$KEY_NAME" --format="value(name)")

# 2. Restrict to specific APIs (Grounding Lite and Places New)
# Replace service names with exact Google Cloud internal IDs if different
gcloud alpha services api-keys update $KEY_ID \
    --api-target=service=mapstools.googleapis.com \
    --api-target=service=places.googleapis.com

echo "Key created and restricted. ID: $KEY_ID"

```

---

### **2. Permit-Check Script (Node.js / TypeScript)**

Run this script (with Doppler or your env loaded) to verify that your keys have the correct permissions before going live. **Correct Grounding Lite endpoint:** Google standardized the MCP (Model Context Protocol) endpoint; use `https://mapstools.googleapis.com/mcp/search_places` (POST with `X-Goog-Api-Key` and body `{ textQuery: "..." }`). The old `v1/places:searchText` URL would return 404 even with a valid key.

The full script lives at **`scripts/check-google-key-permissions.ts`** and checks:

1. **Twilio** (optional): `messages.list({ limit: 1 })` to verify credentials without sending SMS.
2. **Gemini**: POST `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` with a "ping" payload.
3. **Maps Grounding Lite**: POST `https://mapstools.googleapis.com/mcp/search_places` with `X-Goog-Api-Key` and `{ textQuery: "Boardwalk Suites Lafayette" }`.
4. **Places API (New)**: GET place details with `X-Goog-FieldMask: id,displayName,rating`.

Run it with:

```bash
doppler run -- npx tsx scripts/check-google-key-permissions.ts
```

If any check fails, the script exits with code 1 (fail-fast) so you can fix the key before it breaks production.

**Implementation:** The codebase uses a three-key split. `/api/config/maps-key` returns only the client key (GOOGLE_MAPS_JS_API / GOOGLE_MAPS_JS_KEY). GEMINI_API_KEY is server-only except for the intentional `/api/gemini-key` (Gemini Live). Permission checks including Gemini are in `scripts/check-google-key-permissions.ts`; run with Doppler.

---

### **3. Implementing the "Secret Generator" Pattern**

To truly lock this down so you don't have to restrict by website (HTTP Referrer), you must transition to a **Backend Proxy**. The frontend never makes a direct call to Google; it calls your server, which "injects" the secret.

#### **Step A: Server-Side Secret Management**

Use **Google Cloud Secret Manager** to store the keys instead of `.env` files. This prevents leaks if your environment is ever compromised.

```javascript
// server/utils/secretManager.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getApiKey() {
  const [version] = await client.accessSecretVersion({
    name: 'projects/ai-biz-bot/secrets/GROUNDING_LITE_KEY/versions/latest',
  });
  return version.payload.data.toString();
}

```

#### **Step B: The Proxy Route**

The frontend calls your internal `/api/place-search` endpoint. Your server retrieves the key from the Secret Manager and forwards the request to Google.

```javascript
// server/routes/places.ts
app.post('/api/place-search', async (req, res) => {
  const key = await getApiKey(); // Injected only on the server
  const response = await axios.post(
    `https://mapstools.googleapis.com/v1/places:searchText?key=${key}`,
    req.body
  );
  res.json(response.data);
});

```

---

### **Why this provides "Total Lockdown"**

* **Zero Client Visibility:** The API key never leaves your server, so it cannot be "scraped" from the browser's network tab.
* **No Domain Whitelisting Needed:** Since the request comes from your server's trusted IP, you can remove "Browser Restrictions" and only use **"IP Restrictions"**.
* **Centralized Rotation:** If a key is compromised, you update it once in the Secret Manager, and all system components immediately pick up the new value without a redeploy.

**Would you like me to generate the "Deployment YAML" for Google Cloud Secret Manager to initialize these variables in your project?**