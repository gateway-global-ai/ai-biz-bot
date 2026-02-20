---
name: check-permits
description: Verifies Google API permits (Gemini, Maps, Twilio) using the local diagnostic script.
---
# Permit Checker Skill
Use this skill to ensure all "Three-Key" splits are active and functional.

## When to Use
- Before finalizing any API-related feature.
- When troubleshooting 404/403 errors from Google endpoints.

## Execution Sequence
1. Ensure Doppler is active: `doppler run -- npx tsx scripts/check-google-key-permissions.ts`.
2. **Verify Grounding Lite**: Confirm the endpoint is `https://mapstools.googleapis.com/mcp/search_places` (POST).
3. **Verify Masking**: Check that Places API (New) requests use `X-Goog-FieldMask: id,displayName,rating`.