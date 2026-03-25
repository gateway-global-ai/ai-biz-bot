# Enterprise maturity extensions (strategic themes)

Version: 1.0  
Status: **Reference only** — not a runtime contract, not an implementation spec

## Purpose

This document captures **durable strategic themes** that often matter when scaling agent platforms toward **regulated industries, provable quality, and portfolio-wide governance**. It paraphrases external review input; it does **not** restate third-party text verbatim and does **not** describe features as shipped unless cross-referenced elsewhere.

**Use it to:** align roadmaps and preflight reviews.  
**Do not use it to:** infer APIs, schemas, or current product behavior—those live in code and the contracts linked below.

## Canonical baseline (what the repo already governs)

Before reading “extensions,” the active story is:

- **Deploy path:** [AGENT_SWARM_DEPLOYMENT_RUNBOOK.md](./AGENT_SWARM_DEPLOYMENT_RUNBOOK.md)
- **Interaction governance:** [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md)
- **Maturity measurement:** [COMMUNICATION_GOVERNANCE_SCORECARD.md](./COMMUNICATION_GOVERNANCE_SCORECARD.md)
- **Research → code mapping:** [PROMPT_SHAPE_RESEARCH_ANCHOR.md](./PROMPT_SHAPE_RESEARCH_ANCHOR.md)

If anything in this file appears to conflict with those documents, **the linked contracts win**.

## Terminology (avoid confusion)

| Term | Meaning in this codebase |
| --- | --- |
| **Sovereign Sentinel** | Deterministic audit of **admin override reason** text — see [COMMUNICATION_PLANE_CONTRACT.md](./COMMUNICATION_PLANE_CONTRACT.md). It is **not** a general “governance engine” for all agent output. |
| **ARCH validator** | Enforcement on **text chat paths** (e.g. handoff cues), not voice hot path unless separately approved. |
| **“Policy engine” / PDP–PEP** | **Enterprise vocabulary** for “decide vs enforce.” Useful for **formal reviews**; the platform implements **partial** enforcement in specific modules—do not assume a single global PDP/PEP product exists until one is registered and documented like other control-plane artifacts. |

## Extracted themes (optional future hardening)

These are **directional** capabilities organizations often ask for. Each requires **explicit product charter**, registry updates, and implementation—nothing here is implied to be in progress.

### 1. Roster planning beyond templates

**Theme:** Industry templates provision a **default** team; some customers will eventually want **business-specific** prioritization (volume, risk, channel) to decide **which** archetypes to emphasize or sequence.

**Current posture:** Template-driven provisioning is documented in the runbook; a separate **recommendation or planning** layer is **not** defined as a shipped subsystem.

### 2. Skills as measurable contracts

**Theme:** Bot Builder “skills” ([SKILL_REGISTRY.md](./SKILL_REGISTRY.md)) are **activation and unlock** concepts. A stricter reading treats a skill as **measurable function + constraints** (success/latency/error budgets) where the product needs proof.

**Current posture:** Skills are registry-defined; **platform-wide numeric SLAs per skill** are **not** specified here.

### 3. Certification and simulation (high-risk paths first)

**Theme:** For high-impact agents or flows, enterprises want **staged** evaluation (synthetic conversations, edge cases, adversarial probes) and **pass/fail gates** before widening deployment.

**Current posture:** Knowledge certification, Safe Mode, and tool gates exist in **specific** areas; a **unified** certification pipeline with global thresholds is **not** described as complete in this repo’s contracts.

### 4. Stronger quantification of the Communication Plane

**Theme:** ARCH is partly enforced today; **full A/R/C/H scoring**, **latency budgets as enforced numbers everywhere**, and **automatic channel switching** may be expanded when product defines targets.

**Current posture:** See scorecard and contract; treat **additional metrics** as **incremental** work, not a rewrite.

### 5. Unified audit envelope for state-changing actions

**Theme:** Regulated customers often want **one** auditable record pattern for high-impact actions (who, policy version, decision, system-of-record pointer)—beyond scattered logs.

**Current posture:** Audit patterns exist per domain; a **single cross-cutting audit schema** is a **future consolidation** if/when compliance scope requires it.

## What we explicitly do not store here

- Hypothetical JSON APIs, database schemas, or scoring formulas presented as standards
- Word-for-word third-party recommendations that could drift from code
- Claims that **Sentinel** “should” become full output enforcement (that would be a **new** component or an expanded charter, with new names to avoid colliding with [securitySentinel.ts](../server/services/securitySentinel.ts))

## Related

- [PPP_ENTERPRISE_AUDIT_BACKLOG.md](./PPP_ENTERPRISE_AUDIT_BACKLOG.md) — post-implementation PPP themes (scoring, optional enforcement, lifecycle, execution linkage); **Phase 2+**, not baseline contracts
- [GOVERNANCE_REVIEW_ENGINE.md](./GOVERNANCE_REVIEW_ENGINE.md) — when proposals touch architecture or policy boundaries
- [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) — reading order
