# PPP enterprise audit backlog (Phase 2+)

Version: 1.0  
Status: **Reference / roadmap** — not a runtime contract; items below are **not** claimed as shipped unless a linked doc or code path says so.

## Purpose

Capture **external enterprise-architecture review** themes for **Purpose–Plan–Pressure (PPP)** after compiler-level PPP ships. This avoids “framework only” drift toward **measurement, enforcement, lifecycle, and execution linkage**—without inventing APIs here.

**Baseline (implemented or in progress):** compiler injection via [`server/services/pppEngagementFragment.ts`](../server/services/pppEngagementFragment.ts), [`server/services/promptCompiler.ts`](../server/services/promptCompiler.ts); CGR extensions in [`shared/conversationGrounding.ts`](../shared/conversationGrounding.ts); bounded [`POST /api/intelligence/ppp-snapshot`](../server/routes/intelligenceRoutes.ts); docs [`docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md`](../docs/bot-builder/08-PPP-ENGAGEMENT-SYSTEM.md).

## Themes to consider (paraphrased)

### 1. Measurement — PPP effectiveness / score

- **Idea:** Derive a **structured scorecard** from session artifacts (e.g. outcome stated yes/no, deadline present, plan specificity, supporting/conflicting lists non-empty, P0 defined). Store in **CGR**, **analytics**, or async pipeline—not as a subjective “vibe.”
- **Why:** Benchmarking, ROI narrative, improvement loops.
- **Constraint:** Avoid scoring **inner states**; score **observable structure** in dialogue or CGR fields only.

### 2. Enforcement — optional PPP validator (ARCH-like)

- **Idea:** Deterministic checks on **assistant text** or **structured turn state** (e.g. “must offer next step or handoff”), with modes: `off` | `soft` (log) | `strict` (block/replace)—similar in *shape* to [`archEnvelopeValidator.ts`](../server/services/archEnvelopeValidator.ts), **not** duplicated logic.
- **Why:** Prevents drift into generic chat when product requires strict sales or onboarding flows.
- **Constraint:** **Voice hot path** — no blocking validator without a dedicated voice task ([`sovereign-voice-lockdown.mdc`](../.cursor/rules/sovereign-voice-lockdown.mdc)).

### 3. Lifecycle integration

- **Idea:** Surface PPP completion or score in **certification / maturity** narratives, **analytics**, or **review queues**—not a second “Sentinel”; name collisions avoided ([`COMMUNICATION_PLANE_CONTRACT.md`](./COMMUNICATION_PLANE_CONTRACT.md)).
- **Why:** Operators see **% sessions** with clear outcome/deadline/priorities.

### 4. Onboarding inference — confidence and evidence

- **Idea:** Every inferred field carries **confidence** (`low` | `medium` | `high`), **evidence pointer** (e.g. review snippet id, field name), **last updated**. Snapshot response already includes `confidence` and disclaimers; extend if product needs finer granularity.
- **Why:** Auditability; reduces “strategy hallucination” risk from public-only data.

### 5. Execution linkage — needs → skills / tools

- **Idea:** Map **prioritized needs** (e.g. “reduce no-shows”) to **recommended** [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) entries or **governed tools** (calendar, SMS)—explicit **recommendation** step, not silent automation.
- **Why:** Closes the loop from discovery to platform value.

### 6. Mode matrix — precision

- **Idea:** Publish a one-table **normative** matrix: `normal` | `sales_emphasis` | `EMERGENCY` | `noDriftLocked` → PPP behavior (full / qualification-heavy / one question / minimal). Align with [`pppEngagementFragment.ts`](../server/services/pppEngagementFragment.ts) and operational modes.
- **Why:** Consistency across web and voice.

### 7. Token / turn budgeting

- **Idea:** Optional **max PPP turns** or **token budget** for discovery phase in compiler or policy JSON—separate from ARCH A/R/C budgets.
- **Why:** Prevents over-long discovery in short sessions.

## Relation to other docs

- [ENTERPRISE_MATURITY_EXTENSIONS.md](./ENTERPRISE_MATURITY_EXTENSIONS.md) — broader enterprise themes.
- [PPP_ENGAGEMENT_SKILL.md](./PPP_ENGAGEMENT_SKILL.md) — skill index.
- [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md) — future column for PPP maturity if product adopts.

## Rules

- Do not treat this file as **product commitments**; open a governance ticket before adding enforcement that affects voice latency or customer-facing blocking behavior.
