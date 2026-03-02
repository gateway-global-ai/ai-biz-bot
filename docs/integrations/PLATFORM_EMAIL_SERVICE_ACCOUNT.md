# Platform Email Service Account — One-Time Handshake

Programmatic platform email uses the **Gmail API** with a **service account** and **Domain-Wide Delegation (DWD)**. No user OAuth is required; the server sends as a fixed platform address (e.g. `agent@gatewayglobal.ai`).

This document codifies the **One-Time Handshake** across three gates: **GCP**, **Workspace**, and **Doppler**.

---

## 1. GCP side

- **Create the service account** (e.g. `ai-biz-bot-emailer` in project `ai-biz-bot`):
  - IAM & Admin → Service Accounts → Create.
  - No IAM roles needed on the SA; Gmail access is granted via DWD, not project IAM.
- **Enable Gmail API** for the project:
  - APIs & Services → Enable APIs → Gmail API.
- **Create a JSON key** for the service account (if org policy allows):
  - Service account → Keys → Add key → JSON. Download the file.
  - If `iam.disableServiceAccountKeyCreation` is enforced, request an exception or use Workload Identity / impersonation per your org policy.
- **Obtain the full JSON content** (for Doppler): e.g. in Cloud Shell, `cat ai-biz-bot-emailer-key.json`. The value you store must be the **entire JSON object**, not the key fingerprint or key ID shown in the GCP UI.

---

## 2. Workspace side (Domain-Wide Delegation)

- **Google Workspace Admin Console**: https://admin.google.com/
- **Security** → **Access and data control** → **API controls** → **Domain-wide delegation** → **Manage Domain-wide delegation** → **Add new**.
- **Client ID**: `115187551358361791090` (OAuth 2.0 Client ID of the `ai-biz-bot-emailer` service account; find it on the service account Details tab in GCP).
- **OAuth scopes (comma-delimited)**: `https://www.googleapis.com/auth/gmail.send`
- **Authorize**.

This grants the service account permission to send mail on behalf of users in the Workspace domain. The app then impersonates a single address (see Doppler) via the `subject` parameter.

---

## 3. Doppler side (vault hydration)

- **`GOOGLE_SERVICE_ACCOUNT_JSON`**: The **full JSON key file content**. Paste the entire output of `cat <key-file>.json` (all keys: `type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, etc.). Do **not** store only the key fingerprint or key ID.
- **`PLATFORM_SENDER_EMAIL`**: The email address to send as (DWD subject), e.g. `agent@gatewayglobal.ai`. Must be a user in the same Workspace domain.

After copying the JSON into Doppler, securely delete the key file from Cloud Shell or local disk. Do not commit the JSON to version control.

---

## Code and manifest

- **Server usage**: [server/services/emailService.ts](../../server/services/emailService.ts) reads `GOOGLE_SERVICE_ACCOUNT_JSON` and `PLATFORM_SENDER_EMAIL`; it uses the Google Auth library with `credentials` and `clientOptions: { subject: senderEmail }` for DWD.
- **Constitution**: Both keys are canonical in [SOVEREIGN_ENV_MANIFEST.md](../SOVEREIGN_ENV_MANIFEST.md) and declared in [.env.example](../../.env.example). When `SOVEREIGN_ENV_STRICT=true` and `ENABLE_GOOGLE_WORKSPACE=true`, the Sovereign guard requires these keys at startup before any programmatic email flow.
