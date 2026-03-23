# Sales Funnel Specification

**Version:** 1.0
**Status:** Active
**Governed by:** `preflight-review-required.mdc`

---

## Purpose

Define the sales funnel data model, terminal action types, Digital Business Tree structure, Revenue Event taxonomy, and pre-flight gate requirements for every agent deployed on Clear Voice AI OS.

Sales funnel data is stored in `site_configs.sales_funnels` (JSONB array). Multiple funnels per business are supported.

---

## Terminal Action Types

Every funnel has exactly one terminal action — the successful outcome of a customer interaction.

| Terminal Action | Description | Required Agent Mode |
|---|---|---|
| `book` | Customer books an appointment or reservation | `RECEPTIONIST` or higher |
| `buy` | Customer purchases a product | `SALES` or higher |
| `signup` | Customer creates an account or joins a program | `RECEPTIONIST` or higher |
| `support` | Customer issue is resolved | `CUSTOMER_SUPPORT` |
| `lead` | Customer contact info is captured for follow-up | `SAFE` (minimum) |

**For Phase 1 (Safe Mode):** `lead` is the only available terminal action without a paid plan. All other terminal actions require at minimum the Voice AI plan.

---

## Sales Funnel JSON Schema

```json
{
  "id": "uuid-v4",
  "name": "Primary Funnel",
  "terminalAction": "book | buy | signup | support | lead",
  "entryPoints": ["qr_code", "homepage_widget", "phone_number", "sms"],
  "digitalTree": {
    "level0": "Business Group Name",
    "level1": ["Location or Division Names"],
    "level2": ["User Roles or Teams"],
    "level3": ["Departments or Categories"],
    "level4": ["Actionable Items"]
  },
  "conversionObjective": "string describing what success looks like",
  "fallbackRoutes": {
    "website": "",
    "booking": "",
    "ordering": "",
    "support": ""
  },
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

A `site_config` may have multiple funnels. The first funnel where `terminalAction` is not `lead` is considered the **primary funnel** for prompt compiler injection.

---

## The Digital Business Tree

The Digital Tree is the operational map the AI agent navigates to reach actionable items. It defines the menu hierarchy presented to customers.

### Level Definitions

| Level | Name | Description | Example |
|---|---|---|---|
| Level 0 | Business Group | The top-level organization | "Harvest Kitchen Group" |
| Level 1 | Location / Division | Geographic or divisional split | "Downtown Location", "North America" |
| Level 2 | Users / Teams | Who is being served | "Customers", "Staff", "VIP Members" |
| Level 3 | Departments / Categories | Functional areas | "Reservations", "Orders", "Support" |
| Level 4 | Actionable Items | Concrete tasks or queries | "Book Table", "Place Order", "Check Hours" |

### Design Rules

1. Every Level 4 item must resolve to either a **tool call** (e.g., calendar booking) or a **fallback route** (e.g., website URL)
2. No dead ends — every path must terminate in an action or a clear escalation
3. Level 4 items should be verb-first: "Book Table" not "Table Booking"
4. Maximum 6 items at any single level to avoid cognitive overload

### Example Tree: Multi-Location Chiropractic

```
Level 0:  The Joint Chiropractic
Level 1:  Las Vegas Locations
Level 2:  New Patients | Existing Patients
Level 3:  Appointments | Insurance | Pain Assessment | Billing
Level 4:  Book Visit | Reschedule | Check Benefits | Get Directions | Contact Support
```

---

## Entry Points

Every funnel defines how customers enter the AI experience.

| Entry Point | Description | QR Code Generated |
|---|---|---|
| `qr_code` | Physical QR on signage, menus, receipts | Yes — unique per funnel |
| `homepage_widget` | Embedded chat/voice widget on website | No |
| `phone_number` | Inbound PSTN call via Twilio | Requires Voice plan |
| `sms` | Inbound SMS trigger | Requires Voice plan |

Each entry point can inject a `workspaceState` parameter that pre-configures the agent's context. Example: a QR code on a "New Patient" flyer passes `?mode=new_patient`, and the agent immediately begins the new patient intake flow.

---

## Revenue Event Taxonomy

A Revenue Event is any interaction that moves a customer toward the terminal action. These are logged in `chatLogs` and `callLogs` for billing and analytics.

| Event Type | Trigger | Revenue Signal |
|---|---|---|
| `lead_captured` | Customer provides name + phone/email | Weak |
| `intent_expressed` | Customer explicitly states interest in a service | Moderate |
| `appointment_booked` | Calendar event created | Strong |
| `purchase_initiated` | Cart or payment link sent | Strong |
| `verification_completed` | Nova IDV passed | Strong |
| `purchase_completed` | Payment confirmed | Conversion |

---

## Pre-Flight Gate Requirements

An agent cannot transition to `workspaceState: live` until the following are true:

### Required for All Plans (Phase 1 — Safe Mode)

| Check | Validation |
|---|---|
| Business data confirmed | `placeData` exists OR manual profile complete |
| At least one fallback route | `sales_funnels[0].fallbackRoutes.website` is non-empty |
| Brand profile score ≥ 80 | `brand_governance.completionScore >= 80` |
| Agent voice configured | `agents.voiceId` is set |
| Owner approved | `brand_governance.ownerApproved === true` |

### Additional Requirements for Paid Plans (Phase 2+)

| Check | Validation |
|---|---|
| Voice plan active | `siteConfig.voicePlanActive === true` |
| Phone number provisioned | `siteConfig.provisionedPhoneNumber` is non-empty |
| At least one knowledge document | `knowledgeLibrary` has ≥ 1 artifact |

### Flight Check Score Computation

```
Knowledge Score  = (knowledgeArtifacts > 0 ? 100 : 0)
Routing Score    = (fallbackRoutes filled / 4) * 100
Brand Score      = brand_governance.completionScore
Tools Score      = (voiceConfigured ? 50 : 0) + (phoneProvisioned ? 50 : 0)

Overall Status   = READY if (all required checks pass && ownerApproved)
                 = NOT READY otherwise
```

---

## Prompt Compiler Injection

When a `siteConfig` has `sales_funnels` defined, the prompt compiler injects the primary funnel's context into Layer 1c:

```
### SALES OBJECTIVE
Your goal in every interaction: convert to → {primaryFunnel.terminalAction}
Entry: Customer reached you via {entryPoint}
If you cannot complete this action directly, route to: {fallbackRoutes.booking or website}
```

This ensures the agent has a clear mission in every conversation.

---

## Governance Rules

1. Every `siteConfig` should have at least one funnel defined before going live
2. `terminalAction` changes require re-running the flight check
3. The `digitalTree` is the source of truth for dynamic menu generation — do not hardcode menu items in UI components
4. Funnel analytics (which entry points convert, which Level 4 actions are taken) feed the AI CMO agent in Phase 3
