# Security & Configuration Lockdown Guide

## 🔒 Configuration Protection Strategy

This document explains how to protect your Clear Voice Technology configuration from accidental modifications by AI agents, editors, and automated tools.

## 1. Immutable Configuration Files

### `.env.template`
Template for environment variables with explicit documentation. Copy to `.env` and fill in your actual API keys.

**Protection Level**: Read-only on production (`chmod 400`)

### `server/config/geminiLiveProtocol.ts`
Hardened configuration module that validates and constructs the exact JSON structure required by Gemini's Live API.

**Key Features**:
- Startup validation (fail-fast on misconfiguration)
- Immutable structure generation
- Type-safe exports
- Protocol version tracking

## 2. File Permission Lockdown

### Production Server
```bash
# Make .env read-only for application user
chmod 400 .env

# Verify permissions
ls -la .env
# Should show: -r-------- (read-only for owner)
```

### Development Environment
```bash
# Make configuration files read-only (but editable by you)
chmod 644 .env
chmod 644 server/config/geminiLiveProtocol.ts
```

## 3. AI Agent Protection

### `.aiignore` File
Created in project root to tell AI coding assistants which files are off-limits.

**Protected Files**:
- All `.env*` files
- `server/config/geminiLiveProtocol.ts`
- Core voice infrastructure
- Security credentials

### Cursor IDE Settings
Add to `.cursor/settings.json`:
```json
{
  "composer.exclusions": [
    ".env*",
    "server/config/geminiLiveProtocol.ts",
    "server/geminiVoice.ts",
    "*.pem",
    "*.key"
  ],
  "chat.requireApproval": {
    "patterns": [
      ".env*",
      "**/config/**",
      "**/secrets/**"
    ]
  }
}
```

### VS Code / Copilot Settings
Add to `.vscode/settings.json`:
```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    "Never modify .env files or files in server/config/ without explicit user approval",
    "Always ask before editing geminiVoice.ts or GeminiStreamingClient.ts",
    "Configuration changes require review and testing"
  ]
}
```

## 4. Git Protection

### `.gitignore`
Ensure these entries exist:
```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
*.pem
*.key
secrets/

# Debug logs
.cursor/debug.log
```

### Pre-commit Hooks
Install `gitleaks` to prevent accidental secret commits:

```bash
# Install gitleaks
brew install gitleaks  # macOS
# or
apt-get install gitleaks  # Ubuntu

# Add pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
gitleaks protect --staged --verbose
EOF

chmod +x .git/hooks/pre-commit
```

## 5. Secrets Management (Recommended)

### Option A: 1Password CLI
```bash
# Store API key in 1Password
op item create \
  --category=password \
  --title="Gemini API Key" \
  --vault="Development" \
  GEMINI_API_KEY=your-key-here

# Reference in code
GEMINI_API_KEY=$(op read "op://Development/Gemini API Key/password")
```

### Option B: Doppler
```bash
# Install Doppler
curl -Ls https://cli.doppler.com/install.sh | sh

# Store secrets
doppler secrets set GEMINI_API_KEY your-key-here

# Run app with Doppler
doppler run -- npm start
```

### Option C: Environment Variable Service
Use your hosting provider's built-in secrets management:
- **Heroku**: Config Vars
- **Vercel**: Environment Variables
- **AWS**: Secrets Manager
- **GCP**: Secret Manager

## 6. Configuration Validation

The server now validates configuration at startup:

```typescript
// Runs automatically in server/index.ts
validateGeminiConfig();
```

**What it checks**:
- Model name contains "native-audio-preview"
- API version is exactly "v1beta"
- Voice name is one of: Puck, Charon, Kore, Fenrir, Aoede
- Required environment variables are set

**On failure**: Server exits immediately with detailed error messages.

## 7. Emergency Recovery

If configuration gets corrupted:

1. **Restore from template**:
   ```bash
   cp .env.template .env
   # Fill in your API keys
   ```

2. **Verify against documentation**:
   - Model: `models/gemini-2.5-flash-native-audio-preview-12-2025`
   - API Version: `v1beta`
   - Voice: One of the 5 valid names

3. **Test validation**:
   ```bash
   npm run build
   node dist/index.mjs
   # Should see: ✅ Gemini Live API configuration validated
   ```

## 8. Audit Trail

### Configuration Change Log
Maintain a log of who changed what:

```bash
# Example log entry
echo "$(date): Updated GEMINI_VOICE_NAME from Puck to Charon - @username" >> config-changes.log
```

### Git Blame for Config Files
```bash
git log --follow server/config/geminiLiveProtocol.ts
```

## 9. Team Guidelines

### For Developers
1. **Never** commit `.env` files
2. **Always** use `.env.template` as reference
3. **Ask** before modifying `geminiLiveProtocol.ts`
4. **Test** configuration changes in staging first

### For AI Assistants
1. **Request approval** for any `.env` or config changes
2. **Explain** why the change is needed
3. **Show diff** before applying changes
4. **Wait** for user confirmation

## 10. Monitoring & Alerts

### Server Startup Check
The validation runs on every server start. Monitor logs for:
```
✅ Gemini Live API configuration validated
```

### Error Patterns
Watch for these in logs:
- `GEMINI_MODEL is not set`
- `Invalid model for Live API`
- `Invalid API version`

### Automated Alerts
Set up alerts for configuration failures:
```bash
# Example: Send Slack alert on validation failure
if ! grep -q "configuration validated" logs/server.log; then
  curl -X POST https://hooks.slack.com/your-webhook \
    -d '{"text": "⚠️ Gemini config validation failed!"}'
fi
```

## Summary Checklist

- [ ] `.env.template` created with documentation
- [ ] `server/config/geminiLiveProtocol.ts` implemented
- [ ] `.aiignore` configured
- [ ] `.gitignore` includes sensitive files
- [ ] File permissions set (production)
- [ ] Pre-commit hooks installed
- [ ] Secrets manager configured (optional but recommended)
- [ ] Startup validation enabled
- [ ] Team guidelines documented
- [ ] Monitoring/alerts configured

---

**Last Updated**: 2026-02-17  
**Protocol Version**: v1beta  
**Configuration Status**: ✅ Hardened and Protected
