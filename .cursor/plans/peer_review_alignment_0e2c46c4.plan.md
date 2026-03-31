---
name: Peer review alignment
overview: "Single execution lane: freeze (incl. zero-trust identity no-fly) → Phase 1 inventory + governed waiver protocol → repair → Phase 3 governance proof pack (trace, actor, redaction, recipient, provider) → resume broader work. Prevents waiver creep and unfalsifiable smoke tests."
todos:
  - id: phase-0-governance-freeze
    content: "Freeze + zero-trust identity no-fly: no intent-loop/onboarding expansion until Phase 1 gate; no production-ready/proof-capable claims for hardcoded or fallback external IDs outside siteConfigId plane"
    status: pending
  - id: phase-1-audit-artifact
    content: "Structural artifact created; complete row-by-row audit (fill TBD tables, auth matrix, actor decision) before Phase 2 — or record valid waiver per INTEGRATION_GOVERNANCE_INVENTORY_V1 §Waiver log"
    status: in_progress
  - id: actor-audit-policy-decision
    content: Product/governance ruling for persistAudit when actorAdminUserId missing — forbid attempt, null-actor row with reason, or fail-closed; document in matrix + service
    status: pending
  - id: phase-2-repair-proofs-identity-env
    content: "Repair: fail-closed proof scripts, proof banners, SITE_IDENTITY checklist/extension; optional automation after inventory"
    status: pending
  - id: phase-2-visual-integrity-gate
    content: "Hard gate: VISUAL_INTEGRITY_GOVERNANCE_V1 + npm run governance:visual-integrity audit on touched client paths; no speculative canvas UI; Shadcn MCP + tokens only"
    status: pending
  - id: phase-2-sovereign-gate-ci
    content: "Phase 2.0: GitHub Sovereign Guard runs sovereign-gate-governance.ts (inventory TBD, visual baseline, Option C SMS, anti-artboard on changed client); .github/workflows/sovereign-guard.yml wired"
    status: completed
  - id: phase-2-repair-auth-matrix-tokens
    content: "Repair: canonical auth-plane matrix doc; connect-token supersession + cooldown/resend policy + reminder server rules; integrate with SMS path"
    status: pending
  - id: phase-2-repair-admin-sms-surface
    content: "Repair: server repeat-send policy, E.164 override, dry-run/audit completeness per review, IntegrationOnboardingSmsCard JSON redaction + override labeling"
    status: pending
  - id: phase-3-e2e-proof-pack
    content: "Governance proof pack: ordered E2E + Evidence Requirements (audit trace, actor policy proof, UI redaction snippet, recipient resolution source, provider outcome/denial); attach to QUEUE_REVIEW_TEMPLATE or proof artifact before classification upgrade"
    status: pending
  - id: phase-4-resume-broader-work
    content: "After foundation stable: resume intent-loop / registry / internal agent work per roadmap; document handoff criteria in queue item"
    status: pending
isProject: false
---

# Peer review alignment plan — single execution lane (no drift)

## Done means (non-negotiable)

This workstream is **not** complete when routes exist or scripts run green. It is complete only when **identity discipline**, **auth-plane truth**, **token lifecycle policy**, and **ordered real-environment proof** are all **evidenced and documented** (inventory + matrix + proof logs + updated queue classification).

---

## Execution order (one lane)

| Phase | Name | Gate |
| ----- | ---- | ---- |
| **0** | Lock the lane | Freeze below is acknowledged by whoever executes |
| **1** | Audit truth | **First deliverable:** [`INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../../docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md) — no repair PRs until filled or valid waiver |
| **2** | Repair governance edges | Scripts, matrix, tokens, SMS policy, admin UI sanitization, **Visual Integrity hard gate** (below) |
| **3** | Prove one environment | Governance proof pack (evidence a–e) — classification upgrade **after** evidence |
| **4** | Resume broader implementation | Intent-loop expansion, registry migration chunks, etc. |

### Phase 0 — Governance freeze (hard)

Until Phase 1 audit artifact is delivered **and** Phase 2 items are **closed or consciously waived**:

- **No** new intent-loop feature work (new resolvers, swarm pairing surfaces, net-new canvas routing beyond this repair scope).
- **No** additional onboarding **variants** or admin UI expansion beyond what this plan lists (sanitization, labeling, policy hooks).
- **No** speculative “helpful” implementations that skip the inventory.

**Zero-trust identity (no-fly zone for promotion / classification)**

No script, route, or operator workflow may be promoted to **production-ready**, **proof-capable**, or **operator-complete** if it relies on **hardcoded or silent fallback** external identifiers such as `vendor_property_id` or `place_id` **outside** the formal `siteConfigId`-based auth and tenancy plane. This applies to **classification language** (queue items, demos, “done” claims) as well as code.

### Phase 1 — Audit truth

**Artifact:** [`docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../../docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md)

**Waiver standard:** Valid only if recorded in the inventory with (a) exact risk, (b) mitigation, (c) named approver, (d) expiry or review trigger.

### Phase 2 — Repair governance edges

- Fail-closed proof scripts + banners.
- Canonical **auth-plane matrix** in or linked from [`INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md`](../../docs-governance/canonical/INTEGRATION_AUTH_AND_CREDENTIAL_GOVERNANCE_V1.md).
- Connect-token supersession / cooldown / resend; reminder vs invitation server rules.
- Admin slice: repeat-send policy, E.164 override, dry-run depth, audit per actor policy; JSON redaction + override labeling.

#### Phase 2 — Hard gate: Visual Integrity (UI execution contract)

**Canonical:** [`VISUAL_INTEGRITY_GOVERNANCE_V1.md`](../../docs-governance/canonical/VISUAL_INTEGRITY_GOVERNANCE_V1.md) — **No-Inline rule** (platform-uniform policy).

| Rule | Content |
|------|---------|
| **Requirement** | Canvas-layer / OS-pattern UI: **Shadcn MCP** (discovery/promotion) + **global tokens** (`brand.ts`, `ui-core`, `index.css` variables such as `--background`, `--foreground`, `--primary` where scoped). |
| **Forbidden** | `style={{...}}` for presentation, ad-hoc hex, non-tokenized theme-bypass Tailwind on canvas-scope paths. |
| **Enforcement** | PRs with **speculative** or **artboard-style** UI that deviates from OS tokens → **rejected** at Phase 2 until compliant or a waiver exists in [`CANVAS_OS_TOOL_MANDATE_V1.md`](../../docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md) § Waivers. |

**OS standard (repairs):**

| Task | Enforcement |
|------|-------------|
| Component generation | Shadcn-only path; registry — do not hallucinate unstructured canvas `div` stacks. |
| Styling | Token-only (`brand.ts`, CSS vars, `CANVAS_BG_CLASSNAME`). |
| Canvas architecture | Inherit defined OS layout patterns (`APP_SHELL_CONTRACT`, view registry). |

**Automation (Repair PR #1 scope):** `npm run governance:visual-integrity` — baseline audit of inline styles in scoped paths; record results when touching `client/` in integration lane. Stricter CI fail (eslint/custom rule) is optional follow-up after baseline drops.

#### Phase 2.0 — Sovereign Gate hardening (GitHub)

**Goal:** CI is a **governance artifact officer**, not only unit tests.

| Check | Implementation |
|-------|----------------|
| Phase 1 inventory | `scripts/sovereign-gate-governance.ts`: if diff touches `server/routes/` or `scripts/`, fail when [`INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../../docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md) contains `\bTBD\b` (placeholders). |
| Visual OS | **v2 strict:** [`visual-integrity-inline-style-baseline.json`](../../docs-governance/artifacts/visual-integrity-inline-style-baseline.json) — `grandfatheredMaxStyleOpens` per repo-relative path; unlisted files must have **0** `style={{`; listed files cannot **exceed** cap (regression fails CI). Legacy v1 `maxInlineStyleOpenings` only if baseline version is 1. |
| Option C | Same script asserts `MISSING_ACTOR_CONTEXT` + `!dryRun && !actorTrimmed` guard in `sendCloudbedsGraphqlDiscoveryOnboardingSms.ts`. |
| Anti-artboard | Changed `client/**/*.tsx`: reject `bg-[#hex]` arbitrary classes and `color: "#` in source. |

**Workflow:** [`.github/workflows/sovereign-guard.yml`](../../.github/workflows/sovereign-guard.yml) invokes `sovereign-gate-governance.ts` after `sovereign-guard.ts`.

### Phase 3 — Prove one environment (governance proof pack)

Run **in order:** `status` → `validate` → `mint/handoff` → `send-sms` dry-run → one controlled live send (if policy allows).

**Evidence (a–e)** — Phase 3 not complete until [`QUEUE_REVIEW_TEMPLATE_V1.md`](../../docs-governance/artifacts/QUEUE_REVIEW_TEMPLATE_V1.md) or attached proof artifact includes:

| ID | Evidence |
| -- | -------- |
| (a) | Trace / **direct pointer** to audit row(s) for dry-run and live send |
| (b) | `actorAdminUserId` captured or rejected per Phase 2 policy |
| (c) | Admin UI JSON **redacted** (snippet ok) |
| (d) | **Recipient resolution** source (override vs assigned vs owner) |
| (e) | **Provider** outcome or denial (or documented skip) |

### Phase 4 — Resume broader work

After Phase 3 evidence exists. Handoff: “Foundation gate cleared [date] / link to logs.”

---

## Decision required: `actorAdminUserId` and audit rows

[`persistAudit` in `sendCloudbedsGraphqlDiscoveryOnboardingSms`](../../server/services/sendCloudbedsGraphqlDiscoveryOnboardingSms.ts) only inserts when `actorAdminUserId` is set. Choose one: **A** forbid without actor, **B** null actor + reason, **C** fail-closed for operator sends. Record in inventory §6.

---

## Handoff to coding agent

Execute **in phase order**. **Phase 1 gate:** [`INTEGRATION_GOVERNANCE_INVENTORY_V1.md`](../../docs-governance/artifacts/INTEGRATION_GOVERNANCE_INVENTORY_V1.md) **created** (done) — **fill rows** before Phase 2. Valid waiver only per Waiver standard in that file.
