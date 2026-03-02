/**
 * fetchCityWarrantsHandler.ts
 * Queries the Baton Rouge City Court Open Data API (Socrata) for active warrants
 * and merges results with Sovereign Intelligence from the site's knowledgeLibrary.
 */
import { storage } from "../storage";
import { db } from "../db";
import { siteConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function handleFetchCityWarrants(args: {
  firstName: string;
  lastName: string;
  platformId?: string;
  _sessionSiteConfigId?: string;
}): Promise<unknown> {

  // 1. Resolve Sovereign Identity via session anchor or explicit platformId
  let siteConfigId: string | undefined = args._sessionSiteConfigId ?? undefined;

  if (!siteConfigId && args.platformId) {
    const resolved = await storage.getSiteConfigIdByPlatformId(args.platformId).catch(() => null);
    if (resolved) siteConfigId = resolved;
  }

  // 2. Fetch the 1% Information (Knowledge Library) for sovereign overlays
  let knowledge: Record<string, any> = {};
  if (siteConfigId) {
    try {
      const [site] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, siteConfigId));
      knowledge = (site?.knowledgeLibrary as any) ?? {};
    } catch {
      // Non-fatal — overlay degrades to defaults
    }
  }

  const bailPhone   = knowledge.operationalData?.City_Constable_Warrants ?? "225-389-3889";
  const ownerName   = knowledge.sovereignIdentity?.ownerName ?? "our bail specialist";
  const businessName = knowledge.sovereignIdentity?.businessName ?? "AAA Bail Services";
  const gracePeriod  = knowledge.operationalData?.gracePeriod ?? "approximately 180 days";

  // 3. Query the live Baton Rouge City Court Socrata API
  // Dataset: 3j5u-jyar — City Court open warrant data
  const baseUrl = "https://data.brla.gov/resource/3j5u-jyar.json";
  const encodedFirst = encodeURIComponent(args.firstName);
  const encodedLast  = encodeURIComponent(args.lastName);
  const queryUrl = `${baseUrl}?$where=upper(first_name) like upper('%25${encodedFirst}%25') AND upper(last_name) like upper('%25${encodedLast}%25')&$limit=10`;

  try {
    const response = await fetch(queryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Socrata API returned ${response.status}`);
    }

    const warrants: any[] = await response.json();

    // 4. Construct multi-modal payload with sovereign overlays
    return {
      success: true,
      searchTerms: { first: args.firstName, last: args.lastName },
      matchCount: warrants.length,
      warrants: warrants.map((w) => ({
        name:          `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim(),
        charge:        w.charge_description ?? "Bench Warrant — Failure to Appear",
        issueDate:     w.warrant_date ?? null,
        warrantNumber: w.warrant_number ?? "N/A",
        status:        "ACTIVE",
      })),
      sovereignOverlay: {
        disclaimer: `Live lookup from Open Data BR. Court records may take 7–10 days to reflect recent actions.`,
        actionPlan:
          warrants.length > 0
            ? `A warrant means you are subject to immediate arrest. Contact ${ownerName} at ${businessName} immediately to arrange a safe surrender and post bond before you are taken into custody. Fugitive grace period is ${gracePeriod}.`
            : `No active warrants found for that name in the Baton Rouge City Court system. If you believe a warrant exists, call the City Constable directly or contact ${businessName} for a full statewide check.`,
        agencyContact: bailPhone,
        businessName,
        ownerName,
      },
      uiComponent: "WARRANT_RESULTS_PANEL",
      metadata: { siteConfigId },
    };

  } catch (error: any) {
    console.error("[WarrantHandler] Socrata API error:", error.message);
    return {
      success: false,
      searchTerms: { first: args.firstName, last: args.lastName },
      error: `Unable to reach the Baton Rouge City Court database at this time.`,
      sovereignOverlay: {
        disclaimer: "The open data portal may be temporarily unavailable.",
        actionPlan: `Call ${businessName} directly — ${ownerName} can check manually.`,
        agencyContact: bailPhone,
        businessName,
        ownerName,
      },
      uiComponent: "WARRANT_RESULTS_PANEL",
      metadata: { siteConfigId },
    };
  }
}
