# Phase 4 — Spatial foundation & governed map skills

## Strategic priority (locked)

**Fix Maps Types first (Phase 4A).** It is **enablement**, not cosmetic debt: `MapDisplay.tsx`, Places/Advanced Marker, and Street View typings must be stable before shipping **Multi-Scalar Navigation**, **Internal Mode**, and **Olympic-style itinerary** overlays. Without a clean `google.maps` surface, animation and state-machine work risks null crashes and unreviewable property access.

**Health Alerts** remain **maintenance**; defer until spatial creation milestones are unblocked—unless ops explicitly needs paging first.

---

## Phase breakdown

| Phase | Name | Focus |
|-------|------|--------|
| **4A** | Maps type hardening | `google.maps` namespace, `AdvancedMarkerElement`, `Map3DElement` / custom map elements, `MapDisplay` + Places autocomplete — align `@types/google.maps` with loaded libraries; local `d.ts` augmentation where the spec trails runtime (e.g. newer Places). |
| **4B** | Internal Mode skill (boundary-locked search) | **SKILL.md** + tool contract: `LatLngBounds` / anchor `place_id` “node”; executor rejects or sanitizes out-of-bounds results; agent prompts scoped to amusement parks / large events / venues. |
| **4C** | Epic transitions (macro → micro) | **State machine**: air arc (departure ↔ arrival), satellite → street “zoom-dive” (tilt/heading), **Street View** handoff, optional **indoor** maps when `place_id` supports floor levels. |

---

## Product vision — “Spatial Navigator” (not chat-only)

### Custom Google Maps

Document and preserve any **custom styling / Map IDs / Cloud-based map styles** in deployment config (e.g. Doppler) and reference them from a single map bootstrap module so agents and skills don’t duplicate map IDs.

### Multi-scalar navigation (macro → micro)

1. **Air segment:** Animate an arc between **departure and arrival** GPS (great-circle or simplified path); treat as **visualization** layer, not navigation routing.
2. **Satellite → Street:** Controlled transition using `Map` tilt, zoom, heading, then **StreetViewPanorama** or equivalent; **state machine** owns camera ownership (map vs panorama) to avoid `null` map panes.
3. **Street → Indoor:** When Google **Indoor Maps** / floor data exists for `place_id`, transition to floor level (Level 0 / 1) — gated by API availability.

### Olympic itinerary (temporal UI)

- **Data:** Waypoints + **timestamps** (day route).
- **UI:** Persistent overlay with **Next / Back** driving map focus + optional `DirectionsRenderer` polyline for “today’s route.”
- **Reuse:** Align with existing **Olympic** / B2B itinerary code paths; extract a **TemporalSkill** contract (view + actions) so travel agents and personal assistants can enable it.

### Internal Mode (hyper-focus)

- **Constraint:** Search tools receive **fixed bounds** or **venue `place_id`**; no unrestricted global search.
- **Governance:** Tool layer **refuses** or **filters** out-of-bounds POIs; standardized refusal message: e.g. *“That is outside the current event boundary. Choose an activity inside the park.”*
- **Use cases:** Amusement parks, stadiums, conferences, large campuses.

---

## Skill registry (governance — formalized in `docs-governance/SKILLS_GOVERNANCE.md`)

Spatial execution skills are specified in [`docs-governance/SKILLS_GOVERNANCE.md`](../../docs-governance/SKILLS_GOVERNANCE.md). Mirror into [`SKILL_REGISTRY.md`](../../docs-governance/SKILL_REGISTRY.md) + YAML when productized as `siteConfigs.config.skills` entries.

| Working name | Category | Governance / boundary | Technical anchor |
|--------------|----------|------------------------|------------------|
| **SpatialTransitionSkill** (or NavigationSkill) | Execution / UI | Camera transitions only; no PII in logs | Maps JS + Street View + optional WebGL/animation layer |
| **BoundarySkill** (Internal Mode) | Tool policy | `LatLngBounds` / node `place_id` enforced in tool executor | Places Nearby / Search with `locationRestriction` |
| **TemporalSkill** (Itinerary playback) | View + action | `next` / `back` map to allowed actions; time order validated | React overlay + `DirectionsRenderer` + itinerary state |

Agents (travel, concierge, PA) **opt in** via policy + skill allowlist—not global default.

---

## Technical prerequisites (4A checklist)

- [x] Resolve `MapDisplay.tsx` `Library[]` / loader union (`@googlemaps/js-api-loader` `Library` type).
- [x] `PlaceAutocompleteElement` / Places (New) typings — `PlacesLibrary` augmentation + `new PlaceAutocompleteElement({})` at call sites.
- [ ] Null-safe map instance lifecycle (mount/unmount, Street View container) — ongoing hardening.
- [ ] Document **Map ID** / custom map usage for parity with **custom Google maps** in prod.

**4B:** Internal Mode + skill locking — follow [`docs-governance/SKILLS_GOVERNANCE.md`](../../docs-governance/SKILLS_GOVERNANCE.md) before adding tool IDs to YAML.

---

## Execution phrases

- **“Fix Maps Types”** or **“Execute Phase 4A”** — type hardening + minimal runtime guards.
- **“Implement Internal Mode skill”** — Phase 4B after 4A.
- **“Implement Epic map transitions”** — Phase 4C after 4A (and ideally after Street View types are stable).

---

## Relation to existing rules

- **API lockdown:** Maps keys remain referrer-restricted client-side; **Grounding** server-side unchanged.
- **Prompt / tool governance:** New skills must flow through **prompt compiler / tool allowlists** — no raw prompt strings in map components.
- **Execution plane:** Map state machines live in **views** + typed actions; heavy business logic stays out of voice hot path.

---

## Closure

Phase 3 (voice) is **closed**. Phase 4 is **spatial + maps + skills**—this file is the single planning anchor until 4A is executed.
