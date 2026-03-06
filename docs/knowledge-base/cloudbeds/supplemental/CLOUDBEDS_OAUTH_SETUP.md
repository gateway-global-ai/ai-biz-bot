# CloudBeds OAuth 2.0 Setup Guide

**Status**: ✅ **IMPLEMENTED AND READY**

---

## Overview

This guide walks you through setting up OAuth 2.0 authentication for CloudBeds API to enable write operations (like creating reservations).

---

## Prerequisites

1. CloudBeds account with API access enabled
2. Access to CloudBeds Settings > API Credentials
3. Admin permissions to create API credentials

---

## Step 1: Create API Credentials in CloudBeds

1. **Navigate to CloudBeds Dashboard**:
   - Go to: **Accounts > Settings > API Credentials**

2. **Click "New Credentials"**

3. **Fill in the form**:
   - **Name**: `Twilio Voice AI Platform` (or your preferred name)
   - **Integration type**: Select appropriate type from dropdown
   - **Redirect URI**: `https://twilio.platformeconomics.ai/api/cloudbeds/oauth/callback`

4. **Click "Save"**

5. **Copy your credentials**:
   - `client_id` (shown immediately)
   - `client_secret` (shown immediately - save this securely!)

---

## Step 2: Configure Environment Variables

Add these to `websocket-server/.env`:

```bash
# CloudBeds OAuth 2.0 Credentials
CLOUDBEDS_CLIENT_ID=your_client_id_here
CLOUDBEDS_CLIENT_SECRET=your_client_secret_here
CLOUDBEDS_REDIRECT_URI=https://twilio.platformeconomics.ai/api/cloudbeds/oauth/callback
CLOUDBEDS_PROPERTY_ID=315701
```

---

## Step 3: Deploy Database Schema

Run the SQL schema to create the OAuth tokens table:

**File**: `docs/CLOUDBEDS_OAUTH_SCHEMA.sql`

**Via Supabase Dashboard**:
1. Go to: https://supabase.com/dashboard/project/lejgelbjyminzfvtwuqq/sql
2. Copy SQL from `docs/CLOUDBEDS_OAUTH_SCHEMA.sql`
3. Paste and click "Run"

---

## Step 4: Authorize OAuth Access

### Option A: Direct Authorization Link

1. **Get authorization URL**:
   ```bash
   curl https://twilio.platformeconomics.ai/api/cloudbeds/oauth/authorize
   ```

2. **Open the `authorizationUrl` in your browser**

3. **Log in to CloudBeds** and approve the integration

4. **You'll be redirected** to the callback URL with a success message

### Option B: Manual Authorization

1. **Construct OAuth URL**:
   ```
   https://api.cloudbeds.com/api/v1.3/oauth?client_id=YOUR_CLIENT_ID&redirect_uri=https://twilio.platformeconomics.ai/api/cloudbeds/oauth/callback&response_type=code
   ```

2. **Open in browser** and approve

3. **Authorization code** will be automatically exchanged for tokens

---

## Step 5: Verify OAuth Status

Check if OAuth is configured:

```bash
curl https://twilio.platformeconomics.ai/api/cloudbeds/oauth/status
```

**Expected Response**:
```json
{
  "success": true,
  "authorized": true,
  "property_id": "315701",
  "expires_at": "2025-11-13T12:00:00.000Z",
  "is_expired": false,
  "needs_refresh": false
}
```

---

## Step 6: Test Reservation Creation

Once OAuth is authorized, test reservation creation:

```bash
node scripts/test-reservation-integration.js
```

**Expected**: ✅ Reservation created successfully!

---

## OAuth Endpoints

### 1. Get Authorization URL
**GET** `/api/cloudbeds/oauth/authorize`

Returns the OAuth authorization URL to open in browser.

### 2. OAuth Callback
**GET** `/api/cloudbeds/oauth/callback?code=...`

Handles the OAuth callback, exchanges code for tokens, stores in database.

### 3. Refresh Token
**POST** `/api/cloudbeds/oauth/refresh`

Manually refresh the access token (usually automatic).

### 4. Check Status
**GET** `/api/cloudbeds/oauth/status`

Check OAuth token status and expiration.

---

## Token Management

### Automatic Token Refresh

The system automatically refreshes tokens:
- **5 minutes before expiration** (access token expires in 8 hours)
- **On API calls** that require OAuth
- **Transparent to the application**

### Manual Token Refresh

If needed, manually refresh:

```bash
curl -X POST https://twilio.platformeconomics.ai/api/cloudbeds/oauth/refresh
```

### Token Storage

- **Database**: `cloudbeds_oauth_tokens` table in Supabase
- **In-Memory Cache**: For fast access during API calls
- **Auto-Sync**: Database and cache stay in sync

---

## Troubleshooting

### "OAuth token not available"

**Solution**: Complete OAuth authorization flow:
1. Visit `/api/cloudbeds/oauth/authorize`
2. Approve in CloudBeds
3. Tokens will be stored automatically

### "Token refresh failed"

**Possible Causes**:
- Refresh token expired (365 days of inactivity)
- Client secret changed
- Network error

**Solution**: Re-authorize OAuth flow

### "401 Unauthorized" on API calls

**Check**:
1. OAuth status: `/api/cloudbeds/oauth/status`
2. Token expiration
3. Client ID/Secret in `.env`

---

## Security Notes

1. **Client Secret**: Keep secure, never commit to git
2. **Access Tokens**: Valid for 8 hours
3. **Refresh Tokens**: Valid for 365 days (extends on use)
4. **Database**: Tokens stored with RLS (service role only)

---

## Next Steps After OAuth Setup

1. ✅ **Test reservation creation**: `node scripts/test-reservation-integration.js`
2. ✅ **Verify in CloudBeds**: Check that reservations appear in CloudBeds dashboard
3. 🔄 **Add SMS confirmation**: Send SMS after successful reservation
4. 🔄 **Voice AI integration**: Update conversation state

---

## Files

- **OAuth Routes**: `routes/cloudbeds-oauth.js`
- **Database Schema**: `docs/CLOUDBEDS_OAUTH_SCHEMA.sql`
- **API Client**: `lib/cloudbeds-api-client.js` (auto-uses OAuth when available)
- **Server Routes**: `websocket-server/server.js` (OAuth endpoints added)

---

**Status**: ✅ **READY FOR OAUTH AUTHORIZATION**

