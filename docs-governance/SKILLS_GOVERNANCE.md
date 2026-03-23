# Skills Governance — Spatial & Execution-Plane Skills

## Purpose

This document defines **governed execution skills** for the spatial layer: named contracts that constrain **what tools the model may invoke**, **which state machines own the map**, and **how refusals are phrased** when the AI would otherwise improvise.

It complements [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md):

| Document | Scope |
|----------|--------|
| **`SKILL_REGISTRY.md`** | Business-facing **capability packs** in `siteConfigs.config.skills` (Bot Builder, menu cards, `siteCapabilities`). |
| **`SKILLS_GOVERNANCE.md` (this file)** | **Execution-plane** skills: map transitions, boundary-locked search, itinerary playback — tool allowlists, state ownership, and policy text. |

Spatial execution skills are **not** silently global. They are activated by **policy + skill allowlist** (see [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md)) and, when productized, may mirror entries under `siteConfigs.config.skills` with explicit preflight.

---

## Global rules

1. **No raw spatial instructions in UI** — Map components do not embed system prompts; behavior is driven by compiled prompts + tool contracts ([`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)).
2. **Execution plane stays thin** — Tool handlers may validate bounds and dispatch typed actions; they do not run heavy domain workflows ([`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)).
3. **One camera owner** — At any instant, either the **2D Map**, **Street View panorama**, or a **transition orchestrator** owns camera updates; skills must not fight (see `SpatialTransitionSkill` FSM).
4. **Refusal over hallucination** — If a request violates bounds or phase, return the **standard refusal** for that skill; do not invent POIs or routes.

---

## Skill: `SpatialTransitionSkill`

**Working name:** Director’s Chair (camera choreography)  
**Skill ID:** `spatial_transition` (stable; use in policy YAML and tool registries)

### Intent

Encode **macro → micro** presentation: great-circle or arc **flyTo** between endpoints, **zoom-dive** (satellite tilt/heading toward Street View), and optional **Street View** / indoor handoff — as a **finite state machine**, not ad hoc `setZoom` calls from the model.

### Governed states (normative)

| State | Owner | Allowed transitions |
|-------|--------|----------------------|
| `idle` | — | → `air_arc`, `map_orbit`, `zoom_dive`, `street_view` |
| `air_arc` | Transition orchestrator | → `map_orbit` \| `idle` (complete \| abort) |
| `map_orbit` | Map (`google.maps.Map`) | → `zoom_dive` \| `idle` |
| `zoom_dive` | Orchestrator + Map | → `street_view` \| `map_orbit` \| `idle` |
| `street_view` | `StreetViewPanorama` | → `map_orbit` \| `idle` |

**Forbidden:** Calling `moveCamera` / `setPosition` from two owners without transitioning state; entering `street_view` without a valid panorama or explicit user consent where required.

### Tool surface (conceptual)

- `spatial.flyTo` — Animates between two `LatLng` / place anchors; **visualization**, not turn-by-turn routing.
- `spatial.zoomDive` — Controlled tilt, zoom, heading toward a target; hands off only when FSM enters `zoom_dive` → `street_view`.
- `spatial.openStreetView` — Binds panorama and transfers ownership from Map.

Implementations must expose **typed parameters** (coordinates, optional `place_id`, duration budgets); **no PII** in analytics logs.

### Refusal (standard)

- *“Camera is finishing the previous transition; I’ll continue in a moment.”* (busy / re-entrant)  
- *“Street View isn’t available for this location.”* (no panorama)

### Technical anchors

- Maps JS `Map`, `StreetViewPanorama`, heading/tilt — types aligned with `@types/google.maps`, `@vis.gl/react-google-maps` ([Phase 4 plan](../.cursor/plans/phase_4_spatial_maps_skills.plan.md)).
- Rotation helpers must use `google.maps.Map`, not the global `Map<K,V>` type ([`client/src/components/voice/maps/dwellRotation.ts`](../../client/src/components/voice/maps/dwellRotation.ts)).

---

## Skill: `BoundaryLockSkill`

**Working name:** Internal Mode / Hyper-Focus  
**Skill ID:** `boundary_lock`

### Intent

Restrict **all place search and POI surfacing** to a **fixed geographic boundary** or **venue anchor** (`place_id` / `LatLngBounds`) so the agent cannot “search the world” during an event or campus experience.

### Governance boundary

- **Input:** `locationRestriction` / `LatLngBounds` and/or dominant **venue `place_id`** (schema anchor: `siteConfigs` + session context keys — see [`CONTEXT_KEYS.md`](./CONTEXT_KEYS.md)).
- **Executor:** Nearby Search / Text Search / Autocomplete **must** pass `locationRestriction` or equivalent; results **outside** bounds are **dropped** or never requested.
- **Model:** Tool declarations only include boundary-scoped tools while this skill is active.

### Refusal (standard)

- *“That’s outside the current event boundary. Choose something inside the venue.”*

Variants may be compiled from brand tone; **meaning** must not soften the lock.

### Technical anchors

- Places (New): `locationRestriction`, `locationBias` — server or client per API lockdown ([`.cursor/rules/api-lockdown.mdc`](../.cursor/rules/api-lockdown.mdc)).
- Policy: [`AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md) — jurisdiction and allowed entities.

---

## Skill: `TemporalItinerarySkill`

**Working name:** Olympic Mode (time-ordered itinerary playback)  
**Skill ID:** `temporal_itinerary`

### Intent

Drive **day-based routes** with **Next / Back** (and optional “jump to stop”) so the map **follows** the itinerary timeline without the model inventing new stops.

### State (normative)

- **Index** into ordered stops (`0..n-1`); optional **day** key for multi-day payloads.
- **Invalid** transitions (e.g. Next past last) return **refusal** or no-op with explanation — not a new POI.

### Actions (view / action registry)

- `itinerary.next` — Advance index; fly map to stop; update overlay.
- `itinerary.back` — Decrement index; same.
- `itinerary.selectStop` — Jump if index valid (policy-gated).

Must be declared in [`ACTION_REGISTRY.md`](./ACTION_REGISTRY.md) / [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) when wired to UI.

### Technical anchors

- Shared itinerary types (e.g. Olympic `DayItinerary`, POIs) — [`client/src/types/olympic`](../../client/src/types/olympic) (or successor module).
- Map: `DirectionsRenderer` / polylines optional; **temporal index** is source of truth, not free-text.

### Refusal (standard)

- *“There’s no next stop on today’s plan.”* / *“You’re already at the first stop.”*

---

## Registration & review

- **New spatial skill:** Add a subsection here **before** tool IDs ship in YAML; run [`GOVERNANCE_REVIEW_ENGINE.md`](./GOVERNANCE_REVIEW_ENGINE.md) for policy/route/view changes.
- **Productization:** If a spatial skill gets a Bot Builder toggle, add a row to [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md) and extend `siteConfigs.config.skills` with the same `skillId`.

---

## References

- [Phase 4 — Spatial foundation & governed map skills](../.cursor/plans/phase_4_spatial_maps_skills.plan.md)
- [`SKILL_REGISTRY.md`](./SKILL_REGISTRY.md)
- [`PROMPT_RUNTIME_GOVERNANCE.md`](./PROMPT_RUNTIME_GOVERNANCE.md)
- [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](./EXECUTION_PLANE_BOUNDARY_SPEC.md)
