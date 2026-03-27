# Industry Template Factory

Step-by-step reference for adding new **industry vertical funnel templates** to the Gateway Global AI OS. Canonical code reference: `shared/industryFunnelTemplates/nailSalonV1.ts`.

---

## 1. Template architecture

- Templates define **phased conversation workflows** for industry-specific sales funnels.
- Each template is a **TypeScript module** exporting a `ConversationWorkflow` and a **funnel entry** object (name, terminal action, entry points, `conversationWorkflow`, etc.).
- Shapes are validated with **Zod** schemas in `shared/conversationWorkflow.ts` (`conversationWorkflowSchema`, `salesFunnelEntrySchema`, helpers such as `resolveCurrentPhase`, `formatPhasePromptFragment`).
- Templates are **registered** in `registry-yaml/industry-funnel-templates.yaml` (governed manifest; see `docs-governance/PHASED_INDUSTRY_FUNNEL_SPEC.md`).
- Operators apply a template to a site with **`POST /api/site-configs/:id/funnels/apply-template`** (body includes `templateId` matching the YAML `id`).

---

## 2. Step-by-step creation process

### Step 1: Define the vertical

- Choose an **industry vertical** identifier (stable string), e.g. `nail_salon`, `restaurant`, `dental`, `real_estate`, `saas_platform`.
- Map the **customer journey**: what counts as success (demo booked, activation, lead captured, etc.)?
- Pick the **terminal action** for the funnel entry: `book` | `buy` | `signup` | `support` | `lead` (see `salesFunnelEntrySchema`).

### Step 2: Design phases

For each phase, specify:

| Field | Purpose |
|--------|--------|
| `id` | Stable machine id (e.g. `capture_snapshot`, `demo_value`, `activation_and_offer`). |
| `label` | Human-readable phase name. |
| `goal` | What this phase must achieve before progression. |
| `allowedIntent` | `visitor` \| `owner` \| `both` — who the copy targets. |
| `requiredContextKeys` | Keys that must be **present** (non-empty string in context) for the phase to be considered satisfied for `resolveCurrentPhase`. |
| `outputContract` | `must[]`, `mustNot[]`, optional `maxSentences` — voice-oriented brevity and guardrails. |
| `boldClaimHint` | Optional one-line angle for a strong opening (capture phases). |
| `disclosureTierHint` | `minimal` \| `standard` \| `full` — depth of product/legal disclosure. |

### Step 3: Define transitions

- Each transition: `fromPhaseId` → `toPhaseId` with `when.contextKeysPresent[]` (keys that must be present to allow that edge).
- Runtime **active phase** comes from `resolveCurrentPhase(workflow, contextKeys)`: walk phases **in order**; return the **first** phase that still has **any** missing `requiredContextKeys` (with non-empty values). Phases whose `requiredContextKeys` is **empty** are **skipped**; use an explicit sentinel key in early phases if you need a non-skippable first phase (see comment in `shared/conversationWorkflow.ts`).

### Step 4: Reference knowledge (do not paste prompts)

- Set `industryKnowledgeRef` on the workflow: `{ source: 'knowledge_doc_id' \| 'artifact_key' \| 'slug', value, title? }`.
- This **points at** the knowledge library (doc id, artifact key, or slug), not inline prompt prose. Keeps templates reviewable and certifiable.

### Step 5: Create the TypeScript file

Place the module under `shared/industryFunnelTemplates/<vertical>V1.ts` (or your versioned name). Pattern (mirror `nailSalonV1.ts`):

```typescript
import type { ConversationWorkflow } from "../conversationWorkflow";

export const VERTICAL_WORKFLOW_V1: ConversationWorkflow = {
  version: 1,
  industryVertical: "vertical_name",
  industryKnowledgeRef: {
    source: "slug",
    value: "vertical_research",
    title: "Vertical research (summary)",
  },
  phases: [
    /* phase objects */
  ],
  transitions: [
    /* { fromPhaseId, toPhaseId, when: { contextKeysPresent: [...] } } */
  ],
};

export const VERTICAL_FUNNEL_V1_ENTRY = {
  id: "00000000-0000-4000-8000-0000000000XX", // stable UUID per template
  name: "Vertical Name — AI Front Desk v1",
  terminalAction: "lead" as const,
  entryPoints: ["homepage_widget", "qr_code"],
  conversionObjective: "One sentence: what success looks like.",
  fallbackRoutes: {
    website: "https://example.com",
    booking: "",
    ordering: "",
    support: "",
  },
  conversationWorkflow: VERTICAL_WORKFLOW_V1,
};
```

Use a **unique** funnel `id` UUID per template; the nail salon reference uses `00000000-0000-4000-8000-000000000001`.

### Step 6: Register in YAML

Append an entry under `templates:` in `registry-yaml/industry-funnel-templates.yaml`:

```yaml
templates:
  - id: vertical_v1
    name: "Vertical — AI Front Desk v1"
    source: shared/industryFunnelTemplates/verticalV1.ts
    industryVertical: vertical_name
    description: "Phased funnel — capture, demo value, activation/offer."
```

`templateId` in the apply-template API must match `id` here. `source` is the path to the module the loader resolves (same pattern as `nail_salon_v1`).

### Step 7: Export from index

Add re-exports in `shared/industryFunnelTemplates/index.ts`:

```typescript
export { VERTICAL_FUNNEL_V1_ENTRY, VERTICAL_WORKFLOW_V1 } from "./verticalV1";
```

### Step 8: Create aptitude tests

Add `tests/<vertical>-aptitude-scenarios.ts` (or extend an existing suite) to exercise:

- **PPP shadow** scoring (`analyzePppShadow` in `server/services/pppShadowValidator`) for representative phase copy under the intended governance profile (e.g. `parseCommunicationGovernance` from `shared/conversationGrounding`).
- **ARCH envelope** checks (`validateArchEnvelope`, `hasHandoffCue` in `server/services/archEnvelopeValidator`) for handoff-heavy profiles.

Reference style: `tests/voice-concierge-aptitude-scenarios.ts`. Wire the script in `package.json` if you add a dedicated runner.

---

## 3. Phase design guidelines

Default three-phase arc (adjust labels/keys per vertical):

1. **Capture (phase 1)** — Bold claim + minimum context (e.g. business name, location). `maxSentences`: ~8. `disclosureTierHint`: `minimal`.
2. **Demonstrate (phase 2)** — Use **their** business name in examples; 2–3 realistic customer scenarios. `maxSentences`: ~10. `disclosureTierHint`: `standard`.
3. **Activate (phase 3)** — Summarize channels (voice / chat / web), then paid path **tied to outcomes**. `maxSentences`: ~14. `disclosureTierHint`: `full`.

Align `requiredContextKeys` and transitions so progression matches when the buyer has actually supplied data (e.g. `demo_ready`, `pricing_acknowledged`).

---

## 4. Context keys best practices

- Keys are **not** invented by the LLM; **client, session, or tooling** supplies them into funnel context.
- Prefer explicit names: `owner_business_name`, `owner_city`, `demo_ready`, `pricing_acknowledged`.
- Remember: phases with **empty** `requiredContextKeys` are **skipped** by `resolveCurrentPhase`; design keys and phase order deliberately.

---

## 5. View pairing per phase

Each phase should have a **shell/canvas pairing** so voice and UI stay aligned (see view registry and intent-first canvas skill where applicable):

| Phase type | Suggested canvas pairing |
|------------|---------------------------|
| Capture | Welcome + **intent-first idle** — e.g. `OSMenuList` actionable items. |
| Demo | **`SharedCanvasPanel`** (or equivalent) with sample customer interactions / scenarios. |
| Activation | **Pricing** view + **channel summary** view. |

Declare or extend views through `docs-governance/VIEW_REGISTRY.md` and related contracts when introducing new view ids; do not hide side effects inside ad hoc UI.

---

## Related artifacts

- `docs-governance/PHASED_INDUSTRY_FUNNEL_SPEC.md`
- `shared/conversationWorkflow.ts`
- `shared/industryFunnelTemplates/nailSalonV1.ts`
- `registry-yaml/industry-funnel-templates.yaml`
