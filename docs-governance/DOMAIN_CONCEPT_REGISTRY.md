# Domain Concept Registry

## Purpose
Define business concepts used by the OS without pretending they are all first-class schema anchors.

## Rules
- Domain concepts may map to one or more schema anchors.
- A domain concept is not automatically a canonical database entity.
- If a concept requires first-class runtime identity later, it must be promoted deliberately through schema and registry changes.

## Current mappings

### `business`
- Current primary anchor: `siteConfigs`
- Notes:
  - `siteConfigId` is the real runtime/workspace identity for a business in the live system.

### `workspace`
- Current primary anchor: `siteConfigs`
- Notes:
  - In the current system, workspace and business are often the same operating object.

### `reseller`
- Current primary anchor: `customerAccounts`
- Supporting fields:
  - `accountType`
  - `parentAccountId`
  - reseller-related commission and payout fields
- Notes:
  - currently modeled as an account role/pattern rather than a separate canonical anchor

### `franchise`
- Current primary anchors:
  - `customerAccounts`
  - `siteConfigs`
- Supporting patterns:
  - `customerAccounts.accountType`
  - `customerAccounts.parentAccountId`
  - franchise/business scope values where present
- Notes:
  - there is **not** currently a dedicated first-class `franchise` UUID anchor in the core live schema
  - franchise is currently treated as a domain concept layered over account hierarchy and scoped business/workspace records
  - if the OS later requires explicit franchise-level runtime identity, it should be promoted deliberately into a first-class schema anchor with its own registry entry

### `route`
- Current implementation:
  - logical route registry
  - browser route adapters
- Notes:
  - currently more of an OS/runtime concept than a single schema anchor

### `qr_destination`
- Current implementation:
  - QR feature domain + route target relationships
- Notes:
  - may span route/view/runtime layers depending on destination type

### `location`
- Current state:
  - conceptually important, but not yet standardized as a universal first-class schema anchor in the core OS plan
