# INTENT_NEXT_STEP_PACKET_SPEC_V1

> The IntentNextStepPacket is an intent orchestrator skill response. It reflects real data and real capabilities back to the LLM so it can guide the user with programmatic grounding paths instead of hallucinated prose.

## Status

| Field | Value |
|---|---|
| Version | V1 |
| Status | Active |
| Owner | Platform Architecture |
| Enforced by | `shared/canvasViewContract.ts` (types), `server/services/intentNextStepDeriver.ts` (deriver) |

---

## 1. Core Principle

> **The packet reflects reality. It does not prescribe UI or preset thresholds.**

- Always report the actual `resultCount` -- "I found 80 hotels"
- Filters come from the data source (API parameters, DB columns), not hardcoded UI specs
- Sort/reduction actions map to executable query operations, not decorative labels
- View options reflect real canvas views the system can render
- The LLM reads the packet and guides; the canvas state manager renders; neither improvises

## 2. Architecture

The IntentNextStepPacket sits between `CanvasResolveResult` and `CanvasRenderPayload`:

```
utterance
  -> intent resolution (canvas.resolve on server)
  -> data query executes (API call / DB query)
  -> IntentNextStepPacket derived FROM QUERY RESULTS
  -> canvas state manager receives packet, renders appropriate surface
  -> LLM speaks grounded prompt from packet (result count + reduction offers)
  -> user narrows -> re-query -> new packet -> loop until grounded
```

### Separation of Concerns

| Responsibility | Owner |
|---|---|
| Interpret intent | LLM |
| Reflect data capabilities | IntentNextStepDeriver |
| Choose next interaction strategy | LLM (reading the packet) |
| Speak grounded guidance | LLM (using `promptToUser`) |
| Render canvas surface | Canvas state manager |
| Re-query with modified params | Server (using `queryContext`) |

## 3. Design Rules

### 3.1 Result count is always reported

The packet carries `resultCount` from the actual query. The agent always tells the user the real number. There is no hardcoded max-results cutoff.

### 3.2 Filters are derived from data source capabilities

Every `IntentNextStepFilter` maps to a real parameter:
- `source: 'api_param'` -- maps to an external API parameter (e.g., SerpApi `min_rating`)
- `source: 'db_column'` -- maps to a database column (e.g., `agents.status`)
- `source: 'derived'` -- computed from result data (e.g., price quartiles)

No filter exists in the packet that the system cannot execute.

### 3.3 Reductions are programmatic

Each `IntentNextStepReduction` maps to a `sortKey` + `order` + optional `suggestedLimit` that the server can execute as a real query modifier:
- "Pick lowest price" = `{ sortKey: 'price', order: 'asc', suggestedLimit: 5 }`
- "Best rated" = `{ sortKey: 'rating', order: 'desc', suggestedLimit: 5 }`

The agent offers these as executable actions, not suggestions.

### 3.4 View options reflect rendering capabilities

When multiple canvas views can display the results, `viewOptions` lists them. Each entry carries a `viewId` that maps to a real registered `CanvasViewId`. If only one view exists, the agent opens it directly. If multiple exist, the agent asks.

### 3.5 promptToUser is data-grounded

The deriver assembles `promptToUser` from real numbers and real capability labels. The LLM may paraphrase or extend, but the grounding data is factual.

## 4. Action Modes

| ActionMode | When | Agent behavior |
|---|---|---|
| `direct_execute` | Unambiguous intent, result ready | Execute and render immediately |
| `open_canvas` | Clear view, reasonable result set | Open canvas surface, present results |
| `need_grounding` | Results exist, filters available | Report count, offer filters/reductions, ask narrowing question |
| `need_auth` | Security gate blocks the query | Redirect to identity verification |
| `need_confirmation` | Destructive or significant action | Show confirmation before executing |

## 5. The Re-Query Loop

```
user narrows ("4 stars, under $200")
  -> server re-queries with modified params from queryContext
  -> new packet: { resultCount: 23, resultSummary: "23 hotels, 4+ stars, under $200/night" }
  -> agent: "That narrowed it to 23. Want me to sort by best rated, or pick the 5 closest?"

user: "Best rated, top 5"
  -> server executes reduction: sort_by=rating_desc, limit=5
  -> new packet: { resultCount: 5, viewOptions: [list, map, compare] }
  -> agent: "Here are the top 5. Would you like a list, map, or comparison table?"

user: "Show me on a map"
  -> canvas renders with selected viewId
```

Every step is programmatic. Every number is real. Every option is executable.

## 6. Prohibited Patterns

1. **Hardcoded result thresholds** -- no "if > 12 then categories" logic. The packet carries the real count; the LLM decides.
2. **Preset UI categories** -- filters and categories come from the data source, not from a static list.
3. **Improvised speech** -- the LLM must use `promptToUser` or data from the packet. No inventing filter options that don't exist.
4. **Hidden result counts** -- always report the actual number found. Transparency is non-negotiable.
5. **Non-executable reductions** -- every reduction in the packet must map to a real query the server can run.

## 7. Integration Points

- **`shared/canvasViewContract.ts`** -- type definitions (`IntentNextStepPacket`, `IntentActionMode`, filters, reductions, view options)
- **`server/services/intentNextStepDeriver.ts`** -- `deriveNextStepPacket()` builds the packet from real query results
- **`server/routes/canvasControlRoutes.ts`** -- `canvas.resolve` response includes `nextStep` field
- **`client/src/services/voiceTurnOrchestrator.ts`** -- reads `nextStep`, uses `promptToUser` for speech grounding, renders based on `actionMode`
- **`CanvasResolveResult`** -- the packet extends (not replaces) the existing resolve result
- **`SpeechGroundingContext`** -- `promptToUser` feeds into `speakingInstructions`

## 8. Related Documents

- `docs-governance/canonical/GOVERNED_GENERATIVE_UI_SPEC.md` -- canvas composition formula
- `docs-governance/canonical/INTENT_LOOP_GOVERNANCE_V1.md` -- intent-as-loop state vector
- `shared/intentLoopContract.ts` -- IntentLoopResolution
- `shared/canvasViewContract.ts` -- CanvasSyscallEnvelope, CanvasResolveResult
