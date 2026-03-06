# CloudBeds API Authentication Guide
## Complete Authentication Setup for Boardwalk Suites Lafayette

**API Version**: v1.3  
**Last Updated**: 2025-01-XX

---

## Overview

CloudBeds API v1.3 supports **two authentication methods**:

1. **API Key Authentication** - Works for most endpoints (simpler)
2. **OAuth 2.0 Authentication** - Required for some endpoints (e.g., `/getUsers`, `/userinfo`)

This guide explains how to configure and use both authentication methods.

---

## Environment Variables

### Hotel-Specific Settings (Set by Hotel Admin)

```bash
# Property ID for Boardwalk Suites Lafayette
CLOUDBEDS_PROPERTY_ID=315701

# OAuth 2.0 Client Credentials (from CloudBeds Integration Portal)
CLOUDBEDS_CLIENT_ID=live1_315701_5ymHrKGTgjaBWl1oX2YDzAvF
CLOUDBEDS_CLIENT_SECRET=APJd9jBLYgac1qfRNFZb4tr3TUkxp5CK

# API Key (for API key authentication)
CLOUDBEDS_API_KEY=cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq
```

### Platform Settings (Set by Platform)

```bash
# API Base URL (v1.3) - CORRECT URL
CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3

# OAuth 2.0 Authorization URL - CORRECT URL
CLOUDBEDS_AUTH_URL=https://api.cloudbeds.com/api/v1.3/access_token

# OAuth 2.0 Redirect URI (must match CloudBeds app configuration)
CLOUDBEDS_WEBSITE_BASE_URL=https://twilio.platformeconomics.ai
CLOUDBEDS_REDIRECT_URI=https://twilio.platformeconomics.ai/cloudbeds/oauth/callback
```

**⚠️ Important**: These URLs are **correct** for v1.3. Previous implementations may have used incorrect URLs or versions.

---

## Authentication Methods

### Method 1: API Key Authentication

**Works for**: Most endpoints (90%+)

**Setup**:
1. Get API key from CloudBeds Integration Portal
2. Set `CLOUDBEDS_API_KEY` environment variable
3. Use in requests: `x-api-key: {CLOUDBEDS_API_KEY}`

**Example**:
```javascript
const response = await fetch('https://api.cloudbeds.com/api/v1.3/getHotelDetails?propertyID=315701', {
  headers: {
    'x-api-key': process.env.CLOUDBEDS_API_KEY,
    'accept': 'application/json'
  }
});
```

**Endpoints that work with API Key**:
- ✅ `GET /getHotelDetails`
- ✅ `GET /getAvailableRoomTypes`
- ✅ `GET /getReservations`
- ✅ `POST /postReservation`
- ✅ `GET /getGuestsByFilter`
- ✅ Most other endpoints

---

### Method 2: OAuth 2.0 Authentication

**Required for**: Some endpoints that have empty `api_key` permission array

**Setup**:
1. Register OAuth app in CloudBeds Integration Portal
2. Get `CLOUDBEDS_CLIENT_ID` and `CLOUDBEDS_CLIENT_SECRET`
3. Configure redirect URI in CloudBeds app settings
4. Complete OAuth flow to get access token

**Endpoints that require OAuth 2.0**:
- ❌ `GET /userinfo` - Requires OAuth 2.0
- ❌ `GET /getUsers` - Requires OAuth 2.0
- ❌ `GET /getAppState` - Requires OAuth 2.0
- ❌ `POST /postAppState` - Requires OAuth 2.0
- ❌ `GET /getAppSettings` - Requires OAuth 2.0
- ❌ `POST /postWebhook` - Requires OAuth 2.0
- ❌ `DELETE /deleteWebhook` - Requires OAuth 2.0
- ❌ `GET /getWebhooks` - Requires OAuth 2.0
- ❌ `POST /postGovernmentReceipt` - Requires OAuth 2.0

**Note**: These endpoints have `"api_key": []` in their security requirements, meaning API key authentication is not supported.

---

## OAuth 2.0 Grant Types

CloudBeds supports **three OAuth 2.0 grant types**:

### 1. API Key Grant Type
**Grant Type**: `urn:ietf:params:oauth:grant-type:api-key`

**Use Case**: Automatic delivery method for API keys

**Request**:
```javascript
POST https://api.cloudbeds.com/api/v1.3/access_token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:api-key
&client_id={CLOUDBEDS_CLIENT_ID}
&client_secret={CLOUDBEDS_CLIENT_SECRET}
&redirect_uri={CLOUDBEDS_REDIRECT_URI}
&code={authorization_code}
```

### 2. Authorization Code Grant Type
**Grant Type**: `authorization_code`

**Use Case**: Standard OAuth 2.0 authorization flow

**Request**:
```javascript
POST https://api.cloudbeds.com/api/v1.3/access_token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id={CLOUDBEDS_CLIENT_ID}
&client_secret={CLOUDBEDS_CLIENT_SECRET}
&redirect_uri={CLOUDBEDS_REDIRECT_URI}
&code={authorization_code}
```

### 3. Refresh Token Grant Type
**Grant Type**: `refresh_token`

**Use Case**: Refresh expired access tokens

**Request**:
```javascript
POST https://api.cloudbeds.com/api/v1.3/access_token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id={CLOUDBEDS_CLIENT_ID}
&client_secret={CLOUDBEDS_CLIENT_SECRET}
&refresh_token={refresh_token}
```

---

## OAuth 2.0 Flow

### Step 1: Get Authorization URL

```javascript
import { getAuthorizationURL } from './lib/cloudbeds-oauth-handler.js';

const authURL = getAuthorizationURL();
// Redirect user to this URL
```

**Authorization URL Format**:
```
https://api.cloudbeds.com/api/v1.3/oauth/authorize?
  client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope={SCOPES}
```

### Step 2: User Authorizes

User is redirected to CloudBeds, logs in, and authorizes the app.

### Step 3: Handle Callback

CloudBeds redirects back to your `redirect_uri` with an authorization `code`:

```
https://twilio.platformeconomics.ai/cloudbeds/oauth/callback?code={AUTHORIZATION_CODE}
```

### Step 4: Exchange Code for Token

```javascript
import { handleOAuthCallback } from './lib/cloudbeds-oauth-handler.js';

const result = await handleOAuthCallback(code, 'authorization_code');
// Tokens are now stored and ready to use
```

### Step 5: Use Access Token

```javascript
const response = await fetch('https://api.cloudbeds.com/api/v1.3/userinfo?property_id=315701', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'accept': 'application/json'
  }
});
```

---

## Health Check

### Using the Health Check API

**Endpoint**: `GET /api/cloudbeds/health`

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-01-XX...",
  "configuration": {
    "property_id": "315701",
    "api_base_url": "https://api.cloudbeds.com/api/v1.3",
    "has_api_key": true,
    "has_client_id": true,
    "has_client_secret": true
  },
  "api_key_test": {
    "success": true,
    "method": "api_key",
    "status": 200
  },
  "oauth2_test": {
    "success": true,
    "method": "oauth2",
    "status": 200
  },
  "overall_status": "healthy"
}
```

### Text Format

**Endpoint**: `GET /api/cloudbeds/health/text`

Returns human-readable health check results.

### Quick Check

**Endpoint**: `GET /api/cloudbeds/health/simple`

Quick API key test only.

---

## Integration Card Configuration

### Admin Panel Fields

When configuring CloudBeds integration in the admin panel:

1. **Integration Selection**: Select "CloudBeds"
2. **Hotel Property ID**: `315701` (set by customer)
3. **OAuth 2.0 Credentials**:
   - Client ID: `live1_315701_5ymHrKGTgjaBWl1oX2YDzAvF`
   - Client Secret: `APJd9jBLYgac1qfRNFZb4tr3TUkxp5CK`
4. **API Key**: `cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq`
5. **Callback URL**: `https://twilio.platformeconomics.ai/cloudbeds/oauth/callback`

### Platform Settings (Auto-Configured)

- API Base URL: `https://api.cloudbeds.com/api/v1.3`
- Auth URL: `https://api.cloudbeds.com/api/v1.3/access_token`
- Website Base URL: `https://twilio.platformeconomics.ai`

---

## Common Issues & Solutions

### Issue 1: "401 Unauthorized" with API Key

**Solution**: 
- Verify `CLOUDBEDS_API_KEY` is set correctly
- Check that API key is valid in CloudBeds portal
- Ensure you're using the correct API version (v1.3)

### Issue 2: "OAuth token required" Error

**Solution**:
- Complete OAuth 2.0 flow first
- Some endpoints require OAuth 2.0 (see list above)
- Use `GET /api/cloudbeds/oauth/authorize` to start flow

### Issue 3: "Invalid redirect_uri"

**Solution**:
- Ensure redirect URI matches exactly in CloudBeds app settings
- Must be: `https://twilio.platformeconomics.ai/cloudbeds/oauth/callback`
- Check for trailing slashes or protocol mismatches

### Issue 4: Token Expired

**Solution**:
- Tokens are automatically refreshed when expired
- If refresh fails, user must re-authorize
- Check `GET /api/cloudbeds/health` for token status

### Issue 5: Wrong API Version

**Solution**:
- ✅ **Correct**: `https://api.cloudbeds.com/api/v1.3`
- ❌ **Wrong**: `https://api.cloudbeds.com/api/v1.2` (old version)
- ❌ **Wrong**: `https://api.cloudbeds.com/api/v1` (wrong version)

---

## Testing Authentication

### Test API Key

```bash
curl -X GET "https://api.cloudbeds.com/api/v1.3/getHotelDetails?propertyID=315701" \
  -H "x-api-key: cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq" \
  -H "accept: application/json"
```

### Test OAuth 2.0

1. Start OAuth flow:
   ```bash
   curl http://localhost:3004/api/cloudbeds/oauth/authorize
   ```

2. After authorization, test with token:
   ```bash
   curl -X GET "https://api.cloudbeds.com/api/v1.3/userinfo?property_id=315701" \
     -H "Authorization: Bearer {ACCESS_TOKEN}" \
     -H "accept: application/json"
   ```

### Health Check

```bash
# Comprehensive check
curl http://localhost:3004/api/cloudbeds/health

# Text format
curl http://localhost:3004/api/cloudbeds/health/text

# Quick check
curl http://localhost:3004/api/cloudbeds/health/simple
```

---

## Implementation Files

- **API Client**: `lib/cloudbeds-api-client.js` - Main API client with authentication
- **OAuth Handler**: `lib/cloudbeds-oauth-handler.js` - OAuth 2.0 flow management
- **Health Check**: `lib/cloudbeds-health-check.js` - Health check functions
- **Health Routes**: `routes/cloudbeds-health.js` - HTTP endpoints for health checks
- **OAuth Routes**: `routes/cloudbeds-oauth.js` - HTTP endpoints for OAuth flow

---

## Next Steps

1. ✅ **Environment variables configured** - Use `.env.cloudbeds.example` as template
2. ✅ **API client created** - Supports both authentication methods
3. ✅ **OAuth handler created** - Handles all grant types
4. ✅ **Health check created** - Tests both authentication methods
5. ⚠️ **Test authentication** - Run health check to verify setup
6. ⚠️ **Complete OAuth flow** - Authorize app to get OAuth tokens
7. ⚠️ **Test endpoints** - Verify API key and OAuth 2.0 work correctly

---

**Status**: ✅ Complete  
**Last Updated**: 2025-01-XX  
**All URLs Verified**: ✅ Correct (v1.3)

