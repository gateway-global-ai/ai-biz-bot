# CloudBeds OAuth SDK & Dashboard - Complete Package

This package provides a complete solution for CloudBeds OAuth 2.0 integration, including an SDK for developers and a dashboard for managing OAuth applications.

## 📦 Package Contents

### 1. SDK (`cloudbeds-oauth-sdk/`)

A TypeScript SDK that provides a simple interface for CloudBeds OAuth authentication.

**Features:**
- Check authorization status
- Get authorization URLs
- Ensure authorized state
- Type-safe API

**Usage:**
```javascript
import CloudBedsOAuthSDK from '@platformeconomics/cloudbeds-oauth-sdk';

const sdk = new CloudBedsOAuthSDK({
  clientId: process.env.CLOUDBEDS_CLIENT_ID,
  clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET,
  propertyId: process.env.CLOUDBEDS_PROPERTY_ID
});

const status = await sdk.checkStatus();
if (!status.authorized) {
  const authData = await sdk.getAuthorizationUrl();
  // Redirect user to authData.authorization_url
}
```

**Example Code:**
- `examples/cloudbeds-auth-example.js` - Complete working example
- `examples/.env.example` - Environment variable template

### 2. Dashboard (`cloudbeds-oauth-dashboard/`)

A modern React dashboard built with shadcn/ui for managing OAuth applications.

**Features:**
- **Property Configuration**: Manage property ID, admin name, phone, email
- **OAuth Applications Table**: View all configured applications
- **Add/Remove Applications**: Full CRUD operations
- **Status Health Checks**: Visual indicators (green/red/yellow)
- **Authorization Flow**: One-click authorization button
- **Real-time Status**: Refresh status on demand

**Status Colors:**
- 🟢 **Green**: Authorized and active
- 🔴 **Red**: Not authorized or expired
- 🟡 **Yellow**: Health check failed

## 🚀 Quick Start

### SDK Setup

1. Install the SDK:
```bash
cd cloudbeds-oauth-sdk
npm install
```

2. Copy example:
```bash
cp examples/.env.example examples/.env
# Edit .env with your credentials
```

3. Run example:
```bash
cd examples
npm install
node cloudbeds-auth-example.js
```

### Dashboard Setup

1. Install dependencies:
```bash
cd cloudbeds-oauth-dashboard
npm install
```

2. Create `.env`:
```env
VITE_API_BASE_URL=https://twilio.platformeconomics.ai/api/cloudbeds
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## 📋 Dashboard Usage

### Property Configuration Tab

1. Enter Property ID (e.g., `315701`)
2. Fill in admin details:
   - Admin Name
   - Admin Phone
   - Admin Email
3. Click "Save Configuration"

### OAuth Applications Tab

**Adding an Application:**
1. Click "Add Application"
2. Fill in:
   - **Application Name**: Unique identifier (e.g., `replit`, `production`)
   - **Property ID**: Your CloudBeds property ID
   - **Client ID**: From CloudBeds Integration Portal
   - **Client Secret**: From CloudBeds Integration Portal
   - **API Key**: Optional CloudBeds API key
   - **Redirect URI**: OAuth callback URL
   - **Description**: Optional description
3. Click "Add Application"

**Authorizing an Application:**
1. Click the authorization button (🔗 icon) next to an application
2. CloudBeds authorization page opens in a new tab
3. Log in and approve the integration
4. You'll be redirected back and tokens stored automatically

**Checking Status:**
- Click the refresh icon (🔄) to check current authorization status
- Status is displayed with color-coded badges

**Removing an Application:**
- Click the delete button (🗑️) next to an application
- Confirm deletion

## 🔐 Security

- **client_secret is REQUIRED** for all authorization operations
- Secrets are stored securely in Supabase database
- Dashboard uses secure API endpoints with authentication
- Never expose client_secret in client-side code

## 📚 API Endpoints

The dashboard and SDK use these backend endpoints:

- `GET /api/cloudbeds/config` - Get property configuration
- `POST /api/cloudbeds/config` - Update property configuration
- `GET /api/cloudbeds/applications/status` - Get all applications with status
- `GET /api/cloudbeds/oauth/applications` - List all applications
- `POST /api/cloudbeds/oauth/applications` - Add new application
- `GET /api/cloudbeds/oauth/applications/:name` - Get application details
- `DELETE /api/cloudbeds/oauth/applications/:name` - Delete application
- `POST /api/cloudbeds/oauth/authorize-api` - Get authorization URL
- `GET /api/cloudbeds/oauth/status` - Check authorization status

## 🗄️ Database Schema

### `cloudbeds_property_config`
- `property_id` (PRIMARY KEY)
- `admin_name`
- `admin_phone`
- `admin_email`
- `created_at`
- `updated_at`

### `cloudbeds_oauth_applications`
- `application_name` (PRIMARY KEY)
- `property_id`
- `client_id`
- `client_secret`
- `redirect_uri`
- `description`
- `is_active`
- `created_at`
- `updated_at`

### `cloudbeds_oauth_tokens`
- `property_id` + `application_name` (COMPOSITE PRIMARY KEY)
- `client_id`
- `access_token`
- `refresh_token`
- `token_type`
- `scope`
- `expires_at`
- `refresh_expires_at`
- `created_at`
- `updated_at`

## 📝 For CloudBeds Documentation

When uploading to CloudBeds, include:

1. **SDK Package** (`cloudbeds-oauth-sdk/`)
   - Complete TypeScript SDK
   - Example code with `.env.example`
   - README with usage instructions

2. **Dashboard** (`cloudbeds-oauth-dashboard/`)
   - Complete React application
   - Production-ready build
   - README with setup instructions

3. **SQL Migrations** (`cloudbeds-oauth-component/sql/`)
   - `create_property_config_table.sql`
   - `add_multi_application_support.sql`

## 🎯 Key Features

✅ **Multi-Application Support**: Manage multiple OAuth applications per property  
✅ **Secure**: client_secret required for all operations  
✅ **Visual Status**: Color-coded health checks  
✅ **Easy Management**: Add/remove applications from UI  
✅ **Type-Safe**: Full TypeScript support  
✅ **Production Ready**: Complete error handling and validation  

## 📞 Support

For issues or questions:
- Check the README files in each package
- Review the example code
- Check API endpoint documentation


