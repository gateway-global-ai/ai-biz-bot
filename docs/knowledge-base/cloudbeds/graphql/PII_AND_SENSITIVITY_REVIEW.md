# Cloudbeds GraphQL — PII & sensitivity classification

**Status:** Pending **`vendor-introspection.json`** ([`SCHEMA_INGEST.md`](./SCHEMA_INGEST.md)). This document is the **field-level** checklist; fill from real type/field introspection (extend script to request fields when ready).

## 1. Guest identity

| Field / pattern | Classification | Notes |
|-----------------|----------------|-------|
| _TBD_ | identity / PII | Government ID, full name combos, etc. |

## 2. Contact data

| Field / pattern | Classification | Notes |
|-----------------|----------------|-------|
| phone, email, address | PII — high | OTP / journey tools already treat phone carefully on REST. |

## 3. Reservation-linked personal data

| Field / pattern | Classification | Notes |
|-----------------|----------------|-------|
| _TBD_ | | Special requests, notes. |

## 4. Housekeeping / operational

| Field / pattern | Classification | Notes |
|-----------------|----------------|-------|
| room status, staff notes | operational; may include guest-indirect data | |

## 5. Folio / financial-adjacent

| Surface | Classification | Notes |
|---------|----------------|-------|
| `Folio` (illustrative) | **Restricted** | No execution promotion without finance + PCI scope review. |
| payments, balances, cards | **Blocked** for early pilots | |

## 6. Mutations (schema presence)

Document **mutation** types and fields from introspection even if unused:

| Mutation field | Risk | Allowed in discovery? |
|----------------|------|------------------------|
| _TBD_ | write / financial | Review only — no runtime calls. |

## 7. Query-shape / cardinality risk

| Pattern | Risk | Mitigation (future execution lane) |
|---------|------|-----------------------------------|
| Deep nesting | unbounded payload | max depth, persisted queries, allowlists |
| Wide list fields | PII blast radius | pagination caps, field masks |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Security | | |
| Integration | | |
