# Cloudbeds & Hotel Knowledge Library — Index

Human-readable navigation and usage notes for agent retrieval.

## Usage

- **Build-time:** Query by `category`, `topic`, or `tags` for implementation docs.
- **Runtime:** Use `api_endpoints`, `auth_oauth`, `reservation_flow` for live flows.
- **Guardrails:** Use `best_practices` and `validation` for operational safety.

## Taxonomy (tags)

| Tag | Description |
|-----|-------------|
| `auth_oauth` | See items tagged with this topic |
| `api_endpoints` | See items tagged with this topic |
| `reservation_flow` | See items tagged with this topic |
| `payments` | See items tagged with this topic |
| `housekeeping` | See items tagged with this topic |
| `webhooks` | See items tagged with this topic |
| `global_variables` | See items tagged with this topic |
| `schema_aliasing` | See items tagged with this topic |
| `ui_react` | See items tagged with this topic |
| `voice_workflow` | See items tagged with this topic |
| `best_practices` | See items tagged with this topic |

## Sections

| Section | Description | Count |
|---------|-------------|-------|
| [cloudbeds/](cloudbeds/INDEX.md) | API, OAuth, workflows, validation | 28 |
| [hospitality/](hospitality/INDEX.md) | Templates, industry mapping | 5 |
| [hotel-matching/](hotel-matching/INDEX.md) | Matching and rate intelligence | 8 |
| [global-variables/](global-variables/INDEX.md) | Variable mapping and schema aliasing | 3 |

## All items

### cloudbeds
- [Cloudbeds Api Query Guide](cloudbeds/api/CLOUDBEDS_API_QUERY_GUIDE.md) — `api_endpoints best_practices`
- [Oauth Implementation](cloudbeds/api/OAUTH_IMPLEMENTATION.md) — `auth_oauth api_endpoints`
- [Property Parameter Guide](cloudbeds/api/PROPERTY_PARAMETER_GUIDE.md) — `api_endpoints best_practices`
- [Pms V1.3 Openapi](cloudbeds/api/pms-v1.3-openapi.yaml) — `api_endpoints`
- [Validation Rules](cloudbeds/validation/validation-rules.yaml) — `best_practices`
- [Readme](cloudbeds/validation/README.md) — `best_practices`
- [Cloudbeds Housekeeping Guide](cloudbeds/workflows/CLOUDBEDS_HOUSEKEEPING_GUIDE.md) — `housekeeping voice_workflow`
- [Cloudbeds Payment Guide](cloudbeds/workflows/CLOUDBEDS_PAYMENT_GUIDE.md) — `payments voice_workflow`
- [Cloudbeds Reservation Modification Guide](cloudbeds/workflows/CLOUDBEDS_RESERVATION_MODIFICATION_GUIDE.md) — `reservation_flow voice_workflow`
- [Critical Workflow Patterns](cloudbeds/workflows/CRITICAL_WORKFLOW_PATTERNS.md) — `voice_workflow`
- [Hotel Workflow Developer Documentation](cloudbeds/workflows/HOTEL_WORKFLOW_DEVELOPER_DOCUMENTATION.md) — `voice_workflow best_practices`
- [Workflow Creation Guide](cloudbeds/workflows/WORKFLOW_CREATION_GUIDE.md) — `voice_workflow best_practices`
- [Cloudbeds Api Client Usage](cloudbeds/supplemental/CLOUDBEDS_API_CLIENT_USAGE.md) — `api_endpoints`
- [Cloudbeds Api Integration Guide](cloudbeds/supplemental/CLOUDBEDS_API_INTEGRATION_GUIDE.md) — `api_endpoints best_practices`
- [Cloudbeds Authentication Guide](cloudbeds/supplemental/CLOUDBEDS_AUTHENTICATION_GUIDE.md) — `auth_oauth best_practices`
- [Cloudbeds Booking Flow Guide](cloudbeds/supplemental/CLOUDBEDS_BOOKING_FLOW_GUIDE.md) — `reservation_flow best_practices`
- [Cloudbeds Booking Flow Sequence](cloudbeds/supplemental/CLOUDBEDS_BOOKING_FLOW_SEQUENCE.md) — `reservation_flow`
- [Cloudbeds Complete Api Documentation](cloudbeds/supplemental/CLOUDBEDS_COMPLETE_API_DOCUMENTATION.md) — `api_endpoints`
- [Cloudbeds Endpoint Mapping](cloudbeds/supplemental/CLOUDBEDS_ENDPOINT_MAPPING.md) — `api_endpoints`
- [Cloudbeds Input Collection](cloudbeds/supplemental/CLOUDBEDS_INPUT_COLLECTION.md) — `best_practices`
- [Cloudbeds Natural Language Formatting](cloudbeds/supplemental/CLOUDBEDS_NATURAL_LANGUAGE_FORMATTING.md) — `best_practices`
- [Cloudbeds Oauth Callback Setup](cloudbeds/supplemental/CLOUDBEDS_OAUTH_CALLBACK_SETUP.md) — `auth_oauth`
- [Cloudbeds Oauth Setup](cloudbeds/supplemental/CLOUDBEDS_OAUTH_SETUP.md) — `auth_oauth`
- [Cloudbeds Oauth Test Results](cloudbeds/supplemental/CLOUDBEDS_OAUTH_TEST_RESULTS.md) — `auth_oauth`
- [Cloudbeds Payment Methods](cloudbeds/supplemental/CLOUDBEDS_PAYMENT_METHODS.md) — `payments`
- [Cloudbeds Reservation Success](cloudbeds/supplemental/CLOUDBEDS_RESERVATION_SUCCESS.md) — `reservation_flow`
- [Cloudbeds Sdk Summary](cloudbeds/supplemental/CLOUDBEDS_SDK_SUMMARY.md) — `best_practices`
- [Endpoints Database Guide](cloudbeds/supplemental/ENDPOINTS_DATABASE_GUIDE.md) — `api_endpoints best_practices`

### hospitality
- [Extraction Analysis](hospitality/industry-mapping/EXTRACTION_ANALYSIS.md) — `best_practices`
- [Industry Analysis Plan](hospitality/industry-mapping/INDUSTRY_ANALYSIS_PLAN.md) — `best_practices`
- [Readme](hospitality/industry-mapping/README.md) — `best_practices`
- [Hotel Booking Template](hospitality/templates/hotel-booking-template.json) — `reservation_flow ui_react`
- [Identity Verification Template](hospitality/templates/identity-verification-template.json) — `ui_react`

### hotel-matching
- [Hotel Display Fixes](hotel-matching/HOTEL_DISPLAY_FIXES.md) — `best_practices`
- [Hotel Matching Architecture](hotel-matching/HOTEL_MATCHING_ARCHITECTURE.md) — `best_practices`
- [Hotel Matching Integration](hotel-matching/HOTEL_MATCHING_INTEGRATION.md) — `best_practices`
- [Hotel Matching Logic](hotel-matching/HOTEL_MATCHING_LOGIC.md) — `best_practices`
- [Hotel Rates Filtering](hotel-matching/HOTEL_RATES_FILTERING.md) — `best_practices`
- [Implementation Plan Hotel Matching](hotel-matching/IMPLEMENTATION_PLAN_HOTEL_MATCHING.md) — `best_practices`
- [Hotel Matching Algorithm](hotel-matching/hotel-matching-algorithm.md) — `best_practices`
- [Hotel Rate Matching](hotel-matching/hotel-rate-matching.md) — `best_practices`

### global-variables
- [Global Variables Reference](global-variables/GLOBAL_VARIABLES_REFERENCE.md) — `global_variables`
- [Schema Aliasing](global-variables/schema-aliasing.json) — `global_variables schema_aliasing`
- [Schema Aliasing](global-variables/schema-aliasing.mdc) — `global_variables schema_aliasing`
