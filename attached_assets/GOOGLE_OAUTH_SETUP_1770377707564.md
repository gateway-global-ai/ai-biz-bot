# Google OAuth Setup Guide

## Setting Up Google OAuth for Customer Portal

This guide explains how to set up Google OAuth for the customer portal to enable Google Sheets, Calendar, and Gmail integrations.

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen first
6. Select **Web application** as the application type
7. Add the following **Authorized redirect URIs**:

### Development (Local):
```
http://localhost:3000/api/customer/google/oauth/callback
```

### Production:
```
https://dev.platformeconomics.ai/api/customer/google/oauth/callback
```

If using Vercel or another platform:
```
https://your-app.vercel.app/api/customer/google/oauth/callback
```

### For this project (dev.platformeconomics.ai):
```
https://dev.platformeconomics.ai/api/customer/google/oauth/callback
```

## Step 2: Update Environment Variables

Add the following to your `.env.local` or environment variables:

```bash
# Google OAuth
# For production (dev.platformeconomics.ai):
NEXT_PUBLIC_APP_URL=https://dev.platformeconomics.ai

# For local development:
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth credentials (already in database)
# These are stored in the google_places_config table
```

## Step 3: Update Database

The OAuth client ID and secret should already be in the `google_places_config` table. If not, update them:

```sql
UPDATE google_places_config
SET 
  oauth_client_id = 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  oauth_client_secret = 'YOUR_CLIENT_SECRET',
  updated_at = NOW()
WHERE enabled = TRUE;
```

## Step 4: Required OAuth Scopes

The following scopes are requested:

- **Google Sheets**: `https://www.googleapis.com/auth/spreadsheets`
- **Google Calendar**: `https://www.googleapis.com/auth/calendar`
- **Gmail**: 
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.readonly`

## Step 5: Test the Integration

1. Go to `/customer/login` and log in with a converted customer
2. Navigate to `/customer/dashboard`
3. Click **Connect** on any Google service (Sheets, Calendar, or Gmail)
4. You should be redirected to Google's consent screen
5. After authorizing, you'll be redirected back to the dashboard

## Troubleshooting

### Error 400: redirect_uri_mismatch

**Problem**: The redirect URI in your Google Cloud Console doesn't match the one being used.

**Solution**:
1. Check the redirect URI in the error message
2. Add it to **Authorized redirect URIs** in Google Cloud Console
3. Make sure there are no trailing slashes or extra characters
4. Wait a few minutes for changes to propagate

### Common Redirect URIs

- **Development**: `http://localhost:3000/api/customer/google/oauth/callback`
- **Vercel**: `https://your-app.vercel.app/api/customer/google/oauth/callback`
- **Custom Domain**: `https://yourdomain.com/api/customer/google/oauth/callback`

### Multiple Environments

If you have multiple environments (dev, staging, production), add all redirect URIs to Google Cloud Console:

```
http://localhost:3000/api/customer/google/oauth/callback
https://staging.yourdomain.com/api/customer/google/oauth/callback
https://yourdomain.com/api/customer/google/oauth/callback
```

## Security Notes

- Never commit OAuth credentials to version control
- Use environment variables for sensitive data
- Store tokens securely in the database (encrypted in production)
- Implement token refresh logic for expired tokens
- Use HTTPS in production

## Next Steps

After setting up OAuth:
1. Test the connection flow
2. Implement token refresh logic
3. Add error handling for expired tokens
4. Set up webhooks for token revocation (optional)

