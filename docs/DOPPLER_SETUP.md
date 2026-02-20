# Doppler Integration Guide

## Overview

Doppler provides secure, centralized secrets management for your Clear Voice Technology stack. This guide covers setup, usage, and best practices.

## Installation

### 1. Install Doppler CLI

**Linux (Ubuntu/Debian)**:
```bash
# Install Doppler CLI
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

**macOS**:
```bash
brew install dopplerhq/cli/doppler
```

**Verify Installation**:
```bash
doppler --version
```

## Initial Setup

### 2. Authenticate Doppler

```bash
# Login to Doppler (opens browser)
doppler login

# Or use token authentication (for CI/CD)
doppler configure set token dp.st.YOUR_SERVICE_TOKEN
```

### 3. Create Doppler Project

**Via CLI**:
```bash
# Create project
doppler projects create aibizbot-clearvoice

# Setup project in current directory
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
doppler setup
# Select: aibizbot-clearvoice
# Select config: dev (for development)
```

**Via Dashboard** (https://dashboard.doppler.com):
1. Click "Create Project"
2. Name: `aibizbot-clearvoice`
3. Create environments: `dev`, `staging`, `production`

## Migrating Secrets from .env

### 4. Upload Existing Secrets

**Option A: Bulk Upload (Recommended)**:
```bash
# Upload all secrets from .env file
doppler secrets upload .env
```

**Option B: Individual Secret Addition**:
```bash
# Core Gemini Configuration
doppler secrets set GEMINI_API_KEY="your-key-here"
doppler secrets set GEMINI_MODEL="models/gemini-2.5-flash-native-audio-preview-12-2025"
doppler secrets set GEMINI_API_VERSION="v1beta"
doppler secrets set GEMINI_VOICE_NAME="Puck"
doppler secrets set GOOGLE_CLOUD_PROJECT_ID="ai-biz-bot"
doppler secrets set PORT="3004"
doppler secrets set NODE_ENV="development"

# Google Maps Configuration (Client-side - VITE_ prefix)
doppler secrets set VITE_GOOGLE_MAPS_KEY="your-client-maps-key"
doppler secrets set VITE_GOOGLE_MAP_ID="133113f6b0af325aa994b4cc"
doppler secrets set VITE_GOOGLE_MAP_ID_MIDNIGHT="133113f6b0af325ac3bd97e2"

# Google Maps Configuration (Server-side)
doppler secrets set GOOGLE_MAPS_API_KEY="your-server-maps-key"
```

### 5. Verify Secrets

```bash
# List all secrets
doppler secrets

# Get specific secret value
doppler secrets get GEMINI_API_KEY --plain

# Download all secrets as .env format (for verification)
doppler secrets download --no-file --format env
```

## Running Your Application

### Development

```bash
# Run with Doppler
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
doppler run -- npm run dev
```

### Production Build

**CRITICAL:** `VITE_*` environment variables are inlined by Vite at **build time**. You **must** run the build command with Doppler so these secrets are available:

```bash
# Build with secrets (VITE_ vars are embedded in client bundle)
doppler run -- npm run build

# Start production server
doppler run -- node dist/index.mjs
```

**Why this matters:** If you build without Doppler, the client bundle will have `undefined` for `VITE_GOOGLE_MAPS_KEY` and Map IDs, causing map tools to fail.

### As a Service (systemd)

Create `/etc/systemd/system/aibizbot.service`:

```ini
[Unit]
Description=AI Biz Bot Clear Voice Technology
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai
ExecStart=/usr/bin/doppler run -- /usr/bin/node dist/index.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable aibizbot
sudo systemctl start aibizbot
sudo systemctl status aibizbot
```

## Environment Management

### Switch Between Environments

```bash
# Development
doppler setup --config dev

# Staging
doppler setup --config staging

# Production
doppler setup --config production
```

### Environment-Specific Secrets

```bash
# Set production-only values
doppler secrets set NODE_ENV="production" --config production
doppler secrets set PORT="3004" --config production

# Verify current environment
doppler configure get
```

## Team Collaboration

### Invite Team Members

**Via Dashboard**:
1. Go to Project Settings → Access
2. Click "Invite Member"
3. Enter email and set role (Admin/Developer/Viewer)

**Via CLI**:
```bash
doppler team add user@example.com --role developer
```

### Service Tokens (for CI/CD)

```bash
# Create service token for production
doppler configs tokens create production-deploy --config production

# Use token in CI/CD
export DOPPLER_TOKEN="dp.st.YOUR_SERVICE_TOKEN"
doppler run -- npm run build
```

## Security Best Practices

### 1. Rotate API Keys Regularly

```bash
# Update secret
doppler secrets set GEMINI_API_KEY="new-key-here"

# Verify change
doppler secrets get GEMINI_API_KEY --plain

# Restart application to pick up new value
sudo systemctl restart aibizbot
```

### 2. Audit Logs

**Via Dashboard**:
- Go to Activity tab
- View who changed what and when

**Via CLI**:
```bash
doppler activity
```

### 3. Lock Production Secrets

**Via Dashboard**:
1. Go to Production config
2. Click secret → Lock icon
3. Requires admin approval for changes

### 4. Remove Local .env Files

```bash
# After verifying Doppler works, remove .env
rm .env
rm .env.local

# Keep template for reference
# .env.template stays for documentation
```

## Troubleshooting

### Issue: Command not found
```bash
# Check Doppler is installed
which doppler
doppler --version

# Reinstall if needed
```

### Issue: Authentication failed
```bash
# Re-authenticate
doppler logout
doppler login
```

### Issue: Secrets not loading
```bash
# Verify project setup
doppler configure get

# Check if secrets exist
doppler secrets

# Test secret injection
doppler run -- printenv | grep GEMINI
```

### Issue: Permission denied
```bash
# Check file permissions
ls -la /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai

# Run as correct user
sudo -u www-data doppler run -- node dist/index.mjs
```

## Migration Checklist

- [ ] Install Doppler CLI
- [ ] Authenticate (`doppler login`)
- [ ] Create project (`aibizbot-clearvoice`)
- [ ] Upload secrets from `.env`
- [ ] Verify secrets (`doppler secrets`)
- [ ] Test application (`doppler run -- npm run dev`)
- [ ] Update deployment scripts
- [ ] Configure systemd service (production)
- [ ] Remove local `.env` files
- [ ] Invite team members
- [ ] Set up audit logging
- [ ] Document for team

## Integration with Existing Code

Your current configuration validation in `server/config/geminiLiveProtocol.ts` works seamlessly with Doppler because Doppler injects secrets as environment variables - no code changes needed!

```typescript
// This already works with Doppler:
const GEMINI_MODEL = process.env.GEMINI_MODEL || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Doppler automatically provides these values
```

## Cost

- **Free Tier**: 5 users, unlimited secrets, 7-day history
- **Team Tier**: $18/user/month, unlimited everything
- **Enterprise**: Custom pricing, SSO, advanced features

For your use case, the **Free Tier** is perfect to start.

## Support

- **Dashboard**: https://dashboard.doppler.com
- **Documentation**: https://docs.doppler.com
- **CLI Help**: `doppler --help`
- **Community**: https://github.com/DopplerHQ/cli/discussions

---

**Next Steps**: Run the installation commands and start using Doppler!
