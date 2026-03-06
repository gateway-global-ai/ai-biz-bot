# OAuth 2.0 Implementation Guide

## Official Cloudbeds Documentation

This implementation follows the official Cloudbeds OAuth 2.0 authentication documentation:
- **Main Documentation**: https://developers.cloudbeds.com/docs/alternative-oauth-20-authentication-method
- **API Endpoint**: `https://api.cloudbeds.com/api/v1.3/access_token`

## OAuth 2.0 Flow

### 1. Authorization URL

Generate the authorization URL to redirect users:

```
GET https://api.cloudbeds.com/api/v1.3/oauth?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<OPTIONAL_STATE>
```

**Parameters:**
- `client_id`: Your Cloudbeds client ID
- `redirect_uri`: Your preconfigured redirect URI
- `state`: Optional state parameter for CSRF protection
- `scope`: Optional permission scopes

### 2. User Authorization

User authorizes the app in Cloudbeds and is redirected to your redirect URI with:
- `code`: Authorization code (valid for 10 minutes, single-use)
- `state`: The state parameter you sent (or random if not provided)

**Example redirect:**
```
https://www.myredirecturi.com/oauth_code?code=ob7ajLINOP1VNnMfAxCu1aX4jBvyz6vg&state=12ddc1756afbc355
```

### 3. Exchange Authorization Code for Access Token

**Endpoint:** `POST https://api.cloudbeds.com/api/v1.3/access_token`

**Grant Type:** `authorization_code`

**Request Body (form-urlencoded):**
```
grant_type=authorization_code
&code=<AUTHORIZATION_CODE>
&redirect_uri=<REDIRECT_URI>
&client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
```

**Response:**
```json
{
  "access_token": "vjsZOLa2tMazV09T01SlwIQGq8HC56LYL8kXcBBp",
  "refresh_token": "permanent_refresh_token",
  "expires_in": 28800,
  "token_type": "Bearer",
  "resources": {
    "propertyID": "315701"
  }
}
```

### 4. Use Access Token

Include the access token in the Authorization header:

```
Authorization: Bearer vjsZOLa2tMazV09T01SlwIQGq8HC56LYL8kXcBBp
```

### 5. Refresh Access Token

**Endpoint:** `POST https://api.cloudbeds.com/api/v1.3/access_token`

**Grant Type:** `refresh_token`

**Request Body (form-urlencoded):**
```
grant_type=refresh_token
&refresh_token=<REFRESH_TOKEN>
&client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
```

**Important Notes:**
- Access tokens expire after **8 hours (28800 seconds)**
- Refresh tokens are valid for **365 days**
- Refresh token expiration **extends** with each successful access token use
- **Make at least one API call every 365 days** to prevent refresh token expiration
- If refresh token expires, user must re-authorize

## API Key Authentication (Alternative)

### Exchange API Key Code

**Endpoint:** `POST https://api.cloudbeds.com/api/v1.3/access_token`

**Grant Type:** `urn:ietf:params:oauth:grant-type:api-key`

**Request Body (form-urlencoded):**
```
grant_type=urn:ietf:params:oauth:grant-type:api-key
&code=<AUTHORIZATION_CODE>
&redirect_uri=<REDIRECT_URI>
&client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
```

## Implementation in This Project

### Configuration

All OAuth endpoints are configured in `src/auth/oauth2.js`:

```javascript
const ACCESS_TOKEN_URL = 'https://api.cloudbeds.com/api/v1.3/access_token';
const AUTH_BASE_URL = 'https://api.cloudbeds.com/api/v1.3/oauth';
```

### Functions Available

1. **`getAuthorizationUrl(state, scopes)`**
   - Generates OAuth authorization URL
   - Includes state parameter for CSRF protection

2. **`exchangeCodeForToken(code, userId, storeCode)`**
   - Exchanges authorization code for access token
   - Stores encrypted token in database
   - Optionally stores encrypted authorization code

3. **`refreshAccessToken(refreshToken, userId)`**
   - Refreshes expired access token
   - Updates encrypted token in database
   - Handles 365-day refresh token expiration

4. **`getAccessToken(req)`**
   - Retrieves valid access token for request
   - Checks token expiration and refreshes if needed
   - Supports token from Authorization header or database

5. **`exchangeApiKeyCode(code)`**
   - Exchanges authorization code for API key (automatic delivery method)

### Token Storage

Tokens are encrypted using AES-256-GCM before storage in Supabase:
- `access_token`: Encrypted with `OAUTH_TOKEN_SECRET`
- `refresh_token`: Encrypted with `OAUTH_TOKEN_SECRET`
- `authorization_code`: Optional, encrypted with `OAUTH_CODE_SECRET`

### Security Features

✅ **Token Encryption**: All tokens encrypted at rest  
✅ **Token Expiration**: Automatic refresh on expiration  
✅ **Refresh Token Management**: 365-day expiration tracking  
✅ **CSRF Protection**: State parameter support  
✅ **Error Handling**: Comprehensive error messages  

## Best Practices

1. **Token Refresh**
   - Always refresh tokens before they expire
   - Make at least one API call every 365 days to extend refresh token
   - Don't use webhooks as trigger for token refresh (can cause race conditions)

2. **Error Handling**
   - Handle "authorization code expired" errors (user must re-authorize)
   - Handle "refresh token expired" errors (user must re-authorize)
   - Log authentication errors for debugging

3. **Security**
   - Never log tokens in plain text
   - Always use HTTPS for redirect URIs
   - Validate state parameter to prevent CSRF attacks
   - Store tokens encrypted in database

4. **Testing**
   - Use Postman for OAuth flow testing
   - Set up test credentials in Cloudbeds Developer Portal
   - Use `https://www.getpostman.com/oauth2/callback` as redirect URI for Postman

## Common Issues

### Authorization Code Expired

**Error:** "The authorization code is invalid or has expired."

**Solution:** Authorization codes are valid for 10 minutes and single-use. User must complete authorization again.

### Refresh Token Expired

**Error:** "token has expired"

**Solution:** Refresh token has expired (365 days of inactivity). User must re-authorize the app.

### Invalid Redirect URI

**Error:** "redirect_uri mismatch"

**Solution:** Ensure redirect URI matches exactly what's configured in Cloudbeds Developer Portal.

## References

- [Cloudbeds OAuth 2.0 Documentation](https://developers.cloudbeds.com/docs/alternative-oauth-20-authentication-method)
- [API Keys Authentication Guide](https://developers.cloudbeds.com/docs/api-keys-authentication-guide-for-technology-partners)
- [User Authorization Flow Options](https://developers.cloudbeds.com/docs/user-authorization-flow-options)

