/**
 * vineDispatchHandler.ts
 * Handles the vine_lookup_and_dispatch tool:
 * 1. Queries the EBRSO jail roster (Socrata) for inmate custody status.
 * 2. Creates a BailRescueSession keyed by a secure token.
 * 3. Sends an urgent SMS to the outside indemnitor with a deep link to the Rescue Panel.
 */
import { storage } from "../storage";
import { db } from "../db";
import { siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendSms } from "../twilio";
import { createBailRescueSession } from "../services/bailRescueStore";

// EBRSO Jail Roster (East Baton Rouge Sheriff's Office — Socrata open data)
const EBRSO_ROSTER_URL = "https://data.brla.gov/resource/nhu6-rzwh.json";

interface EbrsoInmate {
  first_name?: string;
  last_name?: string;
  booking_date?: string;
  facility?: string;
  charges?: string;
  bail_amount?: string;
}

async function lookupEbrsoRoster(firstName: string, lastName: string): Promise<EbrsoInmate[]> {
  const encodedFirst = encodeURIComponent(firstName);
  const encodedLast  = encodeURIComponent(lastName);
  const url = `${EBRSO_ROSTER_URL}?$where=upper(first_name) like upper('%25${encodedFirst}%25') AND upper(last_name) like upper('%25${encodedLast}%25')&$limit=5`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`EBRSO API returned ${res.status}`);
  return res.json();
}

function parseBondAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const clean = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function handleVineLookupAndDispatch(args: {
  inmateFirstName: string;
  inmateLastName: string;
  outsideContactNumber: string;
  platformId?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {

  // 1. Resolve Sovereign Identity
  let siteConfigId: string | null = args._sessionSiteConfigId ?? null;
  if (!siteConfigId && args.platformId) {
    siteConfigId = await storage.getSiteConfigIdByPlatformId(args.platformId).catch(() => null);
  }

  // 2. Load sovereign overlay from knowledgeLibrary
  let knowledge: Record<string, any> = {};
  let siteUrl = "https://aaabailservices.com";
  if (siteConfigId) {
    try {
      const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
      knowledge = (site?.knowledgeLibrary as any) ?? {};
      if ((site as any)?.domain) siteUrl = `https://${(site as any).domain}`;
    } catch { /* degrade gracefully */ }
  }

  const businessName   = knowledge.sovereignIdentity?.businessName ?? "AAA Bail Services";
  const ownerName      = knowledge.sovereignIdentity?.ownerName    ?? "Bobby Rembert";
  const agencyContact  = knowledge.operationalData?.EBRSO_Prison_Info ?? "225-308-3400";
  const gracePeriod    = knowledge.operationalData?.gracePeriod ?? "180 days";
  const inmateName     = `${args.inmateFirstName} ${args.inmateLastName}`.trim();

  // 3. Query EBRSO roster for custody confirmation
  let inmates: EbrsoInmate[] = [];
  let custodyStatus: "confirmed" | "pending_verification" | "not_found" = "pending_verification";
  let facilityName = "East Baton Rouge Parish Prison";
  let bondAmount: number | null = null;

  try {
    inmates = await lookupEbrsoRoster(args.inmateFirstName, args.inmateLastName);
    if (inmates.length > 0) {
      const inmate = inmates[0];
      custodyStatus = "confirmed";
      facilityName  = inmate.facility ?? facilityName;
      bondAmount    = parseBondAmount(inmate.bail_amount);
    } else {
      custodyStatus = "not_found";
    }
  } catch (err: any) {
    console.warn("[VineDispatch] EBRSO lookup failed, proceeding:", err.message);
    custodyStatus = "pending_verification";
  }

  // 4. Calculate 12% state-mandated premium (Louisiana R.S. §22:1443)
  // Minimum premium is $120.
  const premiumCents = bondAmount !== null
    ? Math.max(Math.round(bondAmount * 0.12 * 100), 12_000)
    : null;
  const premiumDisplay = premiumCents !== null ? formatCurrency(premiumCents) : "Contact for quote";

  // 5. Create a bail rescue session (24-hour token)
  const rescueSession = createBailRescueSession({
    inmateFirstName:     args.inmateFirstName,
    inmateLastName:      args.inmateLastName,
    facilityName,
    facilityPhone:       agencyContact,
    custodyStatus,
    bondAmount,
    premiumCents,
    premiumDisplay,
    outsideContactNumber: args.outsideContactNumber,
    businessName,
    ownerName,
    agencyContact,
    siteConfigId,
  });

  const rescueUrl = `${siteUrl}/rescue/${rescueSession.token}`;

  // 6. Build the sovereign SMS message
  const bondLine = bondAmount !== null
    ? `Bond is set at $${bondAmount.toLocaleString()}. Louisiana law (12%) means the premium is ${premiumDisplay}.`
    : `Bond details are pending. An agent will confirm the amount.`;

  const smsBody = [
    `🚨 URGENT — ${businessName}`,
    `${inmateName} is in custody at ${facilityName}.`,
    bondLine,
    `Click to view details & arrange release:`,
    rescueUrl,
    `Questions? Call ${ownerName}: ${agencyContact}`,
  ].join("\n");

  // 7. Send the SMS
  let smsSent = false;
  let smsError: string | null = null;
  try {
    const toNumber = args.outsideContactNumber.replace(/\D/g, "");
    const formatted = toNumber.startsWith("1") ? `+${toNumber}` : `+1${toNumber}`;
    await sendSms(formatted, smsBody);
    smsSent = true;
    console.log(`[VineDispatch] Rescue SMS sent to ${formatted} — token: ${rescueSession.token}`);
  } catch (err: any) {
    smsError = err.message;
    console.error("[VineDispatch] SMS send failed:", err.message);
  }

  // 8. Return the multi-modal payload for the AI to read aloud
  const statusLabel = custodyStatus === "confirmed" ? "confirmed in custody"
    : custodyStatus === "not_found" ? "not found in the system (they may be processing)"
    : "pending confirmation";

  return {
    success: true,
    inmateStatus:   statusLabel,
    facilityName,
    bondAmount,
    premiumDisplay,
    gracePeriod,
    rescueToken:    rescueSession.token,
    rescueUrl,
    smsSent,
    smsError,
    outsideContact: args.outsideContactNumber,
    sovereignOverlay: {
      businessName,
      ownerName,
      agencyContact,
      legalNote: "Louisiana R.S. §22:1443 mandates a 12% non-refundable premium — no exceptions.",
    },
    // Instruct the voice AI what to say after this tool runs
    audioInstruction: smsSent
      ? `I've found ${inmateName} and they are ${statusLabel} at ${facilityName}. I just sent a text to the outside number with a secure link to arrange the bond. ${bondAmount !== null ? `The total premium will be ${premiumDisplay}. ` : ""}Tell me if there's anything else I can help with.`
      : `I found ${inmateName} at ${facilityName}. The text couldn't be sent — please have the outside contact call ${agencyContact} directly and reference this call.`,
    uiComponent: "VINE_STATUS_CARD",
    metadata: { siteConfigId, rescueToken: rescueSession.token },
  };
}
