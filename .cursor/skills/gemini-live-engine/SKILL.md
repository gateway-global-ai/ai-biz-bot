---
name: gemini-live-engine
description: Expert in Gemini 2.5 Flash Native Audio and Multimodal Live API.
---
# Gemini Live Engine Skill

Use this skill when modifying the WebSocket proxy or audio streaming logic for the native audio pipeline.

## Technical Requirements

- **Input Format**: Raw 16-bit PCM audio @ 16kHz, little-endian.
- **Output Format**: Raw 16-bit PCM audio @ 24kHz, little-endian.
- **Model ID (GA)**: `gemini-live-2.5-flash-native-audio`.
- **Preview model** (used in code until GA): `models/gemini-2.5-flash-native-audio-preview-12-2025` (set via `GEMINI_MODEL` or Doppler).

## Behavioral Guardrails

- **Barge-in Logic**: Use "Proactive Audio" / turn-taking settings to prevent unnecessary interruptions.
- **Speculative Responses**: When using NON_BLOCKING tools, instruct the model to provide a brief acknowledgement (filler) rather than hallucinating facts before tool results arrive.

## References

- Voice/WebSocket: `server/voiceGemini.ts`, `server/voiceStream.ts`, `shared/geminiVoiceModels.ts`
- Client streaming: `client/src/services/voice/` (e.g. GeminiStreamingClient)
- Health/listModels: `server/routes/healthRoutes.ts` (Gemini check uses listModels REST API)
