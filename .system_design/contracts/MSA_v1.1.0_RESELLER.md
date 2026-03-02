---
version: "1.1.0"
type: addendum
parent_msa: "contracts/MSA_v1.0.0.md"
effective_date: 2026-02-27
parties:
  vendor: "Gateway Global AI"
  reseller: "[Entity as identified in the Reseller Service Order]"
schema: contracts/MSA_ADDENDUM
---

# RESELLER SERVICE ADDENDUM (MSA v1.1.0)

This Addendum extends and is incorporated into the Master Service Agreement v1.0.0 ("MSA") and governs the relationship between Gateway Global AI ("The Vendor") and the Reseller Entity ("The Reseller"). In the event of any conflict between this Addendum and the base MSA, this Addendum controls solely with respect to the Reseller relationship.

---

## 1. THE "FRANCHISE" HIERARCHY

**1.1 Master Account:** The Reseller maintains a "Master UUID" with administrative access to a dedicated Reseller Dashboard. The Master UUID carries the `accountType: RESELLER` designation in the Vendor's platform.

**1.2 Sub-Accounts:** The Reseller is authorized to provision "Sub-Account UUIDs" (each carrying `accountType: SUB_ACCOUNT`) for their end-customers. Each Sub-Account is linked to the Reseller's Master UUID via the `parentAccountId` field.

**1.3 Co-Signature Requirement:** Before an end-customer may execute their own MSA acceptance (the "End-User Signature"), the Reseller must first record a countersignature on the Sub-Account record (the "Reseller Pre-Signature," stored as `resellerMsaConfirmedAt`). The "Cognitive Dial Tone" — voice, SMS, and chat interfaces — is not opened until both signatures are recorded.

**1.4 End-User Ownership:** The Reseller is responsible for the billing, Tier-1 support, and MSA enforcement for all Sub-Accounts provisioned under their Master UUID. The Reseller's execution of this Addendum constitutes acceptance of these obligations for all current and future Sub-Accounts.

**1.5 A2P Content Provider Designation:** For all Sub-Accounts, the Reseller is the "Account Owner" and the end-customer is the "Content Provider" as defined by A2P 10DLC carrier standards. The Content Provider's name, business role, and acknowledgement timestamp must be recorded at the time of the A2P compliance submission. This designation is binding for carrier-level audits and Vendor indemnification under MSA §4.3.

---

## 2. WHOLESALE PRICING & REVENUE SHARE

**2.1 Base Wholesale Rate:** The Reseller pays a flat $49.00/month ("Wholesale Rate") per active Sub-Account to the Vendor. The Wholesale Rate is debited from the Reseller's payment method on file on the first of each billing cycle.

**2.2 Markup Authority:** The Reseller is permitted to set retail pricing for their end-customers ("Retail Price") at any amount above the Wholesale Rate. The Vendor will collect the Retail Price via Stripe and remit the Net Margin as follows:

> **Reseller Payout = Retail Price − Wholesale Rate − Stripe Processing Fee**

This amount is credited to the Reseller's `resellerCommissionBalance` and disbursed via Stripe Connect to the Reseller's connected account (`stripeConnectedAccountId`) on the Vendor's standard payout schedule.

**2.3 Overage Pass-Through:** Wholesale overage rates (Phone Voice AI: $0.25/min; Web Voice AI: $0.18/min; A2P SMS: $0.125/message) are billed to the Reseller's payment method on file for all Sub-Accounts. If the "Managed Billing" option is selected for a specific Sub-Account, overage charges are instead billed directly to that Sub-Account's payment method.

**2.4 Custom Wholesale Rates:** The Vendor reserves the right to negotiate a custom `wholesaleRate` for high-volume Resellers. Any deviation from the $49.00 standard rate must be documented in a signed Reseller Service Order.

---

## 3. BRAND PROTECTION & WHITE LABELING

**3.1 "Powered By" Credits:** Unless a "White Label" tier is purchased under a separate addendum, all AI interfaces provisioned under Sub-Accounts must maintain the "Powered by Gateway Global AI" watermark in the footer of all chat, voice, and SMS interfaces.

**3.2 Standard of Service:** The Reseller warrants that they will not misrepresent the AI's capabilities or make guarantees to end-customers that exceed the Vendor's SLA as defined in MSA §1.3 (99.9% uptime target). The Reseller bears sole liability for any representations made beyond the scope of the published SLA.

**3.3 Prohibited Conduct:** The Reseller shall not: (a) reverse-engineer the Vendor's AI models; (b) attempt to extract foundational model weights; (c) represent the AI as their own proprietary technology without a White Label agreement; or (d) sub-license the platform to another reseller without prior written consent ("no daisy-chaining").

---

## 4. TERMINATION & EFFECT ON SUB-ACCOUNTS

**4.1 Reseller Termination:** If the Reseller's Master Account is terminated for any reason, all Sub-Accounts provisioned under that Master UUID will be suspended within 48 hours. The Vendor will make commercially reasonable efforts to notify affected Sub-Account end-customers directly.

**4.2 Sub-Account Migration:** Upon Reseller termination, Sub-Account end-customers may apply to convert their Sub-Account to a `DIRECT` account. Vendor will honor this migration at the standard retail rate ($49.00/month) with no new minimum-term commitment for the first 90 days post-migration.

**4.3 Surviving Obligations:** Sections 1.5 (A2P Content Provider), 3.3 (Prohibited Conduct), and the indemnification obligations of MSA §4.3 survive termination of this Addendum.
