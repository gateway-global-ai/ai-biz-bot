# Grounding and Retrieval Policy

## Purpose
Define how agents should approach grounding, retrieval quality, transparency, and persistence when handling customer-facing requests, search flows, and database-backed responses.

## Core principle
Agents do not understand "be more careful with search" as reliably as they understand explicit scales, thresholds, required parameters, and fallback conditions.

The OS should therefore govern retrieval with machine-native controls such as:

- `groundingImportance` (0-100)
- `filterTransparency` (0-100)
- `persistence` (0-100)
- `requiredFilters`
- `defaultFilters`
- `optionalFilters`
- `detailedViewHints`

## Grounding importance

### Definition
`groundingImportance` expresses how strongly the agent must anchor a request to required parameters before proceeding.

### Interpretation
- `0` = no strict grounding requirement; exploratory results are acceptable
- `1-49` = loose grounding; partial ambiguity tolerated
- `50-79` = meaningful grounding; encourage clarification and scoped search
- `80-99` = strong grounding; the agent should work hard to acquire missing required context
- `100` = non-negotiable grounding; the agent must not proceed with ungrounded account-sensitive or quality-sensitive execution

### Examples
- customer account lookup before discussing private account details: `100`
- travel request with date and location required for quality results: `100`
- hotel/restaurant recommendations where quality matters: `80-100`
- broad hospital information request: can be much lower if exact grounding is less critical

## Filter transparency

### Definition
`filterTransparency` expresses how explicitly the agent should state the criteria being used before or during retrieval.

### Interpretation
- low = the agent may search quietly with minimal explanation
- high = the agent should explain search criteria, assumptions, and tradeoffs before or while running retrieval

### Example
An agent with `groundingImportance: 100` and `filterTransparency: 100` should clearly explain:
- what it is grounding on
- what filters it is applying
- what is required vs optional
- why it is asking for more information

## Persistence

### Definition
`persistence` expresses how hard the agent should continue trying to acquire missing grounding inputs before falling back.

### Interpretation
- low = one or two attempts, then fallback quickly
- high = push harder to collect missing dates, locations, identities, or other grounding requirements

### Rule
High persistence should still be bounded by fallback behavior; the agent must not badger indefinitely.

## Filters

### Required filters
If absent, the search or retrieval should not proceed at normal quality.

Examples:
- date and location for travel
- verified identity/profile for account-sensitive customer service

### Default filters
Applied automatically unless overridden.

Examples:
- minimum rating `3.5` for hotels or restaurants
- availability-only results for travel inventory

### Optional filters
Nice-to-have narrowing inputs that improve results but are not mandatory.

Examples:
- price band
- amenities
- category tags

## Fallback behavior
If grounding cannot be completed at the required level:

1. give a bounded explanation
2. state what required context is missing
3. offer a fallback medium or interaction

Fallbacks may include:
- governed UI view
- interactive map
- generated link
- alternate search mode with lower confidence

## Detailed views and booleans
If APIs or schemas offer booleans or flags that unlock deeper data, the integration review process should explicitly classify:
- what extra data becomes available
- whether the extra data improves quality materially
- whether the additional cost/latency is justified

## Governance rules
- every retrieval-heavy workflow should declare grounding and filtering expectations
- account-sensitive customer support should use non-negotiable grounding before disclosure
- travel, hospitality, and services retrieval should declare required/default/optional filters
- grounding policy should be part of registry and integration review, not left to ad hoc prompting
