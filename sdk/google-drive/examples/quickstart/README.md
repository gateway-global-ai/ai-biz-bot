# Google Drive API Quickstart

This directory contains a standalone JavaScript web application that demonstrates how to make requests to the Google Drive API using the Google API JavaScript client library.

## Overview

This quickstart follows Google's official documentation for building a client-side JavaScript application that uses the Google Drive API to list files in the user's Google Drive.

## Features

- Client-side OAuth 2.0 authentication using Google Identity Services
- List first 10 files from user's Google Drive
- Sign in/sign out functionality
- Simple HTML/JavaScript implementation (no build step required)

## Prerequisites

- Node.js & npm installed
- A Google Cloud project
- A Google account with Google Drive enabled

## Setup Instructions

### 1. Enable the Google Drive API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services > Library**
4. Search for "Google Drive API"
5. Click **Enable**

### 2. Configure OAuth Consent Screen

1. In the Google Cloud console, go to **Menu > APIs & Services > OAuth consent screen**
2. If setting up for the first time, select **External** or **Internal** user type
3. Fill in the required **App Information**:
   - Enter an **App name**
   - Choose a **User support email**
   - Enter a **Developer contact email**
4. Click **Save and Continue**
5. On the **Scopes** page, click **Save and Continue** (scopes will be requested at runtime)
6. If using External user type, add test users if needed
7. Click **Save and Continue** and then **Back to Dashboard**

### 3. Create OAuth 2.0 Client ID

1. Go to **Menu > APIs & Services > Credentials**
2. Click **Create credentials > OAuth 2.0 Client ID**
3. Select **Application type > Web application**
4. In the **Name** field, enter a name (e.g., "Drive API Quickstart")
5. Under **Authorized JavaScript origins**, click **Add URI**
6. Enter: `http://localhost:8000`
7. Click **Create**
8. **Copy the Client ID** - you'll need this in the next step

### 4. Configure the Application

1. Open `index.html` in this directory
2. Find the line: `const CLIENT_ID = '<YOUR_CLIENT_ID>';`
3. Replace `<YOUR_CLIENT_ID>` with your actual Client ID from step 3

### 5. Install Dependencies

```bash
npm install
```

### 6. Run the Application

```bash
npm start
# Or use: npx http-server -p 8000
```

### 7. Test the Application

1. Open your browser and navigate to: `http://localhost:8000`
2. You should see:
   - "Drive API Quickstart" heading
   - "Authorize" button (initially hidden until libraries load)
3. Click **Authorize**
4. Sign in with your Google account
5. Grant permissions to access your Drive files
6. The application will display the first 10 files from your Google Drive

## How It Works

### Authentication Flow

1. **Load Libraries**: The application loads two Google libraries:
   - `https://apis.google.com/js/api.js` - Google API Client Library
   - `https://accounts.google.com/gsi/client` - Google Identity Services

2. **Initialize**: 
   - `gapiLoaded()` initializes the API client with the Drive API discovery document
   - `gisLoaded()` sets up the OAuth 2.0 token client

3. **Authorization**:
   - User clicks "Authorize" button
   - OAuth 2.0 flow requests consent for `drive.metadata.readonly` scope
   - Token is obtained and stored in the client

4. **API Call**:
   - After authorization, `listFiles()` is called
   - Makes a request to `gapi.client.drive.files.list()`
   - Displays file names and IDs on the page

### Key Components

- **CLIENT_ID**: Your OAuth 2.0 client ID from Google Cloud Console
- **DISCOVERY_DOC**: URL to the Drive API v3 discovery document
- **SCOPES**: Permission scope (`drive.metadata.readonly` for read-only file metadata)
- **tokenClient**: OAuth 2.0 token client for managing authentication
- **gapi.client**: Google API client for making API calls

## Comparison to Existing Implementation

### What This Quickstart Provides

This is a **client-side only** implementation that demonstrates:
- Direct browser-based OAuth 2.0 flow using Google Identity Services
- Client-side API calls to Google Drive API
- Minimal setup with no backend required
- Suitable for testing and prototyping

**Scope**: `https://www.googleapis.com/auth/drive.metadata.readonly` (read-only file metadata)

### What the Main Repository Has

The main `chat-mvp-merge` repository has a **more comprehensive server-side** implementation:

#### Location
`server/mcp/googleWorkspace.ts`

#### Features

1. **Full Google Workspace Integration**:
   - Google Drive (read/write)
   - Google Calendar
   - Google Tasks
   - Google Docs
   - Google Sheets
   - Gmail
   - Admin Directory

2. **Server-Side OAuth 2.0**:
   - Uses OAuth 2.0 with refresh tokens
   - Secure credential storage
   - Token refresh handling
   - Support for multiple users

3. **Drive API Capabilities**:
   - List drives: `listDrives()`
   - List files: `listFiles()`
   - Create folders: `createFolder()`
   - Upload files: `uploadFile()`
   - Delete files: `deleteFile()`

4. **Additional Scopes**:
   ```javascript
   'https://www.googleapis.com/auth/calendar',
   'https://www.googleapis.com/auth/tasks',
   'https://www.googleapis.com/auth/documents',
   'https://www.googleapis.com/auth/spreadsheets',
   'https://www.googleapis.com/auth/drive',  // Full Drive access
   'https://www.googleapis.com/auth/gmail.modify',
   'https://www.googleapis.com/auth/gmail.send',
   'https://www.googleapis.com/auth/admin.directory.user',
   'https://www.googleapis.com/auth/cloud-platform'
   ```

5. **Production-Ready**:
   - Error handling
   - TypeScript types
   - Environment variable configuration
   - Part of larger Express.js application
   - Integrated with database (Drizzle ORM + PostgreSQL)

#### Example Drive Methods in Main Repository

```typescript
// List files from Drive
async listFiles(query?: string, maxResults: number = 10): Promise<ToolResult> {
  const response = await this.drive.files.list({
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)',
    q: query
  });
  return { success: true, data: { files: response.data.files } };
}

// Create a folder
async createFolder(name: string, parentId?: string): Promise<ToolResult> {
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined
  };
  const response = await this.drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, mimeType'
  });
  return { success: true, data: response.data };
}

// Upload a file
async uploadFile(name: string, content: string, mimeType: string): Promise<ToolResult> {
  const media = {
    mimeType,
    body: Readable.from([content])
  };
  const response = await this.drive.files.create({
    requestBody: { name },
    media,
    fields: 'id, name, mimeType, size'
  });
  return { success: true, data: response.data };
}
```

### Key Differences

| Feature | Quickstart (This Directory) | Main Repository Implementation |
|---------|----------------------------|-------------------------------|
| **Type** | Client-side only | Server-side with client integration |
| **Authentication** | Browser OAuth 2.0 (no refresh token storage) | Server OAuth 2.0 with refresh tokens |
| **API Library** | `gapi.client` (JavaScript) | `googleapis` (Node.js) |
| **Scope** | Read-only metadata | Full Drive access + other Workspace APIs |
| **Use Case** | Testing, prototyping, learning | Production application |
| **Security** | Client ID exposed in browser | Credentials stored server-side |
| **Persistence** | No token storage (lost on page refresh) | Database storage with refresh tokens |
| **Features** | List files only | List, create, upload, delete, folders |
| **TypeScript** | No | Yes |
| **Error Handling** | Basic | Comprehensive |
| **Integration** | Standalone | Part of larger platform |

### When to Use Each Approach

**Use the Quickstart approach when:**
- Learning how the Drive API works
- Building a simple proof-of-concept
- Need quick setup with minimal infrastructure
- Building a client-only application
- Acceptable for users to re-authorize frequently

**Use the Main Repository approach when:**
- Building a production application
- Need to store and reuse credentials
- Require server-side processing
- Need multiple Google Workspace APIs
- Need secure credential management
- Building multi-user applications

### Migration Path

If you want to migrate from this quickstart to the main repository's implementation:

1. **Install the repository**:
   ```bash
   cd ..
   npm install
   ```

2. **Set up environment variables** (`.env`):
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
   ```

3. **Use the GoogleWorkspaceService**:
   ```typescript
   import { GoogleWorkspaceService } from './server/mcp/googleWorkspace';
   
   const workspace = new GoogleWorkspaceService();
   const authUrl = workspace.getAuthUrl();
   // Direct user to authUrl, then exchange code for tokens
   const credentials = await workspace.exchangeCode(authCode);
   workspace.setCredentials(credentials);
   
   // Now you can use Drive API
   const files = await workspace.listFiles();
   ```

## Troubleshooting

### "Authorize" button doesn't appear
- Check browser console for JavaScript errors
- Ensure `CLIENT_ID` is correctly set in `index.html`
- Verify both Google libraries are loading (check Network tab)

### "Access blocked" or OAuth error
- Ensure you've added `http://localhost:8000` to Authorized JavaScript origins
- Check OAuth consent screen is properly configured
- For external apps, ensure app is published or user is added as test user

### "No files found"
- Ensure you have files in your Google Drive
- Try uploading a test file to Google Drive
- Check that the correct Google account is signed in

### CORS errors
- Ensure you're accessing via `http://localhost:8000` (not `file://`)
- Use the http-server as instructed (don't open the HTML file directly)

## Next Steps

After completing this quickstart, you can:

1. **Explore more Drive API methods**: upload files, create folders, search, etc.
2. **Add more scopes**: try `drive.file` or full `drive` scope
3. **Integrate with the main repository**: use the server-side implementation for production
4. **Try other Google APIs**: Calendar, Docs, Sheets, Gmail, etc.

## Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google API JavaScript Client](https://github.com/google/google-api-javascript-client)
- [OAuth 2.0 for Client-Side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Main Repository Google Workspace Integration](../../../../server/mcp/googleWorkspace.ts)

## License

MIT License - See main repository LICENSE file for details
