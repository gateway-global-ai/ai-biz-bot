# Google Drive SDK

A comprehensive SDK for integrating Google Drive API functionality with a unified interface for file management, sharing, and collaboration.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **Unified Interface:** Simple API for Google Drive operations
- **File Management:** List, create, upload, download, and delete files
- **Folder Operations:** Create and manage folder hierarchies
- **Sharing & Permissions:** Manage file and folder sharing
- **Search:** Advanced file search capabilities
- **TypeScript:** Full type safety and IntelliSense support
- **OAuth 2.0:** Secure authentication with refresh token support

## Installation

```bash
npm install @gateway-global/google-drive-sdk
```

## Quick Start

```typescript
import { GoogleDriveSDK } from '@gateway-global/google-drive-sdk';

const drive = new GoogleDriveSDK({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});

// Initialize with OAuth credentials
await drive.authenticate(credentials);

// List files
const files = await drive.listFiles({ pageSize: 10 });
console.log('Files:', files);

// Create a folder
const folder = await drive.createFolder('My New Folder');

// Upload a file
const file = await drive.uploadFile({
  name: 'document.txt',
  content: 'Hello, Google Drive!',
  mimeType: 'text/plain',
  parentId: folder.id
});

// Share a file
await drive.shareFile(file.id, {
  type: 'user',
  role: 'reader',
  emailAddress: 'user@example.com'
});
```

## Examples

The SDK includes several example implementations:

### Quickstart Example

A standalone JavaScript web application demonstrating client-side OAuth 2.0 and basic file listing:

```bash
cd examples/quickstart
npm install
npm start
```

Visit `http://localhost:8000` to see the quickstart in action.

See [examples/quickstart/README.md](examples/quickstart/README.md) for detailed setup instructions.

### Basic Usage Example

```bash
npm run dev
```

See `examples/basic-usage.ts` for comprehensive SDK usage patterns.

## API Reference

### GoogleDriveSDK

The main SDK class providing access to Google Drive operations.

#### Constructor

```typescript
new GoogleDriveSDK(config: GoogleDriveConfig)
```

**Config Options:**
- `clientId` - OAuth 2.0 client ID
- `clientSecret` - OAuth 2.0 client secret
- `redirectUri` - OAuth 2.0 redirect URI
- `scopes?` - Array of OAuth scopes (defaults to drive access)

#### Methods

##### authenticate(credentials)

Authenticate with OAuth 2.0 credentials.

```typescript
await drive.authenticate({
  access_token: 'ya29...',
  refresh_token: '1//...',
  expiry_date: 1234567890
});
```

##### listFiles(options?)

List files from Google Drive.

```typescript
const files = await drive.listFiles({
  pageSize: 10,
  query: 'name contains "report"',
  orderBy: 'modifiedTime desc'
});
```

##### createFolder(name, parentId?)

Create a new folder.

```typescript
const folder = await drive.createFolder('Projects', 'parent-folder-id');
```

##### uploadFile(options)

Upload a file to Google Drive.

```typescript
const file = await drive.uploadFile({
  name: 'document.pdf',
  content: fileBuffer,
  mimeType: 'application/pdf',
  parentId: 'folder-id'
});
```

##### downloadFile(fileId)

Download file content.

```typescript
const content = await drive.downloadFile('file-id');
```

##### deleteFile(fileId)

Delete a file or folder.

```typescript
await drive.deleteFile('file-id');
```

##### shareFile(fileId, permission)

Share a file with specific permissions.

```typescript
await drive.shareFile('file-id', {
  type: 'user',
  role: 'reader',
  emailAddress: 'user@example.com'
});
```

##### searchFiles(query)

Search for files using Drive query syntax.

```typescript
const files = await drive.searchFiles('mimeType="application/pdf"');
```

## Authentication Flow

### Server-Side OAuth 2.0

1. **Get Authorization URL**:
```typescript
const authUrl = drive.getAuthUrl();
// Redirect user to authUrl
```

2. **Exchange Code for Tokens**:
```typescript
const credentials = await drive.exchangeCode(authorizationCode);
await drive.authenticate(credentials);
```

3. **Store Refresh Token**:
```typescript
// Store credentials.refresh_token securely
// Use it to refresh access tokens automatically
```

### Client-Side OAuth 2.0

See the [quickstart example](examples/quickstart/README.md) for browser-based authentication.

## Environment Variables

```bash
# OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Optional: Default scopes
GOOGLE_SCOPES=https://www.googleapis.com/auth/drive
```

## Comparison to Other Implementations

### SDK vs. Quickstart

| Feature | SDK (This Package) | Quickstart Example |
|---------|-------------------|-------------------|
| **Type** | Server-side with full features | Client-side only |
| **Authentication** | OAuth with refresh tokens | Browser OAuth (no persistence) |
| **Operations** | Full CRUD + sharing + search | List files only |
| **TypeScript** | Yes | No |
| **Use Case** | Production applications | Learning & prototyping |

### SDK vs. Main Repository Integration

The main `chat-mvp-merge` repository includes a comprehensive Google Workspace integration at `server/mcp/googleWorkspace.ts` that covers:

- Google Drive (this SDK focuses on Drive)
- Google Calendar
- Google Tasks
- Google Docs & Sheets
- Gmail
- Admin Directory

This SDK provides a **focused, reusable Drive API implementation** that can be used standalone or integrated into larger applications.

## Advanced Usage

### Batch Operations

```typescript
// Upload multiple files
const uploads = await Promise.all([
  drive.uploadFile({ name: 'file1.txt', content: 'content1' }),
  drive.uploadFile({ name: 'file2.txt', content: 'content2' })
]);
```

### Folder Hierarchy

```typescript
// Create nested folders
const projectFolder = await drive.createFolder('My Project');
const docsFolder = await drive.createFolder('Documents', projectFolder.id);
const imagesFolder = await drive.createFolder('Images', projectFolder.id);
```

### Advanced Search

```typescript
// Search with complex queries
const recentPDFs = await drive.searchFiles(
  'mimeType="application/pdf" and modifiedTime > "2024-01-01"'
);

const sharedWithMe = await drive.searchFiles('sharedWithMe');
```

## Error Handling

```typescript
try {
  await drive.uploadFile({ name: 'test.txt', content: 'test' });
} catch (error) {
  if (error.code === 401) {
    // Re-authenticate
    await drive.authenticate(newCredentials);
  } else if (error.code === 403) {
    // Insufficient permissions
    console.error('Permission denied');
  } else {
    // Handle other errors
    console.error('Error:', error.message);
  }
}
```

## TypeScript Types

```typescript
import type {
  GoogleDriveConfig,
  DriveFile,
  DriveFolder,
  FilePermission,
  ListFilesOptions,
  UploadFileOptions
} from '@gateway-global/google-drive-sdk';
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Documentation

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Quickstart Guide](examples/quickstart/README.md)

## License

MIT License - See LICENSE file for details.

## Support

For questions or issues:
- Open an issue on GitHub
- Check the [examples](examples/) directory
- Review the [quickstart guide](examples/quickstart/README.md)

---

**Built with ❤️ by Gateway Global AI**
