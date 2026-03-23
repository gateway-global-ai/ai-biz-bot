# Knowledge Plan Orchestrator — Governed Acquisition & Proficiency

## Purpose

This document defines the **Knowledge Acquisition Pipeline (KAP)** control plane: how the OS moves from **stochastic prose** (“use your knowledge base”) to **deterministic knowledge engineering**—**trust-weighted sources**, **gap analysis**, **owner-approved acquisition plans**, and **pre-deploy certification** against **role requirements**.

It complements:

| Document | Relationship |
|----------|----------------|
| [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) | Prompts are compiled from **structured inputs**; proficiency scores and source classes are **inputs** to the compiler, not vibes in free text. |
| [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) | **Retrieval policy**, **refusal rules**, and **jurisdiction** constrain what an agent may claim from which source tier. |
| [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md) | Knowledge artifacts, `siteConfigs`, and agents are **schema-backed**; orchestration must not invent entities. |
| [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) | Optional productization: **skills** (e.g. strict grounding, audit gate) may be toggled per business once implemented. |
| [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) | **Phase 5B** binds **audit outputs** (e.g. `atRisk`, per-dimension scores) to **runtime posture**—multi-dimensional governor, not a binary toggle alone. |

**Non-goals:** This doc does not replace **Safe Mode** or **legal review** for regulated domains (health, finance). Those require explicit **policy packs** and human workflow where required.

---

## Core concepts

### Proficiency vs role requirement

- **Role requirement (R_min):** Minimum **evidence coverage** and **source tiers** required for a **declared agent role** (e.g. retail concierge, medical intake). Stored as **structured policy**, not a sentence in a prompt.
- **Observed proficiency (P_obs):** Score derived from **ingested data**, **retrieval quality**, **contradiction checks**, **freshness**, and **probe results** (see §Pre-deploy stress test).
- **Governance rule:** If `P_obs < R_min` for any **mandatory dimension** (e.g. pricing, hours, policy), the system **must not** present the agent as fully capable. Outcomes: **block deploy**, **degrade mode**, **route to human**, or **force acquisition plan**—per policy.

### Trust weight (W_t)

Each **source instance** (not just “the web”) carries a **trust weight** `W_t ∈ [0,10]` used in **proficiency aggregation**. Weights are **versioned** (see §Versioning); v1 defaults below are **starting points**, not universal law.

| Source class | Default W_t | Governance role |
|--------------|-------------|-------------------|
| Direct API / DB sync (authorized) | 10 | **Primary truth** — inventory, pricing, availability when contractually allowed. |
| Verified owner documents (upload + integrity check) | 9 | **Policy truth** — handbooks, SOPs, menus. |
| Google Place / Maps entity fields (official listing) | 8 | **Entity truth** — address, hours, phone; subject to freshness rules. |
| Public filings (e.g. SEC/EDGAR) where applicable | 8 | **Financial / corporate truth** — B2B credibility; jurisdiction-specific. |
| Google reviews (4–5★ aggregate / sampled) | 7 | **Social / experience truth** — “what people say”; not operational authority. |
| Google reviews (&lt;4★) | 5 | **Feedback truth** — objections, problems; use for **framing** and **service recovery**, not hype. |
| Deep research / Serp / LLM-synthesized context | 6 | **Contextual truth** — **requires owner verify** before treating as policy; short half-life. |

**Rules:**

1. **Never** promote a lower tier to behave like a higher tier without **explicit policy** (e.g. “marketing copy only”).
2. **Contradictions** between tiers **must** be resolved by **rules** (prefer API > verified doc > Places > reviews) and **surfaced** to the owner when ambiguous.
3. **Regulated claims** (medical, legal, financial advice) may **override** numeric scores with **hard gates** (block or human-only).

---

## Knowledge Plan Orchestrator (phases)

The **orchestrator** is a **planning + execution** process (batch / control plane), not the **voice hot path**. Heavy crawling, embedding, and adversarial probes run **out of band** per [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md).

### Phase 1 — Scan & gap analysis

**Inputs:** Declared **role**, **industry**, **jurisdiction**, existing **knowledge bindings** (vector store, structured fields), optional **place_id** / business graph.

**Outputs:** **Gap report**: required dimensions (e.g. hours, returns, HIPAA notice, insurance list) vs **present** dimensions; **missing** and **stale** flags.

### Phase 2 — Source ranking

For each gap, generate **candidate sources** with:

- **Expected proficiency delta** (ΔP) after successful ingest.
- **Cost band** (free / low / subscription / integration).
- **Effort / time** (automated scrape vs API onboarding).
- **Risk** (legal, ToS, PII).

Present to the owner as a **decision table**, not prose: *“Path A: ~P 4/10, low cost; Path B: ~P 9/10, $X/mo API.”* Numbers are **estimates** tied to **metrics** (coverage %, tier mix), not marketing.

### Phase 3 — Owner approval

The owner **approves** a **Knowledge Plan** (subset of paths). Unapproved paths **must not** run. Approval is **auditable** (who, when, plan version).

### Phase 4 — Execution & certification

- Ingest, normalize, **dedupe**, **embed**, **index**.
- Run **contradiction detection** (e.g. site hours vs Places).
- Update **P_obs** and **artifact lineage** (which chunk came from which source class).
- Optionally run **pre-deploy probes** (§Stress test).

---

## Review logic: experience vs feedback

**Do not** dump raw reviews into the system prompt.

| Bucket | Typical rating use | Agent use |
|--------|--------------------|-----------|
| **Experience / social proof** | Higher-rated snippets | “What guests often enjoy” — **non-authoritative**; cite as **social signal**. |
| **Feedback / objection** | Lower-rated themes | **Service recovery** scripts, **acknowledgment**, **routing** to human when policy requires. |

Governance must set **tone caps** and **refusal** when review content is **defamatory**, **PII-heavy**, or **off-topic**.

---

## Pre-deploy stress test (adversarial probes)

Before **Live** (or before **elevated** mode):

1. **Probe set:** N questions (e.g. 50 in v1; tunable) sampled from **role requirements**, **gaps**, and **adversarial** paraphrases.
2. **Grading:** **Pass** only if answers are **grounded** in allowed sources above configured **similarity / citation** thresholds; **training-only** answers **fail** when policy demands grounding.
3. **Outcomes:**
   - **Pass:** Eligible for **Professional / full** mode per policy.
   - **Partial pass:** Deploy with **exclusions** (e.g. “pricing → human transfer”) encoded in **policy + routing**, not prompt text.
   - **Hard fail:** **Block** or **safe mode only**; **mandatory** acquisition or human review.

**Cost control:** batch, **budget caps**, **sampling**, and **offline** execution; never block **latency-sensitive** voice connect for a full probe run.

---

## Minimums, maximums, and “natural” communication

Numeric bands (latency, words per turn, proactivity) are **product parameters**: they must be **tuned per surface** (voice vs chat) and **brand**. Store them as **structured controls** (e.g. ARCH / communication windows), not one global table. This document **does not** fix universal min/max; it requires that **whatever** limits ship are **declared, versioned, and testable**.

---

## Certification language

External-facing claims (“certified”, “grade 9”) **must** map to **measurable criteria** (probe pass rate, required tiers present, max staleness). Avoid **unverifiable superlatives**.

---

## Implementation alignment (non-normative)

- **v1 gap analysis (shipped):** Heuristic report in [`server/services/knowledgeGapAnalysis.ts`](../server/services/knowledgeGapAnalysis.ts); admin APIs `GET /api/v1/admin/knowledge-gap` and `GET /api/v1/admin/knowledge-gap/:siteConfigId`. Platform UI: [`KnowledgeProficiencyCard`](../client/src/components/admin/KnowledgeProficiencyCard.tsx) on **Platform → Business → Knowledge** ([`PlatformBusinessManager`](../client/src/pages/admin/PlatformBusinessManager.tsx)).
- **Phase 5C runtime:** [`knowledgeCertificationContext.ts`](../server/services/knowledgeCertificationContext.ts) maps gap reports to compiler input; **website chat** injects certification fragments; [`toolHandler.ts`](../server/services/toolHandler.ts) blocks pricing-sensitive tools when `pricing_menu` is uncertified (includes **browser** Live when `siteConfigId` is set on the tool context).
- **Phase 5D (Voice Bridge):** [`voiceKnowledgeBridge.ts`](../server/services/voiceKnowledgeBridge.ts) + Twilio [`VoiceSession.knowledgeSnapshot`](../server/voiceSession.ts); optional **`geminiVoice.ts`** hooks in [`VOICE_PHASE_5D_BRIDGE.md`](./VOICE_PHASE_5D_BRIDGE.md).
- **Runtime enforcement (Phase 5B spec):** [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) §**Phase 5B** defines triggers, per-dimension posture, tool restrictions, compiler injection, and `FALLBACK_SKILL_ID` mapping. **Implementation** next: registry + prompt compiler per [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)—not ad-hoc route injection.
- **Storage / schema:** Knowledge artifacts and scores should anchor to approved entities (`siteConfigs`, knowledge stores, `agents`) per schema registry.
- **Registry updates:** New **source classes**, **roles**, or **probe templates** require registry / YAML updates and governance review per [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md).
- **Skills:** Future skills such as `knowledge_audit_gate` or `strict_grounding` should appear in [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) when productized.

---

## Versioning

- **Trust weights** and **role requirement matrices** are **versioned** artifacts (e.g. `kap_weights_v1`).
- Changes require **review** and **migration** notes for existing businesses.

---

## References

- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)
- [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md)
- [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
- [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md)
