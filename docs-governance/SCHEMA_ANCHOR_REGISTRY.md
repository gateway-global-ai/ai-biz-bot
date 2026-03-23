# Schema Anchor Registry

## Purpose
Define the real source-of-truth entities the OS is allowed to reason about before any domain concepts or UI abstractions are introduced.

## Approved anchors

### `customerAccounts`
- Primary key: `customerAccountId`
- Role: top-level account / ownership / billing / onboarding scope
- Key relationships:
  - owns `siteConfigs`
  - carries account type, onboarding, compliance, activation state

### `siteConfigs`
- Primary key: `siteConfigId`
- Role: business / workspace anchor
- Key relationships:
  - parent: `customerAccounts`
  - child/linked: `agents`, chat activity, business configuration

### `agents`
- Primary key: `agentId`
- Parent key: `siteConfigId`
- Role: runtime persona and behavior anchor

### `customers`
- Primary key: `customerId`
- Role: CRM / lead / customer record within business scope

### `novaIdvSessions`
- Primary key: `sessionId`
- Role: verification-session anchor

### `orders`
- Primary key: `orderId`
- Role: transaction / invoice / payment-related workflow anchor

### `inquiries`
- Primary key: `inquiryId`
- Role: intake and support workflow anchor

### `chatLogs`
- Primary key: `chatLogId`
- Role: conversation and audit activity anchor

## Rules
- New architecture work must map to these anchors first.
- Domain concepts may group or reinterpret anchors, but may not replace them as truth.
- No new entity may be treated as canonical unless it is added deliberately to this registry and the runtime schema.
