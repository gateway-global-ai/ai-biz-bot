/**
 * A2P Compliance Provisioner — Gateway Global AI
 *
 * One-shot script: creates the 6 Twilio Messaging Services for the Sovereign
 * SMS Router and a full Trust Hub Secondary Customer Profile bundle (business
 * info, authorized rep, address, supporting doc, assignments, evaluate, submit).
 *
 * Run with Doppler (required for Twilio creds and business registration number):
 *
 *   doppler run -- npx tsx scripts/provision-a2p-compliance.ts
 *
 * REQUIRED DOPPLER SECRET (set once; never commit this value):
 *
 *   doppler secrets set BUSINESS_REGISTRATION_NUMBER="<your-9-digit-SSN-no-dashes>"
 *
 * The script reads process.env.BUSINESS_REGISTRATION_NUMBER. If missing, it
 * exits with a clear error. SSN must never appear in any file or log.
 *
 * Prerequisite: A Primary Customer Profile in Trust Hub with status
 * "twilio-approved". The script lists profiles and uses the first approved
 * one to get policySid and to assign to the new bundle.
 *
 * Note: Twilio restricts creating Secondary Customer Profiles with business
 * identity "direct_customer" via API; they must be created in the Twilio
 * Console. This script always creates the 6 Messaging Services (and prints
 * Doppler output). If the Trust Hub bundle creation fails with that
 * restriction, the script continues and instructs you to create the bundle
 * in Console.
 */

import twilio from "twilio";

// ── Env validation ─────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const BUSINESS_REGISTRATION_NUMBER = process.env.BUSINESS_REGISTRATION_NUMBER;
/** Base URL for webhooks; set APP_URL in Doppler for prod (e.g. https://aibizbot.gatewayglobal.ai). */
const APP_URL = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";

const BASE_URL = APP_URL.replace(/\/$/, "");
const STATUS_CALLBACK = `${BASE_URL}/api/webhooks/twilio/trusthub-status`;
/** Inbound SMS webhook: STOP/START opt-out handler (POST). */
const INBOUND_WEBHOOK_URL = `${BASE_URL}/api/webhooks/twilio/incoming`;

function validateEnv(): void {
  const missing: string[] = [];
  if (!TWILIO_ACCOUNT_SID) missing.push("TWILIO_ACCOUNT_SID");
  if (!TWILIO_AUTH_TOKEN) missing.push("TWILIO_AUTH_TOKEN");
  if (!BUSINESS_REGISTRATION_NUMBER) {
    missing.push(
      "BUSINESS_REGISTRATION_NUMBER (set in Doppler; never commit this value)"
    );
  }
  if (missing.length > 0) {
    console.error(
      "[provision-a2p-compliance] Missing required environment variables:"
    );
    missing.forEach((m) => console.error("  -", m));
    console.error(
      "\nRun with: doppler run -- npx tsx scripts/provision-a2p-compliance.ts"
    );
    process.exit(1);
  }
}

// ── Constants (Trust Hub bundle: Gateway Global AI, Sole Proprietor) ────────

const BUSINESS = {
  friendlyName: "Gateway Global AI",
  businessName: "Gateway Global AI",
  businessType: "Sole Proprietorship",
  businessIndustry: "TECHNOLOGY",
  businessIdentity: "direct_customer",
  businessRegionsOfOperation: "USA_AND_CANADA",
  websiteUrl: "http://aibizbot.gatewayglobal.ai",
  socialMediaProfileUrls: "",
  businessRegistrationIdentifier: "Other",
  // businessRegistrationNumber comes from env (never logged)
} as const;

const REP = {
  firstName: "Jason",
  lastName: "Trindade",
  email: "jason@gatewayglobal.ai",
  phoneNumber: "+17025405471",
  businessTitle: "Founder and CEO",
  jobPosition: "CEO" as const,
} as const;

const ADDRESS = {
  customerName: "Gateway Global AI",
  street: "3810 Spizte Drive",
  streetSecondary: "",
  city: "Las Vegas",
  region: "NV",
  postalCode: "89103",
  isoCountry: "US",
} as const;

const MESSAGING_SERVICES: { friendlyName: string; dopplerKey: string }[] = [
  { friendlyName: "GGW Platform OTP", dopplerKey: "TWILIO_MS_PLATFORM_OTP" },
  { friendlyName: "GGW Platform Care", dopplerKey: "TWILIO_MS_PLATFORM_CARE" },
  {
    friendlyName: "GGW Platform Marketing",
    dopplerKey: "TWILIO_MS_PLATFORM_MKTG",
  },
  { friendlyName: "GGW Customer OTP", dopplerKey: "TWILIO_MS_CUSTOMER_OTP" },
  { friendlyName: "GGW Customer Care", dopplerKey: "TWILIO_MS_CUSTOMER_CARE" },
  {
    friendlyName: "GGW Customer Marketing",
    dopplerKey: "TWILIO_MS_CUSTOMER_MKTG",
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[provision-a2p-compliance] Starting…\n");
  validateEnv();

  const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);

  // ── 1. Fetch Primary Customer Profile (twilio-approved) and policy SID ────
  console.log("1. Fetching Primary Customer Profile (twilio-approved)…");
  const profiles = await client.trusthub.v1.customerProfiles.list({
    limit: 100,
  });
  const primary = profiles.find((p) => p.status === "twilio-approved");
  if (!primary) {
    console.error(
      "[provision-a2p-compliance] No Primary Customer Profile with status 'twilio-approved' found. Create and approve one in Trust Hub first."
    );
    process.exit(1);
  }
  const policySid = primary.policySid;
  const primaryProfileSid = primary.sid;
  console.log(`   Primary Profile SID: ${primaryProfileSid}, Policy SID: ${policySid}\n`);

  // ── 2. Create 6 Messaging Services and wire inbound webhook ──────────────
  console.log("2. Creating 6 Messaging Services…");
  const messagingServiceSids: Record<string, string> = {};
  for (const { friendlyName, dopplerKey } of MESSAGING_SERVICES) {
    const svc = await client.messaging.v1.services.create({
      friendlyName,
      useInboundWebhookOnNumber: false,
    });
    messagingServiceSids[dopplerKey] = svc.sid;
    await client.messaging.v1.services(svc.sid).update({
      inboundRequestUrl: INBOUND_WEBHOOK_URL,
      inboundMethod: "POST",
    });
    console.log(`   ${dopplerKey}: ${svc.sid} (inbound → ${INBOUND_WEBHOOK_URL})`);
  }
  console.log("");

  // ── 3–11. Trust Hub Secondary Customer Profile bundle (optional via API) ───
  // Twilio restricts creating Secondary Customer Profiles with business_identity
  // "direct_customer" via API; they must be created in the Twilio Console.
  // We try the bundle; if we get the restriction error, we skip and still output Doppler.
  let secondaryProfileSid: string | null = null;
  try {
    console.log("3. Creating Secondary Customer Profile bundle…");
    const secondaryProfile = await client.trusthub.v1.customerProfiles.create({
      friendlyName: `${BUSINESS.friendlyName} A2P Bundle`,
      email: REP.email,
      policySid,
      statusCallback: STATUS_CALLBACK,
    });
    secondaryProfileSid = secondaryProfile.sid;
    console.log(`   Secondary Profile SID: ${secondaryProfileSid}\n`);

    const businessRegNumber = BUSINESS_REGISTRATION_NUMBER!;
    console.log("4. Creating EndUser (business information)…");
    const endUserBusiness = await client.trusthub.v1.endUsers.create({
      type: "customer_profile_business_information",
      friendlyName: `${BUSINESS.friendlyName} Business`,
      attributes: {
        business_name: BUSINESS.businessName,
        business_type: BUSINESS.businessType,
        business_industry: BUSINESS.businessIndustry,
        business_identity: BUSINESS.businessIdentity,
        business_regions_of_operation: BUSINESS.businessRegionsOfOperation,
        website_url: BUSINESS.websiteUrl,
        social_media_profile_urls: BUSINESS.socialMediaProfileUrls,
        business_registration_identifier: BUSINESS.businessRegistrationIdentifier,
        business_registration_number: businessRegNumber,
      },
    });
    const endUserBusinessSid = endUserBusiness.sid;
    console.log(`   EndUser (business) SID: ${endUserBusinessSid}\n`);

    console.log("5. Creating EndUser (authorized_representative_1)…");
    const endUserRep1 = await client.trusthub.v1.endUsers.create({
      type: "authorized_representative_1",
      friendlyName: "auth_rep_1",
      attributes: {
        first_name: REP.firstName,
        last_name: REP.lastName,
        email: REP.email,
        phone_number: REP.phoneNumber,
        business_title: REP.businessTitle,
        job_position: REP.jobPosition,
      },
    });
    const endUserRep1Sid = endUserRep1.sid;
    console.log(`   EndUser (rep 1) SID: ${endUserRep1Sid}\n`);

    console.log("6. Creating EndUser (authorized_representative_2)…");
    const endUserRep2 = await client.trusthub.v1.endUsers.create({
      type: "authorized_representative_2",
      friendlyName: "auth_rep_2",
      attributes: {
        first_name: REP.firstName,
        last_name: REP.lastName,
        email: REP.email,
        phone_number: REP.phoneNumber,
        business_title: REP.businessTitle,
        job_position: REP.jobPosition,
      },
    });
    const endUserRep2Sid = endUserRep2.sid;
    console.log(`   EndUser (rep 2) SID: ${endUserRep2Sid}\n`);

    console.log("7. Creating Address…");
    const addressParams: Record<string, string> = {
      customerName: ADDRESS.customerName,
      street: ADDRESS.street,
      city: ADDRESS.city,
      region: ADDRESS.region,
      postalCode: ADDRESS.postalCode,
      isoCountry: ADDRESS.isoCountry,
    };
    if (ADDRESS.streetSecondary) addressParams.streetSecondary = ADDRESS.streetSecondary;
    const address = await client.addresses.create(addressParams);
    const addressSid = address.sid;
    console.log(`   Address SID: ${addressSid}\n`);

    console.log("8. Creating SupportingDocument (address)…");
    const supportingDoc = await client.trusthub.v1.supportingDocuments.create({
      type: "customer_profile_address",
      friendlyName: "business_address",
      attributes: { address_sids: addressSid },
    });
    const supportingDocSid = supportingDoc.sid;
    console.log(`   SupportingDocument SID: ${supportingDocSid}\n`);

    console.log("9. Assigning components to Secondary Customer Profile…");
    const objectSids = [
      endUserBusinessSid,
      endUserRep1Sid,
      endUserRep2Sid,
      primaryProfileSid,
      supportingDocSid,
    ];
    for (const objectSid of objectSids) {
      await client.trusthub.v1
        .customerProfiles(secondaryProfileSid!)
        .customerProfilesEntityAssignments.create({ objectSid });
      console.log(`   Assigned: ${objectSid}`);
    }
    console.log("");

    console.log("10. Evaluating Secondary Customer Profile…");
    const evaluation = await client.trusthub.v1
      .customerProfiles(secondaryProfileSid!)
      .customerProfilesEvaluations.create({ policySid });
    console.log(`   Evaluation SID: ${evaluation.sid}, status: ${evaluation.status}\n`);

    console.log("11. Submitting Secondary Customer Profile for review…");
    await client.trusthub.v1
      .customerProfiles(secondaryProfileSid!)
      .update({ status: "pending-review" });
    console.log("   Status set to pending-review.\n");
  } catch (err: unknown) {
    const msg = err && typeof (err as any).message === "string" ? (err as any).message : "";
    const isRestricted =
      (err as any)?.code === 400 &&
      (msg.includes("restricted via API") || msg.includes("Use Twilio Console"));
    if (isRestricted) {
      console.warn(
        "\n[provision-a2p-compliance] Trust Hub Secondary Customer Profile (direct_customer) cannot be created via API.\n" +
          "  Create it once in the Twilio Console: https://console.twilio.com/us1/develop/trust-hub/customer-profiles\n" +
          "  The 6 Messaging Services above were created successfully; use the Doppler output below.\n"
      );
    } else {
      throw err;
    }
  }

  // ── 12. Output Doppler commands ──────────────────────────────────────────
  console.log("12. Doppler secrets to set (copy and run in your Doppler project):\n");
  console.log("# A2P Sovereign SMS Router — 6 Messaging Service SIDs");
  for (const [key, sid] of Object.entries(messagingServiceSids)) {
    console.log(`doppler secrets set ${key}="${sid}"`);
  }
  console.log("");
  if (secondaryProfileSid) {
    console.log("# Trust Hub Secondary Customer Profile (for reference)");
    console.log(`# TWILIO_TRUSTHUB_SECONDARY_PROFILE_SID=${secondaryProfileSid}`);
    console.log("");
  }
  console.log("[provision-a2p-compliance] Done. Set the Doppler secrets above, then run db:push if you have not yet applied migration 0010_sms_compliance_router.");
}

main().catch((err) => {
  console.error("[provision-a2p-compliance] Fatal error:", err);
  process.exit(1);
});
