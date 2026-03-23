# Phase 5D — Voice Bridge (Live parity)

## Purpose

Bring **Knowledge Certification** parity across channels: **website chat** already receives compiler fragments and **tool execution** is gated in [`server/services/toolHandler.ts`](../server/services/toolHandler.ts) for **all** Live sessions that pass `siteConfigId` (including browser WebSocket in [`server/geminiVoice.ts`](../server/geminiVoice.ts)).

This document defines the **compact snapshot schema**, **Twilio session attachment**, and the **optional** integration steps for **declaring** fewer tools on browser Live when `pricing_menu` is uncertified—without changing handshake or model env behavior.

## Governance constraint

[`server/geminiVoice.ts`](../server/geminiVoice.ts) is **voice-lockdown** (flight control). Do not refactor streaming or WebSocket plumbing in that file without an explicit **voice task**. **Surgical** edits to **contextual snap** (system instruction + tool list) may be approved under such a task.

## What already works (no geminiVoice edit)

1. **Identity anchor:** `sessionContext.siteConfigId` is captured on setup; [`handleToolCall`](../server/services/toolHandler.ts) receives `{ siteConfigId }`.
2. **Execution gate:** [`assertKnowledgeToolForSession`](../server/services/knowledgeCertificationContext.ts) blocks `get_hotel_inventory` and `get_booking_and_pricing_info` when `pricing_menu` is required and score &lt; 5.
3. **Result:** The model may still *attempt* a tool; the server returns a **deterministic** `knowledge_certification` payload instead of executing inventory/pricing handlers.

## Twilio / PSTN (implemented)

On Media Stream **start**, [`buildVoiceKnowledgeSnapshot`](../server/services/voiceKnowledgeBridge.ts) runs (shared 60s cache with gap analysis) and stores [`VoiceKnowledgeSnapshot`](../server/services/voiceKnowledgeBridge.ts) on [`VoiceSession`](../server/voiceSession.ts) for **observability** and future PSTN-specific UI or billing metadata.

## Optional browser Live: strip tools + compiler fragment

To match **chat**—where the model **does not see** pricing tools when uncertified—apply these **three** hooks inside the **contextual snap** block of `geminiVoice.ts` (paid tier path), after `effectiveAllowed` is computed:

### 1. Async snapshot (reuse cache)

```typescript
import { buildVoiceKnowledgeSnapshot, filterToolNamesForVoiceKnowledge } from "./services/voiceKnowledgeBridge";
// ...
const voiceSnap = sessionSiteConfigId ? await buildVoiceKnowledgeSnapshot(sessionSiteConfigId) : null;
const effectiveAllowedForLive = filterToolNamesForVoiceKnowledge(effectiveAllowed, voiceSnap);
```

Use `effectiveAllowedForLive` wherever `effectiveAllowed` is used for **declaration filtering** (replace `effectiveAllowed.includes` with `effectiveAllowedForLive.includes`).

### 2. Compiler parity

When building `businessContext` for `buildBehavioralPrompt`, use:

```typescript
import { buildBusinessContextWithVoiceKnowledge } from "./services/voiceKnowledgeBridge";
// ...
const businessContext = await buildBusinessContextWithVoiceKnowledge(
  { name: businessName, address: ..., phone: ..., hours: ... },
  sessionSiteConfigId,
);
```

Then pass `businessContext` into `buildBehavioralPrompt(agent, businessContext, siteConfig)` (third arg optional for brand).

### 3. Free tier

Free tier uses **no tools**; optionally still merge certification into persona text for consistent **disclosure** when `atRisk`.

## Schema: `VoiceKnowledgeSnapshot`

Versioned, JSON-safe, target &lt; 1KB:

| Field | Meaning |
|-------|--------|
| `v` | Schema version (1) |
| `siteConfigId` | Tenant |
| `generatedAt` | ISO timestamp |
| `atRisk` | Site-level gap flag |
| `observedMeanRequired` / `requiredMinimum` | Mean across required dimensions |
| `pricingMenuScore` / `pricingMenuRequired` | `pricing_menu` dimension |
| `blockPricingSensitiveTools` | When true, omit pricing Live tools from declarations |
| `restrictedDimensionLabels` | For logging / UI (capped list) |

## Admin override (future)

Manual **dimension** overrides belong in a dedicated table with **audit trail**—see roadmap in [`KNOWLEDGE_PLAN_ORCHESTRATOR.md`](./KNOWLEDGE_PLAN_ORCHESTRATOR.md). Do not bypass certification with a silent config flag.

## References

- [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) § Phase 5B
- [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) § Knowledge certification gates
