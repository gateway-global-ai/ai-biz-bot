# Knowledge Volatility Governance

> **Governing Rule:** Operational documentation for third-party platforms must be live-linked or time-bounded. Static copies older than their verification window must be archived or excluded from default retrieval.

> **Corollary:** Never let static research outrank live authority.

---

## The LLM Confinement Doctrine

1. LLMs are pattern recognizers. They always take the shortest retrieval path. They cannot ignore patterns and they cannot innovate.
2. The solution to bad agent output is never "better prompts" — it is a **smaller, harder environment**.
3. Knowledge acquisition is **programmatic, not ad hoc**. Sources of truth are declared by the system, not discovered by the agent. SDKs, APIs, and vendor docs have exactly one canonical source — a live URL or a pinned, time-bounded snapshot. Nothing else.
4. Agents do not decide what to learn. The system certifies knowledge, the agent executes within what has been certified.
5. **Aptitude testing is a mandatory gate**, not an optional check. If an agent fails an aptitude test against a defined source of truth, the system deploys a **knowledge-building pipeline** (re-ingest from live authority, re-certify, re-test). The agent is not retried with the same stale knowledge.
6. Stale knowledge in the retrieval path is not a quality problem — it is an **architectural vulnerability**. It produces wrong code, wrong configs, wrong models, wrong methods, and false confidence. False confidence from an agent is worse than missing information.
7. The more confined the environment, the better the agent performs. Every piece of unverified, unclassified, or expired knowledge in the retrieval path **degrades** all agent output, not just the output that touches that knowledge.

---

## Authority Hierarchy

Five tiers, non-negotiable ranking. An agent must never treat a lower tier as equal to a higher one.

| Tier | Authority Level | Description | Example |
|------|----------------|-------------|---------|
| 1 | `official` | Live official source — SDK URLs, versioned API docs, live schemas, generated contracts | `https://ai.google.dev/gemini-api/docs` |
| 2 | `internal_canonical` | Current internal canonical docs — governance specs, architecture docs, entity models | `docs-governance/SAFE_MODE_CONTRACT.md` |
| 3 | `pinned_snapshot` | Explicitly frozen with reason, owner, and expiry date | A specific API response format pinned for regression testing |
| 4 | `archive` | Invisible to default retrieval — historical reference only | Deprecated migration plans, old vendor comparisons |
| 5 | `dead` | Scheduled for deletion, zero retrieval | Removed SDK samples, obsolete notebooks |

---

## Document Classification Schema

Every knowledge artifact in the system must declare:

```yaml
authority_level: official | internal_canonical | pinned_snapshot | archive | dead
source_type: sdk_url | api_reference | internal_spec | vendor_snapshot | research_note
last_verified_at: 2026-03-25          # ISO date
expires_at: 2026-04-24                # computed from volatility tier
volatility: high | medium | low
retrieval_status: active | archive_only | purge_candidate
```

Artifacts missing these fields default to `retrieval_status: archive_only` — they are not trusted until classified.

---

## Volatility Tiers

Not everything expires at the same rate. Expiry windows are based on content volatility.

### HIGH volatility — 30-day verification window

- SDK documentation and usage examples
- API integration steps and code samples
- Model names, model IDs, model capabilities
- Pricing, rate limits, quota documentation
- Policy settings and compliance requirements
- Deployment instructions and infrastructure guides
- Prompt recipes tied to specific tooling or model versions

### MEDIUM volatility — 90-day verification window

- Architecture notes and internal implementation guides
- Migration plans and transition strategies
- Vendor comparison documents
- Internal API contracts between services

### LOW volatility — 180+ day verification window

- First-principles architecture (S4 standard, Sovereign Session model)
- Governance doctrine (this document, Safe Mode Contract, etc.)
- Security principles and threat models
- Entity models and canonical data relationships
- Control-plane concepts and execution-plane boundaries

---

## Hard Retrieval Rules

Agents operating within the Gateway Global AI OS must follow these rules without exception:

1. **PREFER** `official` + `active` sources. If a live URL exists for vendor documentation, use it. Do not use a local copy.
2. **BLOCK** `archive_only` and `dead` sources from default retrieval. These are invisible to the agent unless the user explicitly requests historical reference, a migration audit is running, or a regression comparison is needed.
3. **WARN** on expired documents. If `expires_at` has passed and the document has not been re-verified, the agent must flag this before citing it.
4. **REFUSE** deprecated sources. Documents with `retrieval_status: purge_candidate` or `authority_level: dead` must not be cited under any circumstances.
5. **DOWNRANK** `research_note` and `vendor_snapshot` below `sdk_url`, `api_reference`, and `internal_spec` in all retrieval and citation decisions.

---

## Violation Policy

### What constitutes a violation

An agent commits a knowledge governance violation when it:

- Cites expired SDK documentation as current truth
- Uses deprecated model names or model IDs
- References old API paths that have been superseded
- Treats an `archive_only` document as authoritative
- Uses a static copy of vendor documentation when a live URL source exists
- Generates code based on stale integration patterns

### Violation consequences

- **`block_response`**: Agent output that cites expired, deprecated, or archived sources is blocked from delivery. The system does not surface unverified knowledge to the user.
- **`require_recertification`**: The knowledge artifact that triggered the violation is flagged for re-ingestion from the live authority source. The agent cannot use that knowledge path again until the certification pipeline (`knowledgeCertificationContext.ts`) re-verifies and re-certifies it.

A stale-doc citation is a governance failure equivalent to a prompt drift violation.

---

## Archive Boundary

Three retrieval states, enforced at the system level:

| State | Retrieval Behavior | Transition Trigger |
|-------|-------------------|-------------------|
| `ACTIVE_KB` | Default retrieval, agents can cite freely | Passes verification, within expiry window |
| `ARCHIVE_ONLY` | Invisible to normal retrieval | Expiry window exceeded without re-verification |
| `PURGE_CANDIDATE` | Zero retrieval, scheduled for deletion | Marked dead by owner or system audit |

### When archived content becomes visible

Archived content is accessible **only** when:
- The user explicitly asks for historical reference
- A migration audit is running
- A regression comparison is needed

In all other cases, archived content does not exist from the agent's perspective.

---

## Vendor SDK Policy

For fast-moving platforms, the system enforces URL-first authority:

| Vendor | Authority Source | Static Copies Allowed? |
|--------|-----------------|----------------------|
| Google (Gemini, Maps, Cloud) | `ai.google.dev`, `cloud.google.com/docs` | Only if pinned with expiry |
| Twilio | `twilio.com/docs` | Only if pinned with expiry |
| Stripe | `docs.stripe.com` | Only if pinned with expiry |
| Vercel | `vercel.com/docs` | Only if pinned with expiry |

Static markdown copies of vendor SDK documentation without an explicit `pinned_snapshot` classification, owner, reason, and expiry date are **automatically classified as `purge_candidate`**.

---

## Enforcement Points

| Component | Role |
|-----------|------|
| `knowledgeCertificationContext.ts` | Certification pipeline — verifies knowledge against live authority |
| Aptitude test scenarios | Mandatory gate — agents must pass before deployment |
| Prompt compiler | Confinement boundary — only certified knowledge enters the prompt |
| This document | Policy authority — defines what "certified" means |

---

## Canonical Policy Statement

> Vendor SDK and API docs: URL-first authority only.
> Static copies of volatile docs: expire in 30 days unless re-verified.
> General internal research: review at 90 days.
> Archived materials: not retrievable by default.
> Dead docs: purge from active KB.
> Violation: block response + require recertification.
