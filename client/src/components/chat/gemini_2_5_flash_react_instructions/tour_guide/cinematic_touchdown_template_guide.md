# Cinematic Touchdown Template Guide

This guide defines how to create and author **Cinematic Touchdown** tour specs for Clear Voice partners (e.g. Boardwalk Suites Lafayette). Use it when generating or editing YAML tour files and when describing the narrative & visual experience.

---

## Template Structure: Three Segments

A standard Cinematic Touchdown has **three segments** that align with the TourRunner and cinematic touchdown behavior:

| Segment | Name (suggested) | Zoom | Purpose | Narrative trigger |
|--------|-------------------|------|---------|-------------------|
| **1** | The Descent / The Approach | 12 | Pan over area; set context (city, district, nearby landmarks) | Optional intro line |
| **2** | Touchdown | 15 → 18 | Camera descends to property; **speech triggers at zoom 15** | **Yes** – "We've arrived..." / brand pitch |
| **3** | The Dwell | 18 | 360° rotation; property details, ownership, transformation | Yes – "Notice the... Under new ownership..." |

---

## YAML Spec Format

Tours are defined in YAML and consumed by `TourRunner` (see `tour_runner.md`). Required fields per segment:

```yaml
tour_id: "unique_tour_id"
business_name: "Property Name"
segments:
  - name: "Segment display name"
    coords: { lat: <number>, lng: <number> }
    zoom: <number>        # 12 for descent, 15–18 for touchdown/dwell
    narrative: "Exact line the AI will speak when the narrative triggers."
    dwell_time: <seconds> # How long to stay (e.g. 3, 10, 5)
```

- **Segment 1 (Descent):** `zoom: 12`, short `dwell_time` (e.g. 3). Narrative: welcome to city/region, descent into district, nearby landmarks.
- **Segment 2 (Touchdown):** `zoom: 18` (camera animates from current to 18; **speech fires at zoom 15**). Narrative: "We've arrived. At [Property], you're not just getting a room; you're getting [value prop]."
- **Segment 3 (Dwell):** `zoom: 18`, longer `dwell_time` (e.g. 10) for 360° rotation. Narrative: architecture, lighting, new ownership, amenities (parking, outdoor spaces).

---

## Narrative & Visual Cheat Sheet

When writing the template document (for humans or for AI):

1. **Segment 1 – The Descent (Zoom 12)**  
   - **Narration:** Welcome to [City], heart of [Region]. We're descending into [District], a hub for [audience].  
   - **Visual:** Map pans over skyline; mention proximity to [Landmark A], [Landmark B].

2. **Segment 2 – Touchdown (Zoom 15 → Narrative Trigger)**  
   - **Narration:** "We've arrived. At [Property], you're not just getting a room; you're getting [specific differentiator]."  
   - **Visual:** Camera snaps to sharp angle (e.g. 45°), centering on main entrance / street.

3. **Segment 3 – The Dwell (Zoom 18 – 360° Rotation)**  
   - **Narration:** "Notice the [architecture/lighting]. Under new ownership, this [property] has been transformed into [positioning]. [Parking / outdoor / amenities]."  
   - **Visual:** Slow cinematic orbit; showcase parking, outdoor spaces, key features.

---

## Integration Points

- **Narrative trigger:** Implemented in `cinematicTouchdown.ts`: when `zoom > 15` during descent, `onTriggerSpeech(aiHook)` is called (see `cinematic_touchdown.md`).
- **Dwell rotation:** `dwellRotation.ts` runs a 360° orbit for `dwell_time` seconds after touchdown.
- **TourRunner:** Loads YAML from `yamlUrl` or `tourSpec`; runs segments in order; passes each segment’s `narrative` as `aiHook` into the touchdown utility.

---

## Example: Boardwalk Suites Lafayette

See `client/public/boardwalk_suites_tour.yaml` for a full example matching this template (Descent → Touchdown → Dwell with the narrations above).

---

## Admin / Brand Soul

After the tour, the **Brand Soul** and **Admin Portal** can reference:

- **AI Tags Applied:** e.g. Extended Stay Expert, Contemporary Design, Medical District Anchor.
- **Review Sentiment:** e.g. "Property Transformed," owner "goes above and beyond."
- **Website highlights:** Modern shift (lighting, interiors), community (lounges, karaoke hall), utility (shared kitchen, outdoor BBQ).

These can be driven by `reviewAnalysisService` and `owner_business_data` and displayed in the DashboardCard / partner admin.
