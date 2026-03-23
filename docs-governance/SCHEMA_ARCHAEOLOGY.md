# Schema Archaeology

## Purpose
Preserve institutional memory about historical schema and architecture artifacts without allowing legacy materials to become runtime truth.

## Governance rule
Legacy artifacts are:
- preserved for reference
- not sources of truth
- not used directly by runtime, code generation, or prompt generation
- only mined through clean-room reconciliation into governed docs or registries

## Clean-room reconciliation process
1. Identify a legacy artifact candidate.
2. Record the artifact path and review date.
3. Extract concepts conceptually, not by copying implementation text.
4. Compare concepts against:
   - `SCHEMA_ANCHOR_REGISTRY.md`
   - `DOMAIN_CONCEPT_REGISTRY.md`
   - `registry-yaml/`
5. Mark each concept as:
   - already represented
   - candidate for extraction
   - obsolete
6. For accepted concepts, create fresh governed definitions in current docs/registries.

## Archaeology log

### Artifact
- Path: `_legacy_archive/user_uploads/AIOS/platform_schema.md`
- Status: historical reference only
- Source system: AIOS prototype

### Review stance
- Do not use as an implementation source
- Do not import into runtime or build pipeline
- Use only as a future candidate for clean-room schema reconciliation

### Future comparison table template
| Legacy Concept | Current Entity/Registry | Status | Notes |
|---|---|---|---|
| `<legacy concept>` | `<current governed concept>` | `represented / candidate / obsolete` | `<notes>` |
