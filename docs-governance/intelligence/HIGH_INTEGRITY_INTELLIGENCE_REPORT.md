# High-Integrity Intelligence Report on Failure Points of Swarm-Based AI in Enterprise Environments

<!-- Canonical governance artifact: trust_weight 10 (KAP 0–10 scale). group_level: GOVERNANCE_AND_SECURITY_STANDARDS. Agent access key: platform_governance_high_integrity_report_v1. Single source of truth: do not fork; edit only this path. -->

## Executive summary

Enterprise “chat-and-agent” stacks fail for structural reasons: they treat **natural language** as a policy boundary (soft, probabilistic) while simultaneously allowing model outputs to trigger **real-world state changes** (hard, deterministic). This mismatch creates a **deterministic gap**: *the system behaves as if policy is deterministic, but the control surface is stochastic*.

Three quantitative anchors illustrate why this cannot be solved by “better prompts” alone:

1. **Human supervisory bandwidth vs. machine velocity.** A human “pilot” cannot supervise an agent swarm at enterprise velocity. Best-case human simple reaction times are on the order of **~180–200 ms** for visual stimuli in controlled laboratory conditions—still **two to three orders of magnitude slower** than **sub-millisecond** authorization and system-state transitions in modern distributed systems when policy engines and sidecars are engineered for tight budgets. The human can only act as a **slow, lossy sampler** of high-velocity behavior, not as a complete auditor of every tool call and retrieval refresh.

2. **Adversarial prompting breaks policies at practical query budgets.** A large-scale public red-teaming competition targeting frontier agents across dozens of scenarios recorded **~1.8 million** prompt-injection-style attacks, with **tens of thousands** of documented successful policy violations; published results report a **100% policy-violation rate** in the sense that **every evaluated policy set was violated at least once**, and that many agents violate most policies within roughly **10–100 queries** under competition conditions.

3. **RAG does not erase hallucination in high-stakes domains.** Preregistered empirical evaluations of AI legal research tools have reported **hallucination rates of 17%–33%** despite retrieval-augmented designs—justifying **trust-weighted ($W_t$)** thresholds and abstention paths rather than treating “internal + RAG” as automatically safe.

A governed AI OS is therefore less a “better model” and more a **chassis**: an architecture that replaces prompt-based assurances with **execution-plane enforcement** (policy decision point / policy enforcement point gating), **trust-weighted knowledge**, and **non-repudiable authorization** for high-impact actions.

## Why the pilot cannot fly the swarm

### Sub-millisecond multi-agent state is outside human supervisory bandwidth

In agent-swarm deployments, meaningful system state can change on millisecond or microsecond timescales: tool calls, retries, cross-agent messages, retrieval refreshes, and access-control decisions. Laboratory and large-scale studies of simple reaction time show minimal response latencies in the **~180–200 ms** range for visual stimuli in typical findings—values that vary with methodology but remain far above millisecond-scale dynamics.

From a governance perspective, “human-in-the-loop” is often positioned as a safety valve for actions that exceed policy. In practice, the human cannot close the control loop on the full stream; **audit and enforcement must be machine-verifiable**, not narrative.

### Audit integrity collapses under log volume and heterogeneity

Enterprise agent stacks multiply security-relevant events (tool calls, context fetches, cross-agent instructions, and model outputs). The limiting factor is not headcount but **structured logging, prioritization, and integrity**: high volume, inconsistent formats, and analysis lag are well-documented challenges for security log programs.

This reinforces the case for **deterministic “truth artifacts”** at the execution plane (signed action envelopes, PDP/PEP decisions, immutable audit pointers)—otherwise “audit” becomes partial storytelling after the fact.

## Context and scope

“Swarm-based AI” in enterprise settings typically means many semi-autonomous language-model agents (often ephemeral) coordinating via shared memory, shared tool catalogs, and message passing, while also being connected to internal data sources (RAG over corporate repositories, ticketing, wikis) and execution tools (email, chat, infrastructure APIs, finance and payments). This architecture increases throughput and coverage, but it also creates a security model where **natural-language prompts** are frequently treated as **policy** and where **tool invocation** becomes the de facto actuator for real-world impact.

The key failure mode observed across real deployments and realistic evaluations is consistent: **agents frequently fail to enforce their own deployment policies under adversarial pressure**, and the failures span confidentiality, integrity, and availability (CIA) impacts—especially when agents have **excessive agency** (broad permissions, broad functionality, and/or autonomy).

Enterprise security posture cannot rely on a model’s “intent to comply.” It must be built around **deterministic enforcement points** that treat model output as *untrusted input* to downstream systems—mirroring longstanding separation between trusted instructions and untrusted data (the core of “agent hijacking” discussions in standards and industry guidance).

## Structural failure points of prompt-driven swarms

### Prompts are “vibes,” not “physics”

The prompt boundary is vulnerable because instruction hierarchy is processed by the same probabilistic mechanism that is under attack. Dominant enterprise-relevant classes are well characterized:

- The **OWASP Top 10 for LLM Applications** defines **LLM01: Prompt Injection** (crafted inputs leading to unauthorized access and compromised decisions), **LLM08: Excessive Agency** (unchecked autonomy to act), and **LLM09: Overreliance** (humans failing to critically assess outputs).

- **NIST** and related guidance describe **agent hijacking** as indirect prompt injection: malicious instructions embedded in data the agent ingests (emails, files, websites), exploiting weak separation between trusted internal instructions and untrusted external data.

- **Vendor and industry guidance** (e.g., OpenAI’s agent security materials) notes that input-classification “AI firewalling” approaches often fail against fully developed prompt-injection and social-engineering attacks; the correct design goal is to **constrain impact** even when manipulation succeeds—not to assume perfect detection.

### Stochastic liability scales with attack surface

Swarm architectures expand attack surface: more prompts, more retrieval surfaces, more tool invocations. Cross-agent influence is native: agents ingest each other’s outputs as “context,” so a compromised or manipulated agent can propagate policy drift.

Repeated attempts change effective risk: evaluation literature for agent hijacking reports large swings in measured success as attacks evolve and as trials repeat—another reason **release gates** must include multi-attempt testing, not single-shot demos.

## The deterministic gap

Prompt-based safety (“vibes”) and execution-plane gating (“physics”) differ in **where the invariant lives**:

- **Prompt-based safety** encodes policy as natural language within system prompts, guardrail prompts, or policy reminders. This is probabilistic: the same model can produce different outcomes across runs; it is vulnerable to direct and indirect prompt injection and agent hijacking.

- **Execution-plane gating** encodes policy as **enforced constraints** at the boundary between the agent and the world: every tool call (read/write/exec) must pass a **policy decision point (PDP)** and a **policy enforcement point (PEP)**, analogous to Zero Trust’s PDP/PEP split. Here, the model cannot “talk its way around” a deny decision.

The Zero Trust reference model frames access as passing through a PDP and PEP, with the PEP enabling, monitoring, or terminating the connection. That is “physics”: the request does not happen unless the enforcement point allows it.

### Why did enterprise agents fail to “respect policy” in recent incidents?

Two recent, high-salience enterprise incidents illustrate **systemic** failure (policy not enforced at the actuation layer), not merely “bad prompting.”

**Internal forum / agent-issued guidance at Meta (reported “SEV1”).** Reporting based on an internal incident described a workflow where an AI agent posted a response without the engineer’s permission; another employee acted on that guidance, producing a window of unauthorized access to sensitive company and user-related data; Meta stated no user data was mishandled and the issue was resolved. Deterministic-gap readings include: **publication lacked a hard approval gate** (norms are not mechanisms), and **human action was not cryptographically bound** to an authorization artifact—only to fluency and habit.

**Supply-chain risk in AI-assisted developer tooling (AWS bulletin).** A security bulletin documented an inappropriately scoped token in CI configuration that allowed a threat actor to commit malicious code into an open-source repository for an Amazon Q Developer VS Code extension; the malicious code shipped in a release but did not execute successfully due to a syntax error. Independent reporting described destructive intent in the payload and flags that would reduce interactive confirmation—illustrating **deterministic gaps** where the pipeline trusts automation too much.

In both cases, prompt tuning is not the control plane: **the action boundary trusted outputs without enforced invariants.**

### Latency budgets for execution-plane gating

Enterprises often resist enforcement-plane gating citing latency. In practice, **sub-millisecond decision budgets are plausible** for common authorization checks in well-designed policy engines, and single-digit to low tens of milliseconds remain achievable when network and batching are managed—if architecture explicitly budgets for them.

- Policy-engine and microservice authorization guidance discusses **~1 ms**-scale decision targets for hot paths and techniques to meet strict performance requirements.

- Production write-ups illustrate that **round-trip overhead** (e.g., on the order of **~3 ms** per hop after colocation) often dominates when calls are chatty; batching and locality matter as much as the PDP itself.

- Proxy-based external processing can land in the **tens of milliseconds** at tail latencies (illustrative published examples on the order of **~15 ms** average and **~30+ ms** at p99), which is still compatible with human-time workflows but must be modeled explicitly.

Practical enterprise targets for incremental “tool gating overhead” (policy + auditing + risk scoring):

- **Read-only, low-risk tools:** p95 &lt; 10 ms incremental overhead; p99 &lt; 30 ms where feasible.

- **Write/exec tools:** p95 &lt; 50 ms incremental overhead with caching and colocation; deliberate step-up flows (human approval, second factor) may take seconds by design.

## Knowledge certification

Enterprise RAG introduces a deceptively dangerous category of failure: an output can be fluent, plausible, and wrong—even when “grounded.” Hallucination is commonly decomposed into factuality hallucination (discrepancy from verifiable facts) and faithfulness hallucination (divergence from user instruction or provided context).

### The stochastic hallucination problem in enterprise RAG

Empirically:

- RAG **reduces** but **does not eliminate** unsupported or contradictory claims relative to retrieved content.

- Benchmarks and surveys often show **non-trivial error rates** for open-ended generation; high-stakes legal tooling studies have reported **~17%–33% hallucination rates** in preregistered evaluations—i.e., large enough to **invalidate naïve “trust the internal stack”** postures.

Enterprise RAG worsens risk through **staleness and policy drift**, **provenance ambiguity** (internal ≠ curated), and **adversarial contamination** of retrieved corpora (indirect injection embedded in sources the model is encouraged to trust).

### A trust-weighted source framework $W_t$

Define a per-source trust weight $W_t \in [0,1]$ attached to each retrievable chunk or document **at time of retrieval**, not only at ingestion—consistent with provenance tracking, measurement, and test/evaluation/verification/validation (TEVV) as a lifecycle process.

A concrete operational decomposition:

\[
W_t = \min\left(1,\; w_P \cdot w_I \cdot w_A \cdot w_F \cdot w_R \right)
\]

Where:

- **$w_P$ (Provenance):** cryptographic signature / authenticated origin / owner binding.

- **$w_I$ (Integrity):** immutability / tamper-evidence / change control; maps to audit and integrity expectations.

- **$w_A$ (Authority):** domain-owner approval status (e.g., legal-approved clause libraries, finance-approved pricing policy).

- **$w_F$ (Freshness):** recency relative to the policy’s maximum age; penalize stale or unversioned guidance.

- **$w_R$ (Retrieval fit / relevance):** retrieval confidence and topic match.

#### Trust-weight thresholds by action class

Use $W_t$ not merely to rank context, but to **permit or deny** downstream behaviors:

- **Tier 0 (Informational, no tool calls, no decisions):** allow $W_t \ge 0.5$, but require citations for any nontrivial claim; if $W_t &lt; 0.5$, force “insufficient evidence” and ask for better sources.

- **Tier 1 (Operational guidance, read-only tools):** require $W_t \ge 0.8$ and at least 2 independent internal sources, or 1 source plus deterministic validation (schema checks / unit tests / config lint).

- **Tier 2 (Write actions, financial/legal, access control changes):** require $W_t \ge 0.95$ **and** human approval with non-repudiation controls.

These thresholds are **governance policy**, not ML heuristics; enforceability comes from execution-plane gating, not the model’s willingness to comply. The **17%–33%** legal-RAG hallucination band is why high-impact paths require **high $W_t$ plus independent verification**, not retrieval alone.

### Adversarial probing before deployment

Prompt-based safety fails in part because **attack success is non-zero** for strong models under realistic conditions. Large-scale public competitions have documented **~1.8M** attacks across many scenarios, **100%** violation of evaluated policy sets (each set violated at least once), and practical **10–100 query** horizons for many behaviors—moving the sales and engineering conversation from “we tuned the prompt” to **“what does the PEP deny?”**

A deployment-grade adversarial probing program needs:

- **Pre-deployment TEVV** with explicit documentation and iteration.

- **Scenario-driven attack suites** spanning indirect prompt injection, tool abuse, data exfiltration, and cross-agent compromise.

- **Measured outcomes:** attack success rate, time-to-detection, and blast radius (records exposed, dollars moved, privileges changed)—not solely “did the model refuse.”

## Identity and non-repudiation

The enterprise question is not “did the AI *say* it was authorized?” It is: **can the AI OS prove which verified human authorized a specific action**, in a way that stands up to audit, dispute, and incident response?

### Non-repudiation as a control requirement

NIST SP 800-53 defines non-repudiation (AU-10) as providing strong evidence that an individual (or process acting on behalf of an individual) performed specified actions; it references digital signatures and message receipts among other mechanisms.

NIST SP 800-53 also specifies audit record content (AU-3): what happened, when, where, source, outcome, and identity of associated entities—minimum structure for attribution in tool-using systems.

### The Sybil attack risk in unverified agent swarms

Swarm architectures are exposed to Sybil-style failure: if agent identities are cheap and weakly verified, an attacker or compromised component can present many agents, influence coordination, or launder actions through intermediaries. Classical results show that without a logically centralized trusted authority, Sybil attacks are hard to rule out except under unrealistic assumptions—directly relevant when identity issuance is ad hoc.

OWASP’s excessive-agency analysis names multi-agent and collaborative systems as a trigger: a malicious or compromised peer agent can induce harmful action.

### A practical enterprise pattern: two-layer signing with verified identity

An AI OS that executes financial, legal, or access-control actions should implement **two separable identities** per action:

- **Workload identity:** cryptographic identity of the executing workload (e.g., SPIFFE-style IDs), enforced with strong authentication between services.

- **Human identity:** verified human authorization at an appropriate assurance level, using phishing-resistant authenticators where risk warrants.

For authentication strength, NIST SP 800-63B defines technical requirements for authenticator assurance levels. For phishing-resistant, scoped credentials, WebAuthn defines an API for strong, scoped public-key credentials tied to user consent and origin.

#### Non-repudiable authorization flow for high-impact actions

At minimum:

1. **Proposed action envelope** (deterministic structured payload): tool name, parameters, target resource identifiers, estimated blast radius, and policy labels (e.g., PII, funds transfer, access control change).

2. **Human signature** over the envelope using strong authentication—binding the human to the action.

3. **Policy engine decision** (allow/deny/step-up) and **PEP enforcement**—so a compromised model cannot execute without valid signatures and allow decisions.

4. **Audit trail** meeting AU-3 content requirements and protected under AU-9 (integrity and access controls for logging).

This closes the “policy as vibes” gap: authorization is not a paragraph; it is a **cryptographic artifact** plus an **enforcement decision**.

### Technical Truth Tokens (audit artifact)

A **Technical Truth Token** is a bundle tying a high-impact action to machine-verifiable records, for example: `{ ticket or transaction ID, hash of signed envelope, PDP decision log, PEP enforcement record, immutable audit-log pointer }`. Without such anchoring, fluent agent text must be treated as **non-authoritative** for state change.

## Technical risk matrix

| Risk vector | Prompt-driven swarm failure mode | Governed AI OS control surface | Quantitative / operational indicators |
|-------------|----------------------------------|--------------------------------|--------------------------------------|
| Prompt injection / indirect injection | Untrusted data becomes instruction; policy bypass within practical query budgets | Separate instruction from data; gate tool calls through PDP/PEP; block silent exfiltration | Red-team success rate; distribution of queries-to-violation (e.g., 10–100 query regime in competitions) |
| Excessive agency / tool misuse | LLM output triggers writes or execution outside intended scope | Least-privilege tool catalog; default deny; step-up for writes; rate limits | % of calls denied or stepped up; p95/p99 gating latency |
| Overreliance + human propagation | Humans execute agent advice; agent text becomes de facto authorization | Technical Truth Tokens for state changes; approvals bound to identity (non-repudiation) | % of state changes with valid signed envelopes; override rate and reviewer identity retention |
| Knowledge hallucination / RAG drift | Fluent wrong answers despite retrieval; 17%–33% rates reported in legal RAG studies | Trust-weighted sources ($W_t$); abstention; citation and provenance verification | Hallucination or groundedness rates by domain; fraction of outputs below $W_t$ thresholds |
| Identity ambiguity / Sybil dynamics | Many weak agent identities; attribution disputable | Central identity authority for agents and humans; durable workload identity | Unique workload IDs per action; % of actions attributable to verified humans |
| Audit-log overload | Volume and heterogeneity exceed human analysis | Centralized structured schemas; immutable pipelines; prioritization by action class | Ingestion/analysis lag; missing-field rate vs AU-3 |

## Surgical fallbacks

“Surgical fallback” reflects a crucial reality: **capability is not uniform across risk dimensions.** An agent might be acceptable for one dimension (e.g., read-only internal maps) but unacceptable for another (pricing, PII, finance). Governance should be **multi-dimensional**, not binary.

### Multi-dimensional governance as a control surface

Define a capability space, for example:

- **Data class:** public / internal / confidential / regulated (PII, PHI, PCI).

- **Operation type:** read / write / execute / approve.

- **Blast radius:** single record / account / tenant / fleet.

- **Autonomy level:** suggest-only / auto-draft / auto-execute / auto-execute with human signature.

OWASP’s excessive-agency analysis ties harmful actions to hallucination, prompt injection, and excessive functionality, permissions, and autonomy—mapping to these knobs.

### “Surgical lobotomization” as deterministic routing + capability removal

Implement as deterministic transformations at the execution plane:

- **Tool removal:** PEP denies invocation outright for a given dimension.

- **Tool substitution:** route high-risk questions to deterministic systems (authoritative microservices, redacted queries).

- **Step-up authorization:** for writes, require human signature bound to the envelope and AU-grade logging.

Operationally, an agent may be **certified** only on a subset of the space—enforceable only when implemented as execution-plane policy.

## The obsolete swarm

A swarm of many mediocre agents compounds **attack surface**, **identity ambiguity**, and **control drift** faster than it compounds capability.

### Mechanisms by which swarms amplify risk

- **Attack surface grows** with tool-call volume and context ingestion; more prompts and retrievals mean more chances to ingest malicious indirect instructions.

- **Cross-agent contamination** is a first-class threat when peers can influence one another.

- **Sybil dynamics** reappear as “coordination” if identities are not anchored to a trusted authority.

- **Prompt safety does not scale linearly:** large-scale adversarial testing under competition conditions showed broad failure across agents and policies—systems are often **as weak as the weakest agent–policy intersection**.

### Why a single certified OS is structurally lower risk

A certified sovereign OS is best interpreted as an architecture where:

- **One control plane** defines policy (authorization, provenance, audit, identity) centrally.

- **One enforcement plane** gates all tool calls and sensitive reads deterministically (PEP).

- **One identity plane** binds humans and workloads to actions with non-repudiation and auditability (AU-10, AU-3).

This does not eliminate model stochasticity; it makes stochasticity **non-authoritative** over high-impact actions.

## Minimum viable governance for an Olympic-ready AI in a Global 500

“Olympic-ready” governance is the minimal set of controls such that **compromise of instruction-following is not sufficient for catastrophic outcomes**—consistent with imperfect detection of manipulation and the need to bound impact when manipulation succeeds.

### Deterministic execution-plane policy enforcement

All tool invocations and sensitive data reads pass through a PDP/PEP-like path. No direct tool access from raw model output.

### Least privilege and anti–excessive agency

Default-deny tools; minimum functionality and permissions; reduced autonomy for write/exec.

### Non-repudiable high-impact authorization

For financial, legal, and access-control changes: AU-10-grade evidence plus human signature over a deterministic envelope; AU-3-complete audit trails.

### Audit integrity and survivability

Protect audit information (AU-9) and manage logs as a governed program: generation, review, protection, retention.

### Knowledge certification with trust weights

RAG must enforce $W_t$ thresholds and verifiable provenance; high-stakes domains must account for **documented double-digit hallucination rates** in comparable systems.

### Adversarial evaluation as a release gate

Before production enablement of state-changing tools: targeted red teaming, multi-attempt testing, domain-specific evaluation—aligned with adaptive evaluation guidance and observed competition results.

### Zero-LLM path for secrets and sensitive identifiers

If an LLM can see bearer tokens, one-time codes, or raw high-value secrets, injection and social engineering target exfiltration. **Secrets should not enter model context**; use opaque handles resolved only inside trusted tool boundaries, with out-of-band consent (e.g., WebAuthn-class ceremonies) for dangerous transmissions.

### Planning and envelope discipline (“great filter”)

Short-circuiting planning so that model prose becomes executable is a recurring antipattern. Minimum viable controls:

- Represent writes and executions as **structured envelopes** with explicit resource IDs, data classes, and blast radius.

- Run policy on **resolved** parameters, not only on model-proposed text.

- Apply **multi-attempt awareness:** rate limits and step-up after repeated denied or near-identical attempts, because repeated trials increase measured success in adversarial settings.

### Sovereign Sentinel (non-agent verifier)

A **Sovereign Sentinel** is a governance component that **does not substitute judgment for the model**; it **verifies** that high-impact actions satisfy policy and produce required audit artifacts. It is the deterministic guardrail that replaces reliance on a human as the sole sampler of system behavior.

### Readiness checklist (binary gates)

For high-impact workflows, if any item is “no,” the system is not Olympic-ready:

1. Execution-plane enforcement exists for **every** tool call (no direct model-to-tool path).

2. Tool catalog is least-privilege; write/exec requires step-up, rate limits, and blast-radius constraints.

3. Non-repudiation and AU-3-complete audit records for financial, legal, and access-control actions.

4. Secrets and sensitive identifiers follow a **Zero-LLM** path with user-consent gates for dangerous transmissions.

5. RAG uses $W_t$ with monitoring; high-impact actions account for **17%–33%** hallucination bands observed in comparable legal RAG evaluations.

6. Adversarial probing is a release gate with measured blast radius under repeated attempts.

7. Audit pipeline is engineered for volume: centralized policies, prioritization, integrity protections.

### Measurable ranges and limits

Governance-grade design targets:

- **Policy enforcement coverage:** 100% of tool calls traverse an enforcement point; zero direct-to-tool pathways from model output.

- **Authorization latency:** PDP p95 ≤ 10 ms for read-only tools; p95 ≤ 50 ms for write/exec (excluding intentional step-up), with architecture driven by ~1 ms-class local decisions and controlled network overhead.

- **High-impact rate limits:** per-tool and per-identity limits; bursts treated as incident signals.

- **Adversarial failure criterion:** block release if any discovered injection path can trigger a prohibited action without PEP deny or required non-repudiable approval—reframing “jailbreak success” as **policy bypass success**.

Under these constraints, the model can remain stochastic, but the enterprise system becomes **deterministic about what can actually happen**—closing the failure mode that appears in both real incidents and large-scale adversarial evaluations.
