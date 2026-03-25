# Voice Concierge — opening protocol (marketing 3 moves → platform)

Version: 1.0  
Audience: product, reviewers, prompt/compiler alignment

## Mapping

This ties **marketing** “first three moves” to **existing** platform artifacts (no new prompt blobs in UI).

| Move | Customer feel | Platform mechanism |
|------|----------------|---------------------|
| **1 — Ground reality** | “I know what this is and what happens next.” | **CGR** in [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts): identity, ability, space, focus; **disclosure** via `communication_governance.disclosurePolicyId`. |
| **2 — Prove competence** | “This AI can help, not just talk.” | **ARCH** (acknowledge / reflect / context) in agent `archProfile`; **PPP** spine for outcome/plan/pressure (`pppEngagement` in [`pppEngagementFragment.ts`](../server/services/pppEngagementFragment.ts)). |
| **3 — Create direction** | “There is one clear next step.” | **ARCH handoff** + [`archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts) on **text** paths; voice must still **ask** a next-step question per introduction protocol in [`server/index.ts`](../server/index.ts) `INTRODUCTION_PROTOCOL` (demo seed). |

## Timing (guidance)

- **~30 seconds:** Complete move 1–2 (orient + one useful signal); avoid long monologue.  
- **PPP:** Deep qualification can follow per [08-PPP-ENGAGEMENT-SYSTEM.md](../docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md).

## Voice hot path

- **No** blocking ARCH/PPP validators on Gemini Live WS (`/ws/gemini-live`) per voice lockdown.  
- Behavior is shaped by **compiled** prompts from DB + handover; audit telemetry on **chat** where applicable.
