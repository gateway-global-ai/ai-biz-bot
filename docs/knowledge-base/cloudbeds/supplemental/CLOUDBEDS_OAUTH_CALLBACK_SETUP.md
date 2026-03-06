# CloudBeds OAuth 2.0 Callback URL Setup

**Date**: 2025-11-13  
**Status**: Ready for Configuration

---

## Callback URL Configuration

### Current Configuration in CloudBeds Backend
**Current Callback URL**: `https://api.platformeconomics.ai/callback`

### New Callback URL to Configure

**Primary URL** (recommended):
```
https://twilio.platformeconomics.ai/cloudbeds/oauth/callback
```

**Alternative URL** (also works):
```
https://twilio.platformeconomics.ai/api/cloudbeds/oauth/callback
```

Both URLs point to the same endpoint handler in `server-realtime.js`.

---

## Steps to Update CloudBeds Configuration

1. **Log into CloudBeds Integration Portal**
   - Go to your CloudBeds integration settings
   - Find the OAuth 2.0 application configuration

2. **Update Redirect URI**
   - Change from: `https://api.platformeconomics.ai/callback`
   - Change to: `https://twilio.platformeconomics.ai/cloudbeds/oauth/callback`
   - **Important**: The URL must match exactly (including protocol, domain, and path)

3. **Save Configuration**
   - Save the changes in CloudBeds
   - Wait a few moments for changes to propagate

4. **Test the Callback**
   - After updating, we'll test the OAuth flow
   - Use the test endpoint: `GET /cloudbeds/oauth/authorize`

---

## Endpoint Implementation

The callback endpoint is implemented in:
- **File**: `websocket-server/server-realtime.js`
- **Path**: `/cloudbeds/oauth/callback` or `/api/cloudbeds/oauth/callback`
- **Method**: `GET`
- **Query Parameters**:
  - `code` (required): Authorization code from CloudBeds
  - `grant_type` (optional): Grant type (defaults to `authorization_code`)
  - `error` (optional): Error code if authorization failed
  - `error_description` (optional): Error description

---

## Testing After Configuration

Once you've updated the callback URL in CloudBeds, we can test:

1. **Start OAuth Flow**:
   ```bash
   curl https://twilio.platformeconomics.ai/cloudbeds/oauth/authorize
   ```
   This will redirect you to CloudBeds authorization page.

2. **After Authorization**:
   - CloudBeds will redirect back to: `https://twilio.platformeconomics.ai/cloudbeds/oauth/callback?code={AUTHORIZATION_CODE}`
   - The endpoint will exchange the code for tokens
   - Tokens will be stored and ready to use

3. **Check Status**:
   ```bash
   curl https://twilio.platformeconomics.ai/cloudbeds/oauth/status
   ```

4. **Test OAuth-Protected Endpoint**:
   ```bash
   curl https://twilio.platformeconomics.ai/cloudbeds/health
   ```

---

## Environment Variables

Make sure these are set in your `.env` file:

```bash
CLOUDBEDS_PROPERTY_ID=315701
CLOUDBEDS_CLIENT_ID=live1_315701_5ymHrKGTgjaBWl1oX2YDzAvF
CLOUDBEDS_CLIENT_SECRET=APJd9jBLYgac1qfRNFZb4tr3TUkxp5CK
CLOUDBEDS_API_KEY=cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq
CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3
CLOUDBEDS_AUTH_URL=https://api.cloudbeds.com/api/v1.3/access_token
CLOUDBEDS_WEBSITE_BASE_URL=https://twilio.platformeconomics.ai
CLOUDBEDS_REDIRECT_URI=https://twilio.platformeconomics.ai/cloudbeds/oauth/callback
```

---

## Callback Endpoint Details

### Request Format
```
GET /cloudbeds/oauth/callback?code={AUTHORIZATION_CODE}&grant_type=authorization_code
```

### Success Response
```json
{
  "success": true,
  "message": "OAuth authorization successful. Tokens have been stored.",
  "has_tokens": true
}
```

### Error Response
```json
{
  "success": false,
  "error": "error_code",
  "error_description": "Error description from CloudBeds"
}
```

---

## Next Steps

1. ✅ **Callback endpoint created** - Ready to receive OAuth callbacks
2. ⚠️ **Update CloudBeds configuration** - Change redirect URI to new URL
3. ⚠️ **Test OAuth flow** - After configuration update, test the complete flow
4. ⚠️ **Verify token storage** - Confirm tokens are stored correctly
5. ⚠️ **Test OAuth endpoints** - Test `/getUsers` and other OAuth-required endpoints

---

**Callback URL Ready**: ✅  
**Waiting for CloudBeds Configuration Update**: ⚠️  
**Ready to Test**: After you update the callback URL in CloudBeds

