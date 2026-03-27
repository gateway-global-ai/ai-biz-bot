# TypeScript rebaseline — post promptCompiler (#83)

**Commit (main when captured):** `e357d8b1960f9243d58c1ba2540484bc8ce51a85`  
**Command:** `npm run check`  
**Result:** failed (~27 `error TS*` lines before Bucket B cleanup).

## Bucket A — voice-governed residue (do not mix with general drift)

| File | Notes |
|------|--------|
| `server/voiceGemini.ts` | TS2322 `Tool[]` / `FunctionDeclaration` / `SchemaType`; TS2345 `ToolArgs`. **Separate PR:** `fix/voice-gemini-typing-governed` — typing only, explicit voice governance. |

## Bucket B — non-voice implementation drift

Grouped for review (optional split: B1 = canvas + uuid; B2 = routes + validator + funnel):

- **Canvas contract / UI:** `shared/canvasViewContract` payload aliases; `SharedCanvasPanel` / `ToolRouter` prop widening and explicit `any` cleanup.
- **uuid typings:** `client/.../voiceTurnOrchestrator.ts`, `server/routes/canvasControlRoutes.ts`.
- **Routes / storage:** `skillDispatchRoutes`, `localAgentRoutes`, `salesDocIngestionRoutes`, `workspaceAgentRoutes`, `industryFunnelRoutes`, `IndustryFunnelPage`.
- **Validator vs schema:** `canvasDirectiveValidator` vs `visitor_sessions` (no `authState` column — derive from `security_level` / `verified_phone`).

## Revised sequence

1. ~~#83 promptCompiler~~ merged.
2. **Bucket B** — drive `npm run check` clean except `server/voiceGemini.ts`.
3. **Bucket A** — minimal `voiceGemini.ts` typing PR under voice governance.

## Hygiene

Commits may use `git commit --no-verify` when local Gate 2 (e.g. Twilio/Doppler) is unavailable; **state that in the PR body** — not a full Sovereign Guard pass.

This file is a **worklog checkpoint**, not canonical policy.
