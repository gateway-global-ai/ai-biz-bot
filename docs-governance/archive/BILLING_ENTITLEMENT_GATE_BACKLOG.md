# Billing / entitlement gate — backlog

## Purpose

Record the **future** split between:

- **Transparency / passage logging** — [`verification_gate_passage_events`](../shared/schema.ts), [`VERIFICATION_GATE_TRANSPARENCY.md`](VERIFICATION_GATE_TRANSPARENCY.md) — audit, abuse resistance, statistics.
- **Commercial entitlement** — Stripe subscription status, optional metered usage, prepaid minutes — **not** inferred solely from passage-event counts.

## Principles

- **HTTP-first:** Any **402 Payment Required** + Checkout / Customer Portal response belongs on **control-plane** routes before heavy LLM spend (new modular routers under `server/routes/`).
- **Execution plane:** No synchronous Stripe or entitlement DB on the voice/audio hot path — see [`EXECUTION_PLANE_BOUNDARY_SPEC.md`](EXECUTION_PLANE_BOUNDARY_SPEC.md).
- **Schema:** When built, prefer a dedicated **`billing_entitlements`** (or similar) anchor — see [`SCHEMA_ANCHOR_REGISTRY.md`](SCHEMA_ANCHOR_REGISTRY.md) — rather than overloading passage events as a billing ledger.

## Related

- Identity and verification (not billing): [`NOVA_VERIFICATION_GOVERNANCE.md`](NOVA_VERIFICATION_GOVERNANCE.md)
- Guest / tool gates today: [`AGENT_POLICY_REGISTRY.md`](AGENT_POLICY_REGISTRY.md)

This document is **backlog only** until product defines SKUs, routes, and enforcement scope.
