# map-project

Generate a "Source of Truth" file manifest for the current session:
1. **Tooling Logic**: Confirm `ToolRouter.tsx` and `ManualDataInput.tsx` are in `client/src/components/voice/tools/`.
2. **Server Services**: Confirm `toolHandler.ts`, `mapsService.ts`, and `intelligenceService.ts` are in `server/services/voice/`.
3. **Core Handlers**: Confirm `geminiVoice.ts` is in `server/` and correctly references the voice services using relative paths (e.g., `./services/voice/toolHandler`).
4. **Environment Verification**: List active Doppler variables, specifically `GEMINI_WS_URL` and `GEMINI_MODEL_ID`, ensuring they match the required Google AI format.

**STRICT RULE**: Any AI agent proposing path changes must first run this command and justify why a relocation is necessary. Never use .js extensions in imports.

# This command will be available in chat with /map-project
