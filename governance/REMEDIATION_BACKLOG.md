# Governance Remediation Backlog

> Generated: 2026-03-25 | Baseline: 1,014 violations across 133 files
> Authority: `governance/TRUTH_REGISTRY.yaml` | Enforcement: `scripts/sovereign-guard.ts`

This backlog tracks all known governance debt. Items are grouped by stream, ordered by severity (violation count), and each has a defined remediation approach.

New violations are blocked by the diff-aware pre-commit gate. This backlog exists to systematically reduce the baseline over time.

---

## Stream B: UI Design Violations (974 violations, 121 files)

**Remediation approach:** Replace banned patterns with Jason Standard equivalents:
- `rounded-xl` / `rounded-lg` -> `rounded-sui` (24px)
- `text-gray-*` -> `text-slate-*`
- `bg-white` (in glass contexts) -> `bg-slate-900/40 backdrop-blur-xl`
- `bg-gray-*` -> `bg-slate-*`

### Priority 1: High-density files (20+ violations)

| File | Count | Notes |
|------|-------|-------|
| `client/src/components/chat/ConciergePanel.tsx` | 72 | Protected file. Requires dedicated governance task. |
| `client/src/pages/reseller/MixingBoard.tsx` | 53 | |
| `client/src/pages/showcase/DiscVisualizer.tsx` | 52 | |
| `client/src/pages/showcase/LandingV2.tsx` | 39 | |
| `client/src/pages/showcase/SdkShowcase.tsx` | 37 | |
| `client/src/pages/owner/AiBizBotAdmin.tsx` | 36 | |
| `client/src/pages/reseller/ResellerAnalytics.tsx` | 30 | |
| `client/src/components/voice/tools/KioskOnboarding.tsx` | 28 | |
| `client/src/pages/agents/OnboardingFlow.tsx` | 25 | |
| `client/src/pages/showcase/DiscAssessment.tsx` | 21 | |
| `client/src/components/MapDisplay.tsx` | 20 | |
| `client/src/components/os/BrandGovernancePanel.tsx` | 20 | |

### Priority 2: Medium-density files (10-19 violations)

| File | Count |
|------|-------|
| `client/src/pages/developer/TwilioAccountManager.tsx` | 19 |
| `client/src/pages/developer/TelephonyManager.tsx` | 16 |
| `client/src/pages/integrations/GooglePlacesSdk.tsx` | 16 |
| `client/src/pages/public/PlatformHomePage.tsx` | 16 |
| `client/src/components/voice/tools/PlanManager.tsx` | 14 |
| `client/src/pages/developer/AgentTelephony.tsx` | 13 |
| `client/src/components/biz/BusinessHeroIdle.tsx` | 12 |
| `client/src/pages/admin/GatewayAdmin.tsx` | 12 |
| `client/src/pages/agents/AgentTestingDashboard.tsx` | 11 |
| `client/src/pages/customer/ChatWithAgentPreview.tsx` | 11 |
| `client/src/pages/reseller/ResellerDashboard.tsx` | 11 |
| `client/src/pages/showcase/OlympicB2b.tsx` | 11 |
| `client/src/pages/admin/PlatformSettingsPage.tsx` | 10 |

### Priority 3: Low-density files (1-9 violations)

96 additional files with 1-9 violations each. These are addressed opportunistically when files are touched for feature work.

---

## Stream C: Hardcoded Model IDs (40 violations, 14 files)

**Remediation approach:** Replace hardcoded model strings with `process.env.GEMINI_MODEL_ID`. For files that list model options (e.g., dropdowns, cost tables), extract to a config file that reads from env.

| File | Count | Notes |
|------|-------|-------|
| `shared/geminiVoiceModels.ts` | 21 | Model catalog file. Needs architectural decision: config-driven or env-driven. |
| `server/ai-gateway.ts` | 4 | |
| `client/src/components/ModelCostComparison.tsx` | 2 | Display component — may need model list from API. |
| `server/routes/voiceTranscribe.ts` | 2 | |
| `server/services/geminiService.ts` | 2 | |
| `client/src/components/VoiceAdminPanel.tsx` | 1 | |
| `client/src/types/voice.ts` | 1 | |
| `server/routes/agentResearch.ts` | 1 | |
| `server/services/audioAnalysis.ts` | 1 | |
| `server/services/demo-enrichment.ts` | 1 | |
| `server/services/discAnalysis.ts` | 1 | |
| `server/services/parsePlanService.ts` | 1 | |
| `server/services/sageIngestService.ts` | 1 | Script-only (not in app runtime). |
| `server/voiceGemini.ts` | 1 | Protected voice infrastructure. |

---

## Stream D: Canonical Doc Corrections (from Phase 1-3 review)

These are not code violations but content drift in canonical governance documents.

| Document | Issue | Fix |
|----------|-------|-----|
| `docs-governance/canonical/FILE_SYSTEM_GOVERNANCE.md` | Describes aspirational folder structure (`app/`, `shell/`, `domains/`, `views/`) that does not match production (`client/src/`, `server/`, `shared/`). | Update to reflect actual production structure. |
| `docs-governance/canonical/GOVERNANCE_REVIEW_ENGINE.md` | Describes an unimplemented "engine" (review templates, structured output format). Cursor rule (`preflight-review-required.mdc`) enforces only the concept of pre-implementation review. | Reduce scope to match what is actually enforced. |

---

## Stream E: Guard Hardening (Phase 3.1 backlog)

| Item | Current State | Target |
|------|---------------|--------|
| Archive leakage detection scope | `.mdc` / `.md` files only | Extend to `.ts`, `.tsx`, `.js`, `.jsx` |
| Archive filename matching | `[A-Z][A-Z_]+\.md` regex (ALL-CAPS only) | Path-based detection for any filename |
| "Reference only" cursor rules | 3 rules cite archived docs with disclaimer | Reduce over time; archived docs cited only when historically necessary |

---

## Tracking

- **Baseline file:** `governance/violation-baseline.json`
- **Guard script:** `scripts/sovereign-guard.ts`
- **Baseline generator:** `scripts/generate-violation-baseline.ts`
- **Regeneration command:** `doppler run -- npx tsx scripts/generate-violation-baseline.ts`

When a remediation pass is completed, regenerate the baseline and commit. The diff-aware gate ensures the count only goes down, never up.
