# Quarantine (non-runtime holding area)

**Purpose:** Staging for code **graduated** off the active product surface after [technical debt triage](../docs/governance/TECHNICAL_DEBT_REDUCTION_PROCESS.md) and **human approval**. Not a second app root.

## Rules

1. **Unmount first** — Remove Express and React routes before (or as part of) moving modules here.
2. **No production imports in** — `client/src/**` and `server/**` (excluding `quarantine/**`) must have **zero** static or dynamic imports that resolve into `quarantine/**`.
3. **Prefer no imports out** — Quarantined code should not depend on live production modules so this folder can be deleted as a unit; document exceptions in `DEPRECATION.md`.
4. **Do not use for new features** — No new product code belongs here.
5. **`_legacy_archive/`** — Read-only per [`.cursorrules`](../.cursorrules); do not move new legacy there without a separate governance decision.

## Contents

Each batch should include a `DEPRECATION.md` with: reason, last known purpose, dependencies, route status, archive date, owner.

_(Empty until first approved graduation.)_
