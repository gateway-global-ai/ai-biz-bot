# Doppler VPS Configuration - Quick Guide

## Your Doppler Project is Ready! 

Project: `aibizbot-clearvoice`
Environments: Development, Staging, Production

## Step 1: Create Service Token

**Via Doppler Dashboard:**

1. Go to your project: https://dashboard.doppler.com/workplace/YOUR_WORKSPACE/projects/aibizbot-clearvoice
2. Select the `dev` config
3. Click **"Access"** tab in the left sidebar
4. Click **"Generate Service Token"**
5. Name it: `vps-production-server`
6. Copy the token (it starts with `dp.st.`)

**IMPORTANT**: Save this token - you can only see it once!

## Step 2: Configure Your VPS

Open your terminal on the VPS and run:

```bash
cd /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai

# Set the service token
doppler configure set token YOUR_SERVICE_TOKEN_HERE

# Verify it worked
doppler configure get
```

You should see output like:
```
config        dev
project       aibizbot-clearvoice
token         dp.st.****** (✓)
```

## Step 3: Upload Your Secrets

### Option A: Bulk Upload (Fastest)

```bash
# Upload all secrets from your .env file
doppler secrets upload .env
```

### Option B: Add Via Dashboard

In the Doppler dashboard:
1. Go to `dev` config → Secrets tab
2. Click "Add Secret"
3. Add each required secret:

**Required Secrets:**
```
GEMINI_API_KEY = your-gemini-api-key
GEMINI_MODEL = models/gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_API_VERSION = v1beta
GEMINI_VOICE_NAME = Puck
GEMINI_INPUT_SAMPLE_RATE = 16000
GEMINI_OUTPUT_SAMPLE_RATE = 24000
GOOGLE_CLOUD_PROJECT_ID = ai-biz-bot
PORT = 3004
NODE_ENV = development
```

## Step 4: Verify Secrets

```bash
# List all secrets (names only)
doppler secrets --only-names

# Get a specific secret value
doppler secrets get GEMINI_MODEL --plain

# Download all as .env format (to verify)
doppler secrets download --no-file --format env
```

## Step 5: Test Your Application

```bash
# Kill any running server
lsof -ti :3004 | xargs -r kill -9

# Run with Doppler
doppler run -- npm run dev
```

Or for production:
```bash
doppler run -- npm run build
doppler run -- node dist/index.mjs
```

## Step 6: Verify Voice System Works

1. Open browser: https://aibizbot-dev.gatewayglobal.ai
2. Click the microphone icon
3. Hold PTT button and speak
4. Verify you get a response

## Troubleshooting

**Token not working?**
```bash
# Check configuration
doppler configure get

# Reconfigure if needed
doppler configure set token YOUR_NEW_TOKEN
```

**Secrets not loading?**
```bash
# Test environment variable injection
doppler run -- printenv | grep GEMINI
```

**Server won't start?**
```bash
# Check validation logs
doppler run -- node dist/index.mjs
# Look for: ✅ Gemini Live API configuration validated
```

## Success Indicators

✅ `doppler configure get` shows your project  
✅ `doppler secrets` lists your secrets  
✅ `doppler run -- node dist/index.mjs` starts server  
✅ Server logs: "✅ Gemini Live API configuration validated"  
✅ Voice interaction works on the website

## Next Steps After Success

1. **Remove local .env**: `rm .env` (secrets now managed by Doppler)
2. **Configure production**: `doppler setup --config prd`
3. **Invite team**: Dashboard → Members → Add
4. **Set up systemd** (for auto-start on reboot)

---

**You're almost there!** Just need to get that service token and run `doppler configure set token`.
