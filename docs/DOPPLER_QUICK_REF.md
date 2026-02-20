# Secrets Management with Doppler

Quick reference for using Doppler with Clear Voice Technology.

## 🚀 Quick Start

```bash
# Run the automated setup
./setup-doppler.sh

# Or install manually:
# 1. Install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# 2. Authenticate
doppler login

# 3. Setup project
doppler setup
```

## 📝 Common Commands

### Running the Application

```bash
# Development
doppler run -- npm run dev

# Production build
doppler run -- npm run build

# Production server
doppler run -- node dist/index.mjs
```

### Managing Secrets

```bash
# View all secrets
doppler secrets

# Get specific secret
doppler secrets get GEMINI_API_KEY --plain

# Set/update secret
doppler secrets set GEMINI_API_KEY="new-key"

# Delete secret
doppler secrets delete OLD_KEY

# Upload from .env file
doppler secrets upload .env
```

### Environment Management

```bash
# Switch to production
doppler setup --config production

# View current config
doppler configure get

# List available configs
doppler configs
```

## 🔐 Required Secrets

All these are automatically set by the setup script:

| Secret | Value | Description |
|--------|-------|-------------|
| `GEMINI_MODEL` | `models/gemini-2.5-flash-native-audio-preview-12-2025` | AI model for voice |
| `GEMINI_API_VERSION` | `v1beta` | API protocol version |
| `GEMINI_API_KEY` | Your key | **Set this manually!** |
| `GEMINI_VOICE_NAME` | `Puck` | Voice persona |
| `GOOGLE_CLOUD_PROJECT_ID` | `ai-biz-bot` | GCP project |
| `PORT` | `3004` | Server port |
| `NODE_ENV` | `development`/`production` | Environment |
| `VITE_GOOGLE_MAPS_KEY` | Your client key | **Client-side Maps API key** (exposed in browser) |
| `VITE_GOOGLE_MAP_ID` | `133113f6b0af325aa994b4cc` | Map ID for Day theme |
| `VITE_GOOGLE_MAP_ID_MIDNIGHT` | `133113f6b0af325ac3bd97e2` | Map ID for Midnight theme |
| `GOOGLE_MAPS_API_KEY` | Your server key | **Server-side Maps API key** (Places, Geocoding) |

**Important:** `VITE_*` secrets must be set in Doppler and available during `npm run build` (Vite inlines them at build time).

## 🎯 Benefits

- ✅ **No local .env files** - Secrets stay in the cloud
- ✅ **Team collaboration** - Share secrets securely
- ✅ **Audit logging** - Know who changed what
- ✅ **Environment management** - dev/staging/production configs
- ✅ **CI/CD ready** - Use service tokens for automation

## 📚 Full Documentation

See [docs/DOPPLER_SETUP.md](./DOPPLER_SETUP.md) for complete setup guide.

## 🆘 Troubleshooting

**Command not found?**
```bash
# Verify installation
which doppler

# Reinstall if needed
curl -Ls https://cli.doppler.com/install.sh | sh
```

**Secrets not loading?**
```bash
# Check project setup
doppler configure get

# Verify secrets exist
doppler secrets --only-names

# Test injection
doppler run -- printenv | grep GEMINI
```

## 🔄 Migration from .env

```bash
# 1. Upload current secrets
doppler secrets upload .env

# 2. Test application works
doppler run -- npm run dev

# 3. Remove local .env (after confirming it works)
rm .env
```

## 🌐 Dashboard

Access the Doppler dashboard at: https://dashboard.doppler.com

- View/edit secrets
- Manage team access
- Check audit logs
- Configure integrations
