# verify-health

Run a comprehensive diagnostic of the platform health:
1. **Permit Check**: Execute `doppler run -- npx tsx scripts/check-google-key-permissions.ts`. Analyze the output for any "Unauthorized" or "Failed" markers.
2. **Environment Audit**: Verify that `GEMINI_MODEL_ID` is correctly loaded from Doppler and matches the model verified in the permit check.
3. **Build Integrity**: Check for the existence of `dist/index.mjs` (server) and `dist/public/index.html` (client).
4. **Process Status**: Run `pm2 list` to ensure IDs 5, 6, and 8 are "online" and not in a crash-restart loop.
5. **Log Analysis**: Tail the last 50 lines of `pm2 logs 5` to identify any "Module not found" or "WebSocket 1008" errors.

If any check fails, provide the specific error message and a proposed fix based on the established flat directory structure.

# This command will be available in chat with /verify-health
