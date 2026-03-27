---
status: canonical
truth_domain: ui
enforced_by: brand-tokens.mdc
backed_by:
  schema: true
  service: false
  route: false
last_verified: 2026-03-25
---
# Brand Identity Specification

**Version:** 1.0
**Status:** Active
**Governed by:** `preflight-review-required.mdc`

---

## Purpose

Define the canonical 15-field brand schema for every business deployed on Clear Voice AI OS. Every agent must have brand context before going live. Brand identity data is stored in `site_configs.brand_governance` (JSONB).

This document defines field contracts, validation rules, the completion score formula, and what each field means for agent behavior.

---

## The 15-Field Brand Schema

### Section 1 — Identity (5 fields)

| Field | Key | Type | Auto-populated | Required for Live |
|---|---|---|---|---|
| Brand Name | `brandName` | string | Yes (placeData.name) | Yes |
| Brand Slogan | `brandSlogan` | string | Partial (SerpAPI) | No |
| Brand Logo URL | `brandLogoUrl` | string | Yes (placeData.photos[0]) | No |
| Primary Color | `primaryColor` | hex string | No | No |
| Accent Color | `accentColor` | hex string | No | No |

**`brandName`** — The canonical business name as it should be spoken by the agent. Not the DBA or legal name unless they differ.

**`brandSlogan`** — One line. The promise. Used in agent introductions and greetings.

**`brandLogoUrl`** — URL to the logo file. Surfaced in the ConciergePanel header when set and `siteConfig.logoUrl` is empty.

**`primaryColor` / `accentColor`** — Hex values used for theming the agent's canvas when white-label theming is enabled. Not used by the platform shell (which uses `SHELL.bg` from `brand.ts` always).

### Section 2 — Positioning (2 fields)

| Field | Key | Type | Auto-populated | Required for Live |
|---|---|---|---|---|
| Claim | `claim` | string | Partial (reviews) | Recommended |
| Differentiator | `differentiator` | string | No | No |

**`claim`** — The single most compelling thing the business can say about itself. Extracted from high-frequency review themes when auto-populated. Example: "Las Vegas's most trusted chiropractic group."

**`differentiator`** — What makes this business uniquely better than alternatives. One to two sentences. Injected into the agent system prompt.

### Section 3 — Offer Stack (3 fields)

| Field | Key | Type | Auto-populated | Required for Live |
|---|---|---|---|---|
| Irresistible Offer | `irresistibleOffer` | string | No | Recommended |
| Free Trial | `freeTrial` | `{ defined: boolean, description: string }` | No | No |
| Guarantee | `guarantee` | `{ defined: boolean, description: string }` | No | No |

**`irresistibleOffer`** — The one offer that makes a prospect say yes immediately. Not a discount. A complete value proposition. Example: "New patient exam + X-ray for $49, no insurance needed."

**`freeTrial`** — Whether the business offers a trial. Must be explicitly defined by the owner — never assumed. The agent uses this to convert hesitant prospects.

**`guarantee`** — Whether the business offers a satisfaction guarantee. The agent uses this to handle objections.

### Section 4 — Market (2 fields)

| Field | Key | Type | Auto-populated | Required for Live |
|---|---|---|---|---|
| Target Market | `targetMarket` | string | Partial (SerpAPI) | Recommended |
| Channel Partners | `channelPartners` | string[] | No | No |

**`targetMarket`** — One to two sentences describing the ideal customer. Demographics, psychographics, geography. The agent uses this to calibrate its communication style.

**`channelPartners`** — Businesses, platforms, or networks that refer customers. Examples: insurance networks, local business associations, QR code distribution partners.

### Section 5 — Revenue (3 fields)

| Field | Key | Type | Auto-populated | Required for Live |
|---|---|---|---|---|
| Core Products | `coreProducts` | string[] | Partial (categories) | No |
| Product Upsells | `productUpsells` | string[] | No | No |
| Core Services | `coreServices` | string[] | Yes (placeData.types) | No |
| Service Upsells | `serviceUpsells` | string[] | No | No |

**`coreProducts` / `coreServices`** — The primary offerings. Auto-populated from Google Maps place types and categories.

**`productUpsells` / `serviceUpsells`** — Add-ons, packages, or upgrades the agent should mention after the primary offering is discussed. Critical for revenue event conversion.

---

## Completion Score Formula

```
completionScore = (filledFields / 15) * 100
```

Where a field is considered "filled" if:
- String fields: non-empty, non-whitespace, length > 2
- Boolean-with-description fields (`freeTrial`, `guarantee`): `defined === true` AND `description.length > 5`
- Array fields: `length >= 1`

**Thresholds:**

| Score | Status | Gate |
|---|---|---|
| 0–39 | Incomplete | Cannot proceed to flight check |
| 40–79 | In Progress | Can save drafts, cannot go live |
| 80–99 | Ready | Can submit for flight check + owner approval |
| 100 | Complete | Full brand context available |

**Minimum for go-live: 80 (12 of 15 fields filled)**

---

## Full JSON Schema

```json
{
  "brandName": "",
  "brandSlogan": "",
  "brandLogoUrl": "",
  "primaryColor": "",
  "accentColor": "",
  "claim": "",
  "differentiator": "",
  "irresistibleOffer": "",
  "freeTrial": { "defined": false, "description": "" },
  "guarantee": { "defined": false, "description": "" },
  "targetMarket": "",
  "channelPartners": [],
  "coreProducts": [],
  "productUpsells": [],
  "coreServices": [],
  "serviceUpsells": [],
  "completionScore": 0,
  "ownerApproved": false,
  "approvedAt": null,
  "deepResearchPromptGenerated": false,
  "lastAutoPopulatedAt": null,
  "lastInterviewedAt": null
}
```

---

## Prompt Compiler Integration

When `brand_governance` exists on a `siteConfig`, the prompt compiler injects a **Layer 1c — Brand Context** block into every agent system prompt. See `docs-governance/BRAND_AGENT_POLICY.md` for the injection template.

This ensures agents know what they are selling, to whom, and in what voice — pulled from the database, not hardcoded.

---

## Governance Rules

1. The `brand_governance` column is owned by the business (siteConfig level), not by individual agents
2. All 6 agents sharing a `siteConfigId` inherit the same brand context
3. Brand profile changes require re-running the flight check if the agent is currently live
4. The `BrandGovernanceAgent` is the only agent allowed to write to `brand_governance` programmatically — owners may also edit directly via `BrandGovernancePanel`
5. `ownerApproved` must be set by the owner, not by any automated process
