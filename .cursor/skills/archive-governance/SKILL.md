---
name: archive-governance
description: ARCHIVE_GOVERNANCE_AGENT — After reviewed triage, unmount dead surfaces, move code to quarantine with deprecation notes, update registry/docs, and verify no production imports into quarantine. Never combine unsupervised with triage in one shot.
---

# Archive governance (post-review graduation)

## When to use

- [`docs/governance/TECHNICAL_DEBT_TRIAGE_REPORT.md`](../../../docs/governance/TECHNICAL_DEBT_TRIAGE_REPORT.md) and [`docs/governance/artifacts/error_triage.yaml`](../../../docs/governance/artifacts/error_triage.yaml) exist and **humans have approved** specific rows for graduation (PR checklist, comment, or ticket).
- You are ready to **remove** code from the active surface without assuming “unused” without proof.

## When not to use

- **No prior triage** or no sign-off — do not invent classifications; run [technical-debt-triage](../technical-debt-triage/SKILL.md) first.
- **Same autonomous session as triage** — do not “scan → delete” or “classify → move” without a human gate between them.

## Operating principle

**We do not delete code — we graduate it out of the system.** Default path: unmount → quarantine → review → delete or permanent archive per policy.

## Preconditions

1. Approved list of files/modules to graduate (subset of triage YAML or linked checklist).
2. Voice / Twilio / execution-plane files are **out of scope** unless explicitly approved with recorded review (see prohibitions below).

## Workflow

### 1. Dependency and mount scan

For each approved target:

- `rg` (or equivalent) for **importers**: static `from '...'`, dynamic `import(`.
- Find **Express** mounts: `app.use`, router `use`, re-exports in `server/routes.ts`.
- Find **React** mounts: `<Route`, lazy `import('@/...')` in `App.tsx` or route modules.

**Rule:** Do not move a file until **no** active route or lazy entry points at it (or those entry points are part of the same approved removal).

### 2. Unmount first

- Remove or gate server mounts (prefer modular routers; follow [modular-routing.mdc](../../rules/modular-routing.mdc) — do not add **new** routes to `server/routes.ts`; adjusting mounts for deprecation may still touch `routes.ts` where legacy mounts live).
- Remove React routes and lazy imports.

### 3. Deprecation note

Add `DEPRECATION.md` **next to** the moved tree inside `quarantine/` (or one note per batch in `quarantine/<batch-id>/`) containing:

- **Reason** — Why graduated
- **Last known purpose**
- **Dependencies** — What it imported / what imported it (at time of move)
- **Route status** — Paths that were unmounted
- **Archive date** — ISO date
- **Owner** — Team or individual accountable for final disposal

### 4. Move to quarantine

- Move approved files/directories under repo-root [`quarantine/`](../../../quarantine/README.md).
- Prefer **no** re-export shims from `client/` or `server/` into quarantine.

### 5. Update references

- [`docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md`](../../../docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md) if logical routes changed
- READMEs or operational docs that linked the old paths

### 6. Verify build

- Run `npm run check` after changes.

### 7. Quarantine invariant (mandatory)

**Production trees** — `client/src/**` and `server/**` **excluding** `quarantine/**` — must contain **zero** imports (static or dynamic) that resolve into `quarantine/**`.

Verification checklist:

- Search for `quarantine/` in `client/src` and `server` import paths.
- Confirm no path alias points at `quarantine`.

**Recommended:** Modules inside `quarantine/**` should not import from live production code, so the folder can be deleted as a unit. If unavoidable, document in `DEPRECATION.md`.

## Prohibitions

- Do not modify **voice lockdown**, **Twilio/SMS lockdown**, or **execution-plane** hot paths unless the approved triage row explicitly includes them **and** review is recorded.
- Do not add new code to `_legacy_archive/` or import from it ([`.cursorrules`](../../../.cursorrules)).

## Related

- [technical-debt-triage](../technical-debt-triage/SKILL.md)
- [`docs/governance/TECHNICAL_DEBT_REDUCTION_PROCESS.md`](../../../docs/governance/TECHNICAL_DEBT_REDUCTION_PROCESS.md)

## Spawn prompt (copy for agents)

Act as **ARCHIVE_GOVERNANCE_AGENT**. Consume approved rows from `docs/governance/artifacts/error_triage.yaml`. Unmount routes, move agreed code to `quarantine/` with `DEPRECATION.md`, update LOGICAL_ROUTE_REGISTRY / docs as needed, run `npm run check`, and prove the quarantine invariant (no production imports into `quarantine/`). Do not touch voice or Twilio lockdown files unless explicitly approved.
