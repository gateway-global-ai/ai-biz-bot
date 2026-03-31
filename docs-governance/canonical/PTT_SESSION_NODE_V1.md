---
status: canonical
truth_domain: architecture
enforced_by: execution-plane-boundary.mdc (read hook before Concierge/session wiring changes; not a runtime linter)
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-30
aliases:
  - LIVE_INTERFACE_NODE_V1
---

# PTT session node v1 (live interface node)

## Purpose

Define the **normative runtime abstraction** for the Clear Voice / Concierge **live shell**: a **governed session node** that composes intent, memory, views, tools, and behavior — **without** treating **`site_configs` as the chassis** of the experience.

This doc names the **target model**. Today’s code still threads `siteConfigId` and business context through `ConciergePanel`, voice setup, and orchestration; refactors should **converge** toward this contract rather than deepen “PTT as a page mounted on a website.”

## Problem statement

When the PTT layer is **born from site config first**, it inherits:

- Brand / site identity as the primary frame  
- Routing and “page” assumptions  
- Business-context bias in prompts and idle UI  
- Static presentation defaults that fight **play mode**, **operator mode**, and **public exploration**

That coupling explains friction: **platform exploration** and **intent-first canvas** compete with **tenant semantics** that were not meant to be the minimum unit of a live session.

## Core thesis

**The minimum unit of a governed live session is an interactive session node — not a website row.**

- **`site_configs`** (and related anchors) are **importable profiles**: branding, business identity, knowledge, tenant policies, allowed templates.  
- They **must not overdetermine** shell composition, idle framing, or voice behavior when the session is public, operator-scoped, or exploration-first.

**Good summary (normative):**  
The PTT interface is **not** “a page attached to a site config.” It is a **governed session node** that may **mount** site config, knowledge, skills, permissions, actions, and views as **runtime inputs**.

## Session node (runtime object)

A **PTT session node** (alias: **live interface node**) is the container for one live Concierge / Clear Voice session. Its **logical** fields group as follows (implementation may map to existing types + new envelopes over time).

### 1. Imports (attachments)

Optional bundles mounted for this session only or until explicitly swapped:

| Import | Role |
|--------|------|
| **Business profile** | Tenant identity, services, hours — from `site_configs` + anchors when mounted |
| **Knowledge base** | Certified / library content scoped to the mounted business or global platform corpus |
| **Saved views / artifacts** | Prior canvas payloads, pinned experiences, session carry-over |
| **Prior session artifacts** | Continuity hooks (visitor id, funnel keys) without equating “session” with “site” |

**Rule:** A valid node may run with **no business import** (e.g. `platform_landing`, demo, operator).

### 2. Skills

Capabilities **enabled for this node** (registry-backed, mode-aware), not “everything the tenant ever bought.”

- Aligned with operational mode + integration graph where model-visible tools apply.  
- Distinct from **imports**: skills are **what may execute**; imports are **what context is true**.

### 3. Permissions

- Read / write / act scopes for this session  
- Tool and service boundaries (mutation gate, execution contracts)  
- **Operator vs customer vs public** lanes without spoofing tenant identity

### 4. Actions

- Allowed **action ids** (see `ACTION_REGISTRY.md`) for this node  
- Optional **saved action sets** (presets for industry or demo)

### 5. Helpers

- Starter intents, **shell chips**, exploration prompts  
- **Not** a second prompt engine — helpers are **UI + short phrases** that feed the same intent/orchestration path

### 6. Views

- Registered **canvas / view surfaces** (`viewId`, syscall contract)  
- Overlays (appearance, sign-in, command center)  
- History / transcript surface vs live canvas ( **view mode** — see below)

### 7. PTT controls (chrome)

- Push-to-talk behavior, layout cycle, dock slots  
- Header/footer/icon policy (sovereign chat lockdown + brand tokens)  
- **Presentation** of the node — not business semantics

### 8. System prompt controls (behavior)

- Intent framing, desired outcome, **behavior mode** (play / business / operator / demo)  
- Voice persona, **memory policy** (what persists vs ephemeral)  
- Compiled through **prompt compiler** / governance templates — not raw UI strings

### 9. Intent state (cross-cutting)

- Resolver phases, active experience, canvas syscall trace — already partially modeled in intent loop + orchestration  
- First-class **intent state** belongs on the **node**, not on `site_configs` rows

## Site config: attachment, not chassis

When a business is **mounted**:

- `site_configs.id` remains the **internal site anchor** (`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`).  
- Branding, knowledge, tenant policies, and business-specific helpers flow through **Imports** + **Permissions** + **Skills**, not by re-labeling the whole shell as “the website.”

## View modes (orthogonal to tenant)

Composable surfaces on the **same node** (not separate “pages” as authority):

| Mode | Description |
|------|-------------|
| **Live voice + canvas** | Default PTT + content window |
| **Chat / history** | Transcript-forward |
| **Workspace / operator** | Command center, admin surfaces — still a node variant |
| **Appearance overlay** | Canvas chrome / background — node property |
| **Business demo overlay** | Business lookup / demo flow **mounted** when user opts in |

## Invariants (implementation guardrails)

These rules keep the **runtime session object** from collapsing back into **page or site semantics**.

1. **A node may exist with no mounted site config.** Public, operator, and exploration sessions are first-class; `site_configs` is optional until an import is attached.
2. **Starter chips are intent events, not visible prompt text.** Chips dispatch phrases or actions into the same intent/orchestration path — they are not a parallel copy of the system prompt and must not duplicate long instructional prose in the UI.
3. **Overlays are node views, not chat messages.** Appearance, sign-in, command center, and demo surfaces mount as **views on the node** (or syscall-driven canvas), not as assistant bubbles pretending to be the authority.
4. **Route changes must not break node continuity unless explicitly required.** Navigation may swap browser URL adapters; the **governed live session** should preserve identity, intent state, and mounted imports unless the product explicitly starts a new session.
5. **Business / demo flows mount into the active node before considering navigation.** Prefer mounting overlays, canvas views, or imports on the current node; full-page hops are a last resort when the flow cannot be expressed as a node view.

## Relationship to existing canonical docs

| Doc | Relationship |
|-----|----------------|
| [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md) | Hot path stays thin; node **decides** admission; plane **executes** gated work |
| [`VOICE_EXECUTION_ARCHITECTURE_V1.md`](./VOICE_EXECUTION_ARCHITECTURE_V1.md) | Transport vs orchestration vs model — node **owns** orchestration-facing session identity |
| [`EXECUTION_MUTATION_GATE_SPEC_V1.md`](./EXECUTION_MUTATION_GATE_SPEC_V1.md) | Permissions + tools on the node must **not** bypass the gate |
| [`INTENT_LOOP_GOVERNANCE_V1.md`](./INTENT_LOOP_GOVERNANCE_V1.md) | Intent state and canvas merge order **live on the node** |
| [`SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md`](./SITE_IDENTITY_AND_EXTERNAL_REFERENCE_V1.md) | Site id is **reference** for imports — not the shell’s root object |
| [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md) | `siteConfigs` remains an anchor for **persistence**; session node is **runtime** |
| Handover / `site_config` consumption (see `.cursor/rules/handover-protocol.mdc`, `server/routes/siteConfigRoutes.ts`) | Handover supplies **attachments** and compiled prompts into the node |

## Non-goals (v1)

- Replacing `siteConfigId` in every WebSocket message in one PR.  
- New database tables **required** by this doc alone (design authority first).  
- Redefining voice lockdown file ownership — transport files stay frozen per policy.  

## Implementation direction (informative)

- Introduce or extend a **session context** type (client + server) that lists **node id**, **behavior mode**, **mounted site id (nullable)**, **skill allowlist**, **active view**, and **import handles**.  
- Thread **behavior mode** into prompt compilation and idle UI (chips, copy) instead of overloading `platform_landing` string checks everywhere.  
- Treat `ConciergePanel` props as **views into the node** over time, not as “the site page.”

## Revision

When execution-plane or Concierge session wiring changes materially, update **last_verified** and reconcile this doc with `VOICE_EXECUTION_ARCHITECTURE_V1.md` and `INTENT_LOOP_GOVERNANCE_V1.md`. Revisit **Invariants** if new UI patterns (chips, overlays, navigation) risk re-binding the shell to site-page semantics.
