---
Date: 2026-03-02
Status: ACTIVE
Supersedes: none
System_State: "Bedrock v0.16 synced, Worktrees disabled, Main branch only"
---

# Rebuild Plan v2 — Master Operational Plan

## 1. System State Declaration

- **Bedrock version:** v0.16 (post–Stable Rollback & Relayering).
- **Worktree status:** Permanently disabled. All development in single repo at `/opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai`.
- **Active branch:** `main`. Promote via main → stage → release/vX.Y.Z.
- **Build:** `npm run build` → `tsx script/build.ts`.

## 2. Stabilized Infrastructure Inventory

- Tier-1 agents stable; workspaceState + siteConfigId routing enforced; Bypass Hook active.
- Modular route extraction: server/routes.ts → server/routes/*.ts.
- Migrations 0001–0017; next prefix 0018. Dev deploy: ./script/deploy-dev.sh.

## 3. Immediate Priority Queue

- Migration reconciliation: 0013/0014/0015 dual files; order in ARCHITECTURE.md Migration Journal; do not rename.
- Gemini: GEMINI_MODEL_ID from env only (.cursor/rules/gemini-3-flash.mdc).
- ARCHITECTURE.md: serpapi-reviews.ts = SerpAPI_Reviews_Connector; do not purge.

## 4. Tier-2 C-Suite Phased Roadmap

**Phase 1:** Bedrock stabilization; route extraction.
**Phase 2:** SerpAPI_Reviews_Connector; Raw Reviews + Review Signals indices; competitor connector.
**Phase 3:** CMO / VP Sales / Legal agents; Artifacts Index; 5–20 review_id citation enforced.

## 5. RAG Index Architecture

Raw Reviews (data_id) | Review Signals (data_id, review_id) | Artifacts (site_config_id).

## 6. SerpAPI_Reviews_Connector

See Tier2_Review_Intelligence_Spec.md. Location: server/services/serpapi-reviews.ts.

## 7. C-Suite Agent Prompts

CMO: Differentiator Amplification. VP Sales: Speed-to-Lead. Legal: Review Integrity + Messaging Gate. All: evidence_review_ids (5–20) mandatory.

## 8. Anti-Hallucination Governance

Evidence: min 5, max 20 review_ids per artifact. Metric: connector or "unspecified". No generic web search for BI.

## 9. Knowledge Acquisition

Structured ingestion only (SerpAPI Reviews, approved connectors).

## 10. Branch Strategy

main, stage, release only. Worktrees disabled. No long-lived feature branches.
