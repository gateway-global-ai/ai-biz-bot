---
name: health-check
description: Verifies Google API permits and platform connectivity (Three-Key Security Model).
---
# Health Diagnostics

Use this skill to verify the "100% Lockdown" status and that dev/stage/prod are healthy.

## Verification Steps

1. **Permit check (Google keys, Twilio, Grounding Lite, Places):**
   ```bash
   ./scripts/run-with-doppler.sh check-keys
   ```
   Or: `npm run check-keys` (runs `doppler run -- npx tsx scripts/check-google-key-permissions.ts`).

2. **Live health endpoint** (database, Twilio, Gemini listModels):
   ```bash
   curl http://localhost:3004/api/health   # Dev
   curl http://localhost:3003/api/health   # Stage
   curl http://localhost:3002/api/health   # Prod
   ```
   Expect `"status":"ok"` and all checks `"ok"`.

3. **List models**: The permit script and `/api/health` Gemini check use the REST `listModels` endpoint. Confirm `gemini-2.5-flash-native-audio-preview-12-2025` is in the list for your key (and in the health response `nativeAudioPreviewPermit: true`).

## Reference

- Health route: `server/routes/healthRoutes.ts`
- Permit script: `scripts/check-google-key-permissions.ts`
- Post-deployment workflow: `server/post-deployment-health-check.yml`
