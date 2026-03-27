---
status: canonical
truth_domain: ui
enforced_by: view-and-action-registry.mdc, prompt-runtime-governance.mdc
backed_by:
  schema: false
  service: false
  route: false
last_verified: 2026-03-25
---

# AI Design Studio — Governed System Spec (V1)

Single anchor for the **customer-first, intent-driven design operating system**: a governed **design-to-deployment pipeline** inside the **shared canvas** — not an unconstrained UI generator and not a generic chat assistant.

**Related:** [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) (Design Studio views), [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) (actions TBD per implementation), [`gateway-sdk-manifest.yaml`](../../registry-yaml/gateway-sdk-manifest.yaml), [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md), [`APP_SHELL_CONTRACT.md`](./APP_SHELL_CONTRACT.md), [`INTENT_DRIVEN_CANVAS_SPEC.md`](./archive/INTENT_DRIVEN_CANVAS_SPEC.md) (archive — reference only). Shadcn MCP narrative: [`user_uploads/new/shad_cn_mcp_plan.md`](../../user_uploads/new/shad_cn_mcp_plan.md).

---

## 1. System purpose

The AI Design Studio enables business owners to:

- describe what they want  
- see options  
- approve a plan  
- watch UI generate in **real time** (talk → canvas updates)  
- test and deploy  

**Definition:** A **governed design-to-deployment pipeline** operating inside a **shared canvas**, with **enforced behavior**, **registry-backed layout**, and **no silent improvisation**.

---

## 2. Core law (non-negotiable)

### 2.1 UI governance law

```yaml
ui_governance_law:
  forbidden:
    - inline_css
    - hardcoded_colors
    - raw_component_generation
    - layout_outside_registry
    - unapproved_theme_usage

  required:
    - use_ui_core_or_registry_components
    - use_css_tokens_only
    - pass_through_design_pipeline
    - validate_before_render
```

**Repo alignment:** [`brand.ts`](../../client/src/config/brand.ts) and future token maps are the **only** approved sources for color/spacing on governed surfaces unless a **stakeholder-signed reference** extends them. **No agent-invented palettes.** See color-authority incident notes in UI governance planning.

### 2.2 Component authority

```yaml
component_authority:
  product_surface:
    source: "@/ui-core"
    status: authoritative

  design_studio_surface:
    source:
      - shadcn_mcp
      - gateway_registry
    status: discovery_only

  promotion_rule:
    - must_be_wrapped
    - must_be_themed
    - must_be_registered
```

**Interpretation:**

- **Hand-written operator / product UI** (outside Design Studio generation lane) remains subject to [`SOVEREIGN_UI_GOVERNANCE_RULES.md`](../../docs/ux/SOVEREIGN_UI_GOVERNANCE_RULES.md): **`@/ui-core`** for new control-plane code.  
- **Design Studio generation** may **discover** via Shadcn MCP and [`gateway-sdk-manifest.yaml`](../../registry-yaml/gateway-sdk-manifest.yaml); **promotion** to production imports **always** goes through **wrap → theme tokens → manifest registration**.

### 2.3 Theme authority

```yaml
theme_authority:
  default: light-apple

  allowed:
    - light-apple
    - dark-apple
    - crystal-glass

  rules:
    - no raw hex usage
    - no agent-generated palettes
    - all colors via tokens
```

**Implementation note:** Named presets (`light-apple`, `dark-apple`, `crystal-glass`) must be **defined as token bundles** (CSS variables and/or `brand.ts` / theme module) in code — not as freeform model output. Until those bundles exist, Design Studio **must not** claim theme approval without a **signed** reference mock.

---

## 3. System architecture

```text
User (Voice / Text)
    ↓
Intent engine
    ↓
Design Studio agent (Chad)
    ↓
State machine (8-phase pipeline)
    ↓
Component discovery (Shadcn MCP)
    ↓
UI generation (governed)
    ↓
Canvas rendering
    ↓
User feedback / actions
    ↓
Validation → Save → Deploy
```

---

## 4. Agent definition

### 4.1 Role

```yaml
agent:
  id: design_studio
  name: Chad
  archetype: graphic_designer

  relationship:
    user: business_owner
    role: guided_design_partner

  behavior:
    A: high    # assertive guidance
    R: high    # responsive + adaptive
    C: low     # no over-explaining
    H: always  # professional finish (ARCH — Acknowledge / Reflect / Context / Handoff)
```

**Policy:** Extend [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) with this archetype’s jurisdiction, tool allowlist, and refusal paths when governance blocks a request.

### 4.2 Responsibility

The agent:

- understands intent  
- gathers required information  
- presents a plan and **confirms** accuracy  
- orchestrates **governed** UI generation  
- **never** invents missing data silently  
- **never** bypasses the pipeline  

**Prompt assembly:** Playbook text lives in **compiler fragments** per [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) — not hardcoded in [`ConciergePanel`](../../client/src/components/chat/ConciergePanel.tsx) or other execution-plane UI.

---

## 5. Handoff contract

```yaml
design_handoff:
  handoffReason: user_requested_design
  intentSummary:
    raw: string
    classified_intent: string
    project_type: view | app
    confidence: number   # 0..1 inclusive
  referringAgentId: string
  siteConfigId: string
  designProjectId: optional
  entrySurface: voice | text
```

The primary agent **hands off** the owner to Design Studio **with this context** so Chad knows **why** the session started.

---

## 6. UI state model (Chat OS)

```yaml
chat_os_states:
  FLOATING:
    behavior: launcher

  PANEL:
    width: 480px

  WORKSPACE:
    width: 70-85%

  FULL:
    width: 100%
```

**Rules (product intent):**

- resize via **cycle** (no ad-hoc close-as-destroy of the contract)  
- **voice** may trigger **documented** transitions  
- width targets apply **within** the shell mode in use  

**Conformance (repo):** Global chat layout remains bound by [`.cursor/rules/sovereign-chat-lockdown.mdc`](../../.cursor/rules/sovereign-chat-lockdown.mdc) (floating → fixed → fullscreen, PTT present). If Design Studio requires **different** chrome rules, that is a **governance amendment** — document in [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) and update chat lockdown **explicitly**; until then, **do not** implement a “no close button” or alternate cycle that contradicts the signed chat contract.

---

## 7. View registry (Design Studio)

Authoritative prose lives here; machine-oriented rows may be mirrored in [`registry-yaml/views.yaml`](../../registry-yaml/views.yaml) when `lazyImportKey` and renderers exist.

### VIEW 1 — Landing

```yaml
view_id: design_studio_landing
actions:
  - learn_more
  - new_project
```

**Copy (voice / text):** Stored as **prompt / site template fragments**, not as the only source of truth inside React for production prompts.

### VIEW 2 — Learn

```yaml
view_id: design_studio_learn
content:
  - process_steps
```

### VIEW 3 — Project type

```yaml
view_id: design_studio_path
options:
  - build_view
  - build_app
```

(`build_view` = individual views track; `build_app` = multi-step app track — same **8-phase** engine, different `buildMode`.)

### VIEW 4 — Step engine

```yaml
view_id: design_studio_step
data:
  buildMode: view | app
  stepIndex: number
  stepKey: string
```

---

## 8. The 8-phase pipeline (enforced)

### Phase 1 — Intake

```yaml
output:
  project_type
  business_goal
  success_criteria
```

### Phase 2 — Plan

```yaml
output:
  plan_summary
  required_data
  recommended_layout
```

### Phase 3 — Theme

```yaml
output:
  theme_profile
  background_mode
```

### Phase 4 — Data input

```yaml
output:
  data_sources
  query_params
```

### Phase 5 — Data output

```yaml
output:
  write_actions
  validation_rules
```

### Phase 6 — Components

```yaml
output:
  selected_components
  layout_structure
```

### Phase 7 — Test + save

```yaml
output:
  test_results
  save_target
```

### Phase 8 — Agent layer

```yaml
output:
  knowledge_config
  behavior_config
```

State transitions **must** be **persisted** (see schema phase in implementation plan: metadata first, then optional `designProjects` anchor in [`SCHEMA_ANCHOR_REGISTRY.md`](./SCHEMA_ANCHOR_REGISTRY.md)).

**Persistence contract (v1):** `metadata.designStudio` includes `designStudioStateVersion: 1` (read this before interpreting nested fields). **Handoff law:** only `POST /api/site-configs/:id/design-studio/handoff` may create a new `projects[projectId]` entry; `PATCH .../design-studio` updates existing projects only. Structured handoff intent uses `intentSummary` with `confidence` in **[0, 1]**. Lifecycle `project_status` is separate from phase `stepKey`.

---



## 9. Shadcn MCP integration

### 9.1 Role

```yaml
shadcn_mcp:
  purpose:
    - component discovery
    - pattern enforcement
    - code generation assistance

  limitations:
    - cannot define product UI
    - cannot override governance
```

### 9.2 Promotion flow

```yaml
promotion_flow:
  - discover_component
  - review_against_governance
  - apply_theme_tokens
  - wrap_in_ui_core
  - register_in_manifest
```

---

## 10. SDK manifest (critical)

Machine-readable entries: [`registry-yaml/gateway-sdk-manifest.yaml`](../../registry-yaml/gateway-sdk-manifest.yaml).

```yaml
gateway_sdk_manifest:
  id: string
  type: primitive | widget | screen
  source: shadcn | internal
  themes_supported: []
  allowed_props: {}
  prohibited:
    - inline_style
    - raw_color
```

---

## 11. Intent → action system

```yaml
intent_action_registry:
  CHANGE_THEME:
    → update_tokens

  MODIFY_TABLE:
    → update_headers

  OPEN_ADMIN_MODE:
    → trigger_otp → switch_state

  ADD_COMPONENT:
    → open_registry → select → render
```

Each mapping **must** resolve to **`actionId`s** in [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) when wired to production (no orphan intents).

---

## 12. Event system (OS-level)

```yaml
os_event:
  action_id
  intent_id
  component_id
  state
  outcome
```

Use for **audit**, analytics, and **replay-safe** debugging — not as a bypass for registry actions.

---

## 13. Canvas rules

```yaml
canvas_rules:
  always_light: true
  overlays_allowed: true
  glass_effect: optional
  no_mixed_theme: true
```

**Alignment:** Concierge **canvas** zone uses `CANVAS.bg` per [`APP_SHELL_CONTRACT.md`](./APP_SHELL_CONTRACT.md) and [`.cursor/rules/brand-tokens.mdc`](../../.cursor/rules/brand-tokens.mdc). Design Studio **does not** introduce mixed shell/canvas tokens on the same surface.

---

## 14. Interaction model

**User may:** speak, click, request changes — canvas **updates** in response per governed tool/view actions.

**Agent must:** present options, surface decisions, **not** guess silently.

---

## 15. Deployment definition

**Ready to deploy** means:

```yaml
deployment_ready:
  - plan_approved
  - theme_validated
  - data_mapped
  - components_valid
  - agent_configured
  - test_passed
```

---

## Final truth

This system enforces:

- no UI drift  
- no agent improvisation on layout/theme  
- no inline CSS / raw color in governed outputs  
- no hallucinated **unregistered** components as production imports  

It enables:

- voice-driven UI creation  
- real-time canvas updates within registry + validation  
- governed reuse via **`@/ui-core`** and promoted manifest entries  
- fast customer feedback loops  

---

## Implementation checklist (engineering)

**Done (machine layer):** views registered in prose in [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md); actions in [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) + [`actions.yaml`](../../registry-yaml/actions.yaml); handoff type [`shared/designStudioHandoff.ts`](../../shared/designStudioHandoff.ts); context keys in [`CONTEXT_KEYS.md`](./CONTEXT_KEYS.md).

**Recommended order (behavior before shells):**

1. **Persistence stub** — minimal `designStudio` (or equivalent) JSON on `site_configs` for project id, `buildMode`, phase index/keys, plan version ref; validate on read/write.  
2. **Prompt fragments** — Chad playbook, 8-phase compiler fragments, VIEW1 voice + text entry; via [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md) / `promptCompiler` — not hardcoded in Concierge UI.  
3. **Handoff wiring** — primary agent passes [`DesignHandoffPayload`](../../shared/designStudioHandoff.ts); session creates or resumes project against persistence.  
4. **Minimal placeholder views** — React shells **bound** to persisted state + `design_studio.*` actions (avoid empty / fake flow).  
5. **Sync [`registry-yaml/views.yaml`](../../registry-yaml/views.yaml)** + `ViewRegistry` lazy keys **after** shells exist (prevents `NotFoundView`-only registration).  
6. **Policy implementation** — `design_studio.access` and `design_studio.publish` must map to **real** gates; named-only policies are **false security**.  
7. **CI — manifest / MCP** — validate [`gateway-sdk-manifest.yaml`](../../registry-yaml/gateway-sdk-manifest.yaml) soon after views land (drift risk).  
8. Shadcn MCP promotion path + automated checks when CI hook exists.  
