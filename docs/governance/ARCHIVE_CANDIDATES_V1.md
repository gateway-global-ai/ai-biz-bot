# Archive / quarantine candidates (v1)

**Status:** Populated from triage **2026-03-25** — `action: archive_candidate` rows only.

**Human review:** Required before [archive-governance](../../.cursor/skills/archive-governance/SKILL.md) moves any code.

## Candidates

| File | Errors | runtime_surface | Mounts (type + path) | Risk | Rationale | Approved (Y/N) |
|------|--------|-----------------|----------------------|------|-----------|----------------|
| client/src/pages/showcase/SdkShowcase.tsx | 3 | public | react `/sdk` — App.tsx | low | SDK embed showcase; chat state typing drift | |
| server/tools/grnHotelsHandler.ts | 2 | internal | none (tool import) | low | GRN B2B hotel experiment | |
| server/tools/cloudbedsSwarmTools.ts | 1 | internal | none | low | Vertical swarm R&D | |
| server/routes/bailRescueRoutes.ts | 1 | public | express via routes.ts | low | Bail/rescue demo; Stripe API version literal | |
| client/src/pages/showcase/TestB2b.tsx | 1 | public | react `/test-b2b` | low | B2B wireframe demo | |
| client/src/components/showcase/EventSearchPanel.tsx | 1 | internal | imported by showcase pages | low | Event search showcase | |

## Notes

- Rows here are **not** permission to delete — only to plan **unmount → quarantine** per process doc.
- Verify importers with `rg` before approving.
- **Do not** move anything to `_legacy_archive/` without governance review.

## References

- Full triage: [TECHNICAL_DEBT_TRIAGE_REPORT.md](./TECHNICAL_DEBT_TRIAGE_REPORT.md)
- YAML: [artifacts/error_triage.yaml](./artifacts/error_triage.yaml)
