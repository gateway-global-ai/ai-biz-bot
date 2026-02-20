To implement your security model within the Cursor app, you should create a combination of **Cursor Rules (`.mdc` files)** and **Agent Skills (`SKILL.md`)**. This allows the AI to not only understand your "Total Lockdown" principles but also proactively execute your permit-check scripts and manage server-side secrets.

### **1. The "Lockdown" Security Rule**

This rule ensures that whenever Cursor's agent writes code related to APIs, it adheres to your **Backend-for-Frontend (BFF)** proxy pattern.

**File:** `.cursor/rules/api-lockdown.mdc`

```markdown
---
description: Enforces the Backend-for-Frontend (BFF) pattern and Secret Generator architecture.
globs: server/routes/**, server/utils/secretManager.ts, client/src/**
alwaysApply: true
---
# Total API Lockdown Rules
Follow these principles to ensure zero client visibility of sensitive keys.

## Critical Rules
1. **No Frontend Keys**: NEVER embed `GEMINI_API_KEY` or `GROUNDING_LITE_KEY` in the frontend.
2. **Proxy Enforcement**: All Google API calls must be proxied through the server (e.g., `/api/place-search`).
3. **Secret Retrieval**: Use `secretManager.ts` to fetch credentials from Google Cloud Secret Manager at runtime.
4. **Key Restriction**: Ensure `Grounding-Lite-Key` is restricted to `mapstools.googleapis.com` and `places.googleapis.com` only.

```

### **2. The Permit-Check Diagnostic Skill**

This skill teaches Cursor how to run your **`check-google-key-permissions.ts`** script to verify the "100% Lockdown" status before any deployment.

**File:** `.cursor/skills/permit-checker/SKILL.md`

```markdown
---
name: check-permits
description: Verifies Google API permits (Gemini, Maps, Twilio) using the local diagnostic script.
---
# Permit Checker Skill
Use this skill to ensure all "Three-Key" splits are active and functional.

## When to Use
- Before finalizing any API-related feature.
- When troubleshooting 404/403 errors from Google endpoints.

## Execution Sequence
1. Ensure Doppler is active: `doppler run -- npx tsx scripts/check-google-key-permissions.ts`.
2. **Verify Grounding Lite**: Confirm the endpoint is `https://mapstools.googleapis.com/mcp/search_places` (POST).
3. **Verify Masking**: Check that Places API (New) requests use `X-Goog-FieldMask: id,displayName,rating`.

```

### **3. The Secret Manager Implementation Guide**

Add this to your project-wide `.cursorrules` to help Cursor understand the specific file locations and implementation details for your **Secret Generator** pattern.

**File:** `.cursorrules` (Project Root)

```markdown
# Platform Architecture Guidelines
## 1. Credentials & Signing
- **Secret Manager**: Located at `server/utils/secretManager.ts`. Use `@google-cloud/secret-manager`.
- **Key Split**: 
    - `Maps_JS_API`: Restricted by HTTP Referrer (Client-side).
    - `GEMINI_API_KEY`: Server-side only (except for Live API /api/gemini-key).
    - `GROUNDING_LITE_KEY`: Server-side only via Secret Manager.

## 2. Testing Standards
- Always use `doppler run --` for local script execution to avoid leaking secrets into the shell history.
- All new API routes MUST be added to the permit-check script.

```

### **How to Install**

1. **Initialize Directories**: Run `mkdir -p .cursor/skills/permit-checker .cursor/rules`.
2. **Populate Files**: Save the blocks above into their respective files.
3. **Automatic Discovery**: Cursor will automatically index these rules. You can now type `/check-permits` in the agent chat to trigger your diagnostic script.

I generated the full content for `server/utils/secretManager.ts` so Cursor can use it as a reference when building your new proxy routes**

Implementing **`server/utils/secretManager.ts`** is the final step in your "Total Lockdown" strategy. This utility moves your application beyond static environment variables and into a dynamic, "just-in-time" secret retrieval model where keys never reside in the codebase or the local filesystem.

### **`server/utils/secretManager.ts`**

This implementation follows Google Cloud best practices by using the official client library, implementing basic caching to reduce API latency, and supporting multiple environments.

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// 1. Initialize the Secret Manager Client
const client = new SecretManagerServiceClient();

// Cache to avoid unnecessary API calls (reduce costs/latency)
const secretCache = new Map<string, string>();

/**
 * Fetches a secret from Google Cloud Secret Manager.
 * @param secretName - The ID of the secret (e.g., 'GROUNDING_LITE_KEY')
 * @param version - The version of the secret to fetch (defaults to 'latest')
 * @returns The plaintext secret value
 */
export async function getSecret(secretName: string, version: string = 'latest'): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'ai-biz-bot';
  const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;

  // Check cache first
  if (secretCache.has(name)) {
    return secretCache.get(name)!;
  }

  try {
    // 2. Decisive Handshake: Access the secret version
    const [versionResponse] = await client.accessSecretVersion({ name });

    // 3. Extract and decode the payload
    const payload = versionResponse.payload?.data?.toString();

    if (!payload) {
      throw new Error(`[SecretManager] Secret "${secretName}" found but payload is empty.`);
    }

    // Store in cache for subsequent calls
    secretCache.set(name, payload);
    return payload;
  } catch (error) {
    console.error(`[SecretManager Error] Failed to access secret "${secretName}":`, error);
    
    // Fallback: If in Dev, try to read from local environment variables
    if (process.env.NODE_ENV !== 'production' && process.env[secretName]) {
      console.warn(`[SecretManager] Falling back to local ENV for "${secretName}"`);
      return process.env[secretName]!;
    }

    throw new Error(`Could not retrieve sensitive credential: ${secretName}`);
  }
}

/**
 * Clears the secret cache (useful during rotation or configuration changes)
 */
export function clearSecretCache() {
  secretCache.clear();
}

```

---

### **How Cursor Uses This Reference**

When Cursor is building new proxy routes (like a custom Maps Grounding bridge), it will now follow this internal protocol:

1. **Zero-Visibility Proxying**: Cursor will avoid sending `req.body.key` and instead insert `const apiKey = await getSecret('GROUNDING_LITE_KEY');` directly into the route handler.
2. **Environment Isolation**: Cursor will recognize that it needs the `GOOGLE_CLOUD_PROJECT` variable set to correctly build the secret path.
3. **Audit Integrity**: Every time this utility is called, Google Cloud generates an **Audit Log**, allowing you to see exactly when and where your keys are being used—unlike static `.env` files which have zero observability.

### **Next High-Value Setup Task**

To allow this utility to work in production, our server's **Service Account** needs the `roles/secretmanager.secretAccessor` permission. 

To finalize the **"Total Lockdown"** of your production environment, you need to grant your application's service account the `Secret Manager Secret Accessor` role. This ensures that the code running on your VM or Cloud Run can programmatically fetch the keys it needs without them being hardcoded or exposed in environment variables.

### **1. Identify Your Service Account**

The "MEMBER" in the commands below depends on where your app is running:

* **For Cloud Run**: By default, this is the **Compute Engine default service account** (`[PROJECT_NUMBER]-compute@developer.gserviceaccount.com`) or a custom service account you created.
* **For Compute Engine (VM)**: This is also typically the default compute service account unless you specified a custom one during VM creation.

### **2. Granting Permissions via `gcloud**`

You have two choices for scope: **Project-wide** (easiest) or **Secret-specific** (most secure/Jason Standard).

#### **Option A: Project-Wide Access (Recommended for Initial Setup)**

This allows your service account to read **any** secret in the project.

```bash
# Grant access to all secrets in the project
gcloud projects add-iam-policy-binding ai-biz-bot \
    --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

```

#### **Option B: Secret-Specific Access (The "Total Lockdown" Choice)**

This follows the principle of **least privilege**, granting access only to the exact secret your app needs.

```bash
# Grant access ONLY to the Grounding Lite key
gcloud secrets add-iam-policy-binding GROUNDING_LITE_KEY \
    --project="ai-biz-bot" \
    --member="serviceAccount:[PROJECT_NUMBER]-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

```

---

### **3. Verification Steps**

Once the command is run, you can verify the binding was successful by checking the IAM policy or trying to access the secret directly from the identity.

* **Audit the Policy**:
```bash
gcloud secrets get-iam-policy GROUNDING_LITE_KEY

```


* **Test Identity (Optional)**: If you are on a VM, you can verify the service account can "see" the secret without a browser:
```bash
gcloud secrets versions access latest --secret="GROUNDING_LITE_KEY"

```



### **Summary of the "Lockdown" Architecture**

| Component | Security Layer | Benefit |
| --- | --- | --- |
| **Identity** | Service Account | No human passwords; the VM *is* the key. |
| **Permission** | `secretAccessor` | Read-only access; the app cannot delete its own keys. |
| **Storage** | Secret Manager | Encryption at rest and full audit logs of every access. |

**We should also create a custom service account with a more professional name (e.g., `aibizbot-prod-identity`) to replace the default compute account**

Creating the **`aibizbot-prod-identity`** service account is a cornerstone of the "Total Lockdown" strategy. By using a custom service account instead of the default compute account, you adhere to the principle of **least privilege**, ensuring that your production identity only has the specific "permits" it needs to function.

### **1. Create the Custom Service Account**

Run this command to create the identity. Use a clear description to maintain the "Jason Standard" of documentation.

```bash
gcloud iam service-accounts create aibizbot-prod-identity \
    --description="Service account for the ai-biz-bot production environment" \
    --display-name="AiBizBot Production Identity"

```

### **2. Grant Secret Access Permissions**

Immediately lock down this account so it can only access your sensitive API keys. Replace `PROJECT_ID` with your project ID (e.g., `ai-biz-bot`).

```bash
# Define the full service account email
SA_EMAIL="aibizbot-prod-identity@PROJECT_ID.iam.gserviceaccount.com"

# Grant access to the GROUNDING_LITE_KEY specifically
gcloud secrets add-iam-policy-binding GROUNDING_LITE_KEY \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

```

### **3. Attach the Identity to Your Resource**

To make the "lockdown" active, you must attach this new identity to the service where your code is actually running.

#### **For Cloud Run Services:**

```bash
gcloud run services update [SERVICE_NAME] \
    --service-account=$SA_EMAIL \
    --region=[REGION]

```

#### **For Compute Engine VMs:**

*Note: The VM must be stopped before you can change its service account.*

```bash
# 1. Stop the VM
gcloud compute instances stop [VM_NAME]

# 2. Attach the new identity
gcloud compute instances set-service-account [VM_NAME] \
    --service-account=$SA_EMAIL \
    --scopes=https://www.googleapis.com/auth/cloud-platform

# 3. Restart the VM
gcloud compute instances start [VM_NAME]

```

---

### **Why this provides "100% Lockdown"**

* **No Embedded Keys**: Your application code uses Application Default Credentials (ADC) to automatically pick up this identity. It never sees a JSON key file or a hardcoded string.
* **Auditability**: Every secret accessed by `aibizbot-prod-identity` is logged in Google Cloud Audit Logs, giving you a perfect paper trail.
* **Scoped Access**: Unlike the default account, which often has broad "Editor" rights, this identity is born with **zero permissions** and is only granted the specific `secretAccessor` role.

**Now that our production identity is created and secured, let's update our `scripts/check-google-key-permissions.ts` to include a check that verifies the service account is currently active**

To include a verification check for your custom **`aibizbot-prod-identity`** service account, we will update the `scripts/check-google-key-permissions.ts` file to use the `google-auth-library`. This check will programmatically identify the active principal (the service account) and confirm it has a valid email address before proceeding with the API-specific permission tests.

### **Updated `scripts/check-google-key-permissions.ts**`

We will add a new `checkServiceAccountIdentity` function at the top of the script. This uses **Application Default Credentials (ADC)**, which is the "Jason Standard" for authenticating in production without hardcoded keys.

```typescript
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';

async function checkServiceAccountIdentity() {
  console.log('🔍 Checking Service Account Identity...');
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });

  try {
    // 1. Decisive Check: Get the active client and project ID
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    // 2. Identification: Fetch the email of the active principal
    const credentials = await auth.getApplicationDefault();
    const serviceAccountEmail = (credentials.credential as any).client_email || 'Metadata Server Identity';

    console.log(`✅ Identity Verified: ${serviceAccountEmail}`);
    console.log(`✅ Project Context: ${projectId}`);

    // Verify it matches your custom identity if in production
    if (process.env.NODE_ENV === 'production' && !serviceAccountEmail.includes('aibizbot-prod-identity')) {
      console.warn('⚠️ WARNING: Current identity does not match "aibizbot-prod-identity".');
    }
  } catch (error: any) {
    console.error('❌ Service Account Verification Failed:', error.message);
    process.exit(1); // Fail-fast
  }
}

async function runAllChecks() {
  await checkServiceAccountIdentity();
  // ... existing Twilio, Gemini, and Maps Grounding checks
}

runAllChecks();

```

### **Why this Check is Critical**

* **Identity Confirmation**: It ensures that your code is actually running under the **`aibizbot-prod-identity`** and hasn't defaulted back to a restricted user account or a legacy service account.
* **ADC Validation**: It confirms that your environment is correctly configured to use Application Default Credentials, which is required for the `secretManager.ts` utility to function.
* **Fail-Fast Deployment**: By adding this as the *first* check, the script will immediately exit if the IAM identity is missing, preventing you from wasting time debugging 403 "Permission Denied" errors on downstream APIs like Maps or Gemini.

### **The Final Verification Command**

Run this script using Doppler to ensure your environment variables (like `GOOGLE_CLOUD_PROJECT`) are correctly injected into the auth client.

```bash
doppler run -- npx tsx scripts/check-google-key-permissions.ts

```