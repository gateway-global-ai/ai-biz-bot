# Google Drive SDK Examples

This directory contains example implementations demonstrating how to use the Google Drive SDK.

## Examples

### 1. Quickstart Example (`quickstart/`)

A standalone client-side JavaScript application demonstrating:
- Browser-based OAuth 2.0 authentication
- Listing files from Google Drive
- Simple HTML/JavaScript implementation (no build step)

**Perfect for:**
- Learning the Google Drive API
- Quick prototyping
- Client-side only applications

See [quickstart/README.md](quickstart/README.md) for detailed instructions.

### 2. Basic Usage Example (`basic-usage.ts`)

A comprehensive Node.js/TypeScript example demonstrating:
- Server-side OAuth 2.0 with refresh tokens
- File operations (list, upload, download, delete)
- Folder operations (create, manage hierarchy)
- File sharing and permissions
- Search functionality
- Advanced operations (copy, move, rename)

**Perfect for:**
- Production applications
- Server-side integrations
- Full-featured Drive access

## Running the Examples

### Quickstart

```bash
cd quickstart
npm install
npm start
# Visit http://localhost:8000
```

### Basic Usage

```bash
# From the sdk/google-drive directory
npm install
npm run dev
```

Before running, set up your `.env` file:

```bash
cp .env.example .env
# Edit .env with your credentials
```

## Environment Variables

Create a `.env` file in the `sdk/google-drive` directory:

```env
# Required for all examples
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Required for authenticated operations (basic-usage.ts)
GOOGLE_ACCESS_TOKEN=ya29...
GOOGLE_REFRESH_TOKEN=1//...
GOOGLE_TOKEN_EXPIRY=1234567890000
```

## Getting Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials
5. Set up authorized redirect URIs
6. Copy your client ID and secret

See the [quickstart README](quickstart/README.md) for detailed setup instructions.

## Common Use Cases

### Client-Side (Browser)
Use the **quickstart** example for:
- Embedding Drive access in a web app
- User-specific file access
- No backend required

### Server-Side (Node.js)
Use the **basic-usage** example for:
- Service accounts
- Background processing
- Server-to-server communication
- Multi-user applications

## Next Steps

After trying these examples:

1. **Explore the SDK API** - See [../README.md](../README.md) for full API documentation
2. **Build your integration** - Use the SDK in your application
3. **Advanced features** - Implement batch operations, webhooks, or real-time collaboration
4. **Security** - Implement proper token storage and refresh logic

## Support

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [SDK README](../README.md)
- [Repository Issues](https://github.com/gateway-global-ai/chat-mvp-merge/issues)
