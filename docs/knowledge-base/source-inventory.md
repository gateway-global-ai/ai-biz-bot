# Cloudbeds/Hotel Knowledge Library — Source Inventory

Sources are **extracted project folders only** (no .cursor worktrees, no node_modules/.next).

## Canonical sources (priority order)

| Priority | Root path | Purpose |
|----------|-----------|---------|
| 1 | `/root/cloudbeds-api-integration/` | Primary Cloudbeds API, workflows, validation, OpenAPI |
| 2 | `/root/industry-solutions/` | Hospitality templates, industry mapping |
| 3 | `/root/twilio.platformeconomics.ai/` | Cloudbeds OAuth SDK, demo integration docs |
| 4 | `/root/grn-travel/mcp-auto-agent/` | Hotel matching, rates, training frameworks |
| 5 | `/root/.cursor/rules/` | Schema aliasing (Cloudbeds provider mapping) |

## Duplicate / excluded

- **Excluded:** `.cursor/worktrees/*` (mirrors; not extracted project roots).
- **Excluded:** `node_modules`, `demo-ui/.next`, any build/cache dirs.
- **Single canonical YAML:** `pms-v1.3-openapi.yaml` from cloudbeds-api-integration/generated; twilio copy omitted.
- **Single canonical:** `validation-rules.yaml` from cloudbeds-api-integration/validation-rules.

## File list by category

### Cloudbeds (API, OAuth, workflows, validation)
- cloudbeds-api-integration/docs/CLOUDBEDS_*.md
- cloudbeds-api-integration/docs/HOTEL_WORKFLOW_DEVELOPER_DOCUMENTATION.md
- cloudbeds-api-integration/docs/WORKFLOW_CREATION_GUIDE.md
- cloudbeds-api-integration/docs/CRITICAL_WORKFLOW_PATTERNS.md
- cloudbeds-api-integration/docs/OAUTH_IMPLEMENTATION.md
- cloudbeds-api-integration/docs/PROPERTY_PARAMETER_GUIDE.md
- cloudbeds-api-integration/validation-rules/validation-rules.yaml
- cloudbeds-api-integration/generated/pms-v1.3-openapi.yaml
- twilio.platformeconomics.ai/demo/cloudbeds-integration/docs/CLOUDBEDS_*.md
- twilio.platformeconomics.ai/cloudbeds-oauth-sdk/CLOUDBEDS_SDK_SUMMARY.md
- twilio.platformeconomics.ai/demo/user_input_files/cloudbeds-integration/pms-v1.3-openapi.yaml (alternate; canonical in library is from cloudbeds-api-integration)

### Hospitality
- industry-solutions/README.md
- industry-solutions/EXTRACTION_ANALYSIS.md
- industry-solutions/INDUSTRY_ANALYSIS_PLAN.md
- industry-solutions/hospitality/hotel-booking-template.json
- industry-solutions/hospitality/identity-verification-template.json

### Hotel matching (grn-travel)
- grn-travel/mcp-auto-agent/mcp-orchestrator/HOTEL_MATCHING_ARCHITECTURE.md
- grn-travel/mcp-auto-agent/mcp-orchestrator/HOTEL_MATCHING_INTEGRATION.md
- grn-travel/mcp-auto-agent/mcp-orchestrator/HOTEL_RATES_FILTERING.md
- grn-travel/mcp-auto-agent/training-library/frameworks/hotel-matching-algorithm.md
- grn-travel/mcp-auto-agent/training-library/frameworks/hotel-rate-matching.md
- grn-travel/mcp-auto-agent/training-library/IMPLEMENTATION_PLAN_HOTEL_MATCHING.md
- grn-travel/HOTEL_MATCHING_LOGIC.md
- grn-travel/HOTEL_DISPLAY_FIXES.md

### Global variables & schema aliasing
- cloudbeds-api-integration/docs/GLOBAL_VARIABLES_REFERENCE.md
- .cursor/rules/schema-aliasing.mdc
- .cursor/rules/schema-aliasing.json

### Status / context (optional in library)
- cloudbeds-api-integration/CURRENT_STATUS.md
