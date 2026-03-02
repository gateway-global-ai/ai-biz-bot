/**
 * seed-aaa-bail-kb.ts
 * One-shot script: finds (or creates) the AAA Bail Services site config and injects
 * the complete Sovereign Intelligence knowledge library parsed from the Website Plan.
 *
 * Run with:
 *   doppler run -- npx tsx script/seed-aaa-bail-kb.ts [optional-siteConfigId]
 */
import "dotenv/config";
import { Pool } from "pg";

// ── The full structured knowledge library ────────────────────────────────────
const AAA_BAIL_KNOWLEDGE_LIBRARY = {
  sovereignIdentity: {
    businessName:    "AAA Bail Services",
    ownerName:       "Bobby Rembert",
    licenseStatus:   "Licensed Bail Bond Producer, Louisiana Department of Insurance",
    tagline:         "South Louisiana's #1 Bail Bond Company",
    coreServiceArea: [
      "East Baton Rouge",
      "West Baton Rouge",
      "Livingston Parish",
      "Ascension Parish",
      "Iberville Parish",
    ],
    availability: "24/7 — available for jail calls, collect calls, and emergencies",
    website:      "https://www.aaabailservices.com",
  },

  sovereignTruths: [
    {
      topic: "Louisiana Bail Bond Premium — The 12% Law",
      fact:  "Louisiana Revised Statutes §22:1443 mandates that ALL bail bond companies charge exactly 12% of the total bail amount as the premium fee (minimum $120, whichever is greater). This rate is set by state law — no bondsman can legally charge more or less. The premium is 100% non-refundable, even if charges are dropped or the defendant is found not guilty.",
    },
    {
      topic: "Premium Calculation Example",
      fact:  "If bail is set at $15,000, the defendant (or co-signer) pays AAA Bail Services $1,800 (12%). AAA posts the full $15,000 bond. The $1,800 is the bondsman's fee and is not returned under any circumstance. Minimum premium is $120 regardless of bond amount.",
    },
    {
      topic: "Fugitive Grace Period — Louisiana Law",
      fact:  "Once a defendant fails to appear in court, the court issues a bench warrant and begins bond forfeiture proceedings. The surety (AAA Bail Services) has approximately 180 days from the notice of failure to appear to locate and surrender the defendant. If surrendered within this window, the forfeiture is set aside. After ~210 days total, the forfeiture becomes final and the bondsman must pay the court the full bond amount.",
    },
    {
      topic: "Bail Agent Arrest Authority — Louisiana CCP Art. 345",
      fact:  "Louisiana Code of Criminal Procedure Article 345 authorizes a licensed bail surety to arrest and surrender their bonded defendant at any time before the forfeiture is final. AAA Bail Services is legally authorized under this statute to apprehend defendants who skip court.",
    },
    {
      topic: "Bail Enforcement Licensing Requirement",
      fact:  "Louisiana does NOT have a separate 'bounty hunter' license. Anyone conducting bail enforcement in Louisiana must be a licensed bail bond producer (agent) under the Louisiana Department of Insurance. AAA Bail Services and its agents are fully licensed and compliant.",
    },
    {
      topic: "Law Enforcement Notification Before Apprehension",
      fact:  "Per Louisiana Regulation 65, bail enforcement agents MUST notify local law enforcement in the jurisdiction BEFORE attempting to apprehend a fugitive (except in exigent circumstances). When entering a private residence, agents must wear identifying clothing and announce themselves. AAA Bail Services strictly follows this protocol.",
    },
    {
      topic: "City Court vs District Court Warrants",
      fact:  "Baton Rouge has two separate warrant systems: (1) Baton Rouge City Court handles misdemeanors, traffic offenses, and city ordinance violations within city limits — warrants are executed by the City Constable's Warrant Task Force. (2) 19th Judicial District Court handles felonies for EBR Parish — warrants are handled by the East Baton Rouge Sheriff's Office (EBRSO) Warrants Division.",
    },
    {
      topic: "City Court Warrant Data Delay",
      fact:  "The City Court open-data warrant lookup (data.brla.gov) is updated daily but newly issued or cleared warrants may take 7–10 days to be reflected on the site. Always confirm through the City Constable's Office for current status.",
    },
    {
      topic: "Bond Exoneration vs Premium Refund",
      fact:  "If the defendant appears for all court dates and the case concludes, the court returns (exonerates) the bond amount to AAA Bail Services. However, the 12% premium fee is never refunded. Bond exoneration only releases the bondsman's financial obligation to the court.",
    },
    {
      topic: "Bench Warrant Consequence for Skipping Court",
      fact:  "If a defendant out on bond misses a court date, the judge immediately issues a bench warrant for their arrest and initiates bond forfeiture proceedings. The defendant will be arrested upon any contact with law enforcement. AAA Bail Services will actively pursue them within the 180-day window.",
    },
    {
      topic: "Bail Process in East Baton Rouge Step-by-Step",
      fact:  "After arrest in EBR Parish: (1) Magistrate or judge sets bail at 19th JDC (felonies) or Baton Rouge City Court (misdemeanors). (2) Family contacts AAA Bail Services 24/7. (3) Co-signer provides paperwork and pays 12% premium. (4) Bond is posted, defendant is released from EBR Parish Prison. (5) Defendant must appear for ALL court dates.",
    },
    {
      topic: "EBRSO Inmate Roster Disclaimer",
      fact:  "The EBRSO online inmate roster is updated continuously but comes with a disclaimer that information is for general purposes and may not be perfectly accurate at all times. Bond amounts on the roster may not be current. For exact bail amount and charge details, call the Parish Prison booking line at 225-308-3400 (available 24/7).",
    },
    {
      topic: "VINE Network — Statewide Custody Lookup",
      fact:  "Louisiana participates in the VINE network (Victim Information and Notification Everyday) at vinelink.vine.com, allowing anyone to search for an offender's custody status statewide and register for release alerts. For East Baton Rouge specifically, the EBRSO inmate list is the most direct tool.",
    },
    {
      topic: "Co-Signer (Indemnitor) Responsibilities",
      fact:  "When a co-signer signs a bail bond contract with AAA Bail Services, they become financially liable if the defendant skips court. The co-signer may owe AAA Bail Services for any fugitive recovery costs, court-ordered payments, and potentially the full bond amount. Co-signers have the right to request the defendant be surrendered back to jail if they are concerned about non-appearance.",
    },
    {
      topic: "Payment and Operations",
      fact:  "AAA Bail Services accepts various payment methods for the bail premium. Payment plans may be available. We operate 24 hours a day, 7 days a week, 365 days a year — including nights, weekends, and holidays. Service area covers East Baton Rouge, West Baton Rouge, Livingston, Ascension, and Iberville parishes.",
    },
  ],

  operationalData: {
    // Primary contacts
    EBRSO_Prison_Inmate_Info:      "225-308-3400 (24/7 Booking Information Line — exact bail amount and charges)",
    EBRSO_Main_Number:             "225-389-5000",
    Parish_Prison_Main:            "225-355-3311",
    City_Constable_Warrants:       "225-389-3889 (City Court Warrant Task Force)",
    EBRSO_Warrants_Division:       "225-389-5000 ext Warrants",

    // Municipal police (for local warrant coordination)
    Zachary_PD:                    "225-654-9393",
    Baker_PD:                      "225-775-6000",

    // Key URLs
    EBRSO_Warrant_Portal:          "https://www.ebrso.org/services/ (requires free account)",
    EBRSO_Inmate_Roster:           "https://www.ebrso.org/resources/prison-inmate-list-disclaimer/",
    City_Court_Warrant_Lookup:     "https://data.brla.gov/Public-Safety/City-Court-Warrants/3j5u-jyar",
    City_Court_Warrant_API:        "https://data.brla.gov/resource/3j5u-jyar.json",
    EBRSO_Roster_API:              "https://data.brla.gov/resource/nhu6-rzwh.json",
    VINE_Statewide_Lookup:         "https://vinelink.vine.com (statewide custody status & notifications)",
    Louisiana_DOI_Regulation_65:   "https://ldi.la.gov/docs/default-source/documents/legaldocs/Regulations/Reg65-Cur-BailBondLicensingReq",
    Louisiana_Statute_22_1443:     "https://legis.la.gov/Legis/Law.aspx?d=508385",
    AAA_Bail_Website:              "https://www.aaabailservices.com",

    // Court info
    Court_Felonies:                "19th Judicial District Court (East Baton Rouge Parish felonies)",
    Court_Misdemeanors:            "Baton Rouge City Court (misdemeanors, traffic, city ordinance violations)",

    // Operational parameters
    gracePeriod:                   "Approximately 180–210 days from notice of failure to appear before forfeiture is final",
    premiumRate:                   "12% of total bail amount (minimum $120) per Louisiana R.S. §22:1443 — non-refundable",
    servicedParishes:              "East Baton Rouge, West Baton Rouge, Livingston, Ascension, Iberville",
    availability:                  "24/7/365 — nights, weekends, holidays",
  },

  requiredTools: [
    {
      toolName:      "fetch_city_warrants",
      description:   "Searches the official Baton Rouge City Court open-data database (data.brla.gov dataset 3j5u-jyar) for active warrants by first and last name.",
      uiComponent:   "WARRANT_RESULTS_PANEL",
      dataset:       "3j5u-jyar",
      apiUrl:        "https://data.brla.gov/resource/3j5u-jyar.json",
    },
    {
      toolName:      "fetch_ebrso_inmates",
      description:   "Searches the EBRSO public jail roster for current inmates by name. Returns booking date, charges, and bail amount if available. Fallback: call 225-308-3400.",
      uiComponent:   "INMATE_STATUS_CARD",
      dataset:       "nhu6-rzwh",
      apiUrl:        "https://data.brla.gov/resource/nhu6-rzwh.json",
      fallbackPhone: "225-308-3400",
    },
    {
      toolName:      "vine_lookup_and_dispatch",
      description:   "Looks up inmate custody status and dispatches an urgent SMS to the outside indemnitor with a deep link to the Bail Rescue Panel to arrange payment.",
      uiComponent:   "VINE_STATUS_CARD",
    },
  ],

  faqAnswers: {
    "how much does a bail bond cost":
      "In Louisiana, state law (R.S. §22:1443) sets the bail bond premium at exactly 12% of your total bail amount — minimum $120. So if bail is $10,000, you pay $1,200 to Bobby Rembert and we post the full $10,000. That fee is non-refundable.",
    "is the premium refundable":
      "No. The 12% premium is earned the moment the bond is posted and is non-refundable under Louisiana law, even if charges are later dropped or the defendant is found not guilty.",
    "what happens if i miss court":
      "The judge will immediately issue a bench warrant for your arrest. AAA Bail Services will actively pursue you — we have 180 days before the full bond is forfeited to the court. Contact us immediately if you miss a date; we can help arrange a safe surrender and possibly have the warrant recalled.",
    "can you bail someone out at 3am":
      "Yes. AAA Bail Services is available 24/7/365. Call Bobby Rembert any time — jail doesn't keep business hours and neither do we.",
    "how do i find out if someone is in jail in baton rouge":
      "Use the EBRSO online inmate roster at ebrso.org, or call the Parish Prison booking information line at 225-308-3400 (available 24/7). You can also ask me to search the roster for you right now.",
    "how do i check for a warrant":
      "For City Court warrants (misdemeanors, traffic): I can search data.brla.gov for you right now. For EBRSO/District Court warrants (felonies): use the EBRSO Citizen Portal at ebrso.org or call 225-389-5000.",
    "what areas do you serve":
      "AAA Bail Services serves East Baton Rouge, West Baton Rouge, Livingston, Ascension, and Iberville parishes. Bobby Rembert and our team are available 24/7 across all these areas.",
    "what is a co-signer":
      "A co-signer (indemnitor) is someone who signs the bail bond contract alongside the defendant and becomes financially responsible if the defendant skips court. The co-signer may owe AAA Bail Services for recovery costs and potentially the full bond amount.",
    "can i get a refund if charges are dropped":
      "No. Once a bail bond is posted, the 12% premium is earned and cannot be refunded under Louisiana law (R.S. §22:1443), even if charges are dismissed, the case is dropped, or the defendant is found not guilty.",
    "how long does it take to get someone out":
      "After you contact us and we process the paperwork and payment, release typically takes 1–4 hours depending on jail processing times. We work quickly to get your loved one out as fast as possible.",
  },

  _ingestedAt:   new Date().toISOString(),
  _ingestedFrom: "AAA Bail Services Website Plan — Louisiana Bail Laws & EBR Resources (2025)",
  _version:      "2.0.0",
};

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Find by name first
    const search = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM site_configs WHERE name ILIKE '%AAA Bail%' OR name ILIKE '%bail service%' OR name ILIKE '%Bobby Rembert%' LIMIT 5`
    );

    const cliId = process.argv[2] ?? null;

    let siteConfigId: string;

    if (cliId) {
      console.log(`\n🎯 Using CLI-provided siteConfigId: ${cliId}`);
      siteConfigId = cliId;
    } else if (search.rows.length > 0) {
      const row = search.rows[0];
      console.log(`\n✅ Found existing site config: ${row.name}  (id: ${row.id})`);
      siteConfigId = row.id;
    } else {
      // Create the site config using only columns that exist in the live DB
      // First detect which columns are present to avoid migration mismatches
      const colCheck = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'site_configs' ORDER BY ordinal_position`
      );
      const cols = new Set(colCheck.rows.map((r) => r.column_name));
      console.log(`\n⚡ AAA Bail Services not found — creating site config…`);
      console.log(`   Available columns: ${[...cols].join(", ")}`);

      const insertCols: string[] = ["name", "plan"];
      const insertVals: any[]    = ["AAA Bail Services", "pro"];

      if (cols.has("agent_config")) {
        insertCols.push("agent_config");
        insertVals.push(JSON.stringify({ agentName: "Bail Agent", personality: "urgent and empathetic bail bond specialist" }));
      }

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(", ");
      const result = await pool.query<{ id: string; name: string }>(
        `INSERT INTO site_configs (${insertCols.join(", ")}) VALUES (${placeholders}) RETURNING id, name`,
        insertVals
      );

      siteConfigId = result.rows[0].id;
      console.log(`   ✅ Created: ${result.rows[0].name}  (id: ${siteConfigId})`);
    }

    await injectKnowledge(pool, siteConfigId);

  } finally {
    await pool.end();
  }
}

async function injectKnowledge(pool: Pool, siteConfigId: string) {
  // Load existing library
  const existing = await pool.query<{ knowledge_library: any }>(
    `SELECT knowledge_library FROM site_configs WHERE id = $1`,
    [siteConfigId]
  );

  const existingLib = existing.rows[0]?.knowledge_library ?? {};

  // Deep merge (new data wins on scalar keys, arrays merged by key)
  const merged = {
    ...existingLib,
    ...AAA_BAIL_KNOWLEDGE_LIBRARY,
    sovereignTruths: mergeByKey("topic",    existingLib.sovereignTruths ?? [], AAA_BAIL_KNOWLEDGE_LIBRARY.sovereignTruths),
    operationalData: { ...(existingLib.operationalData ?? {}), ...AAA_BAIL_KNOWLEDGE_LIBRARY.operationalData },
    requiredTools:   mergeByKey("toolName", existingLib.requiredTools   ?? [], AAA_BAIL_KNOWLEDGE_LIBRARY.requiredTools),
    faqAnswers:      { ...(existingLib.faqAnswers ?? {}), ...AAA_BAIL_KNOWLEDGE_LIBRARY.faqAnswers },
  };

  await pool.query(
    `UPDATE site_configs SET knowledge_library = $1 WHERE id = $2`,
    [JSON.stringify(merged), siteConfigId]
  );

  console.log(`\n🧠 Knowledge library injected → ${siteConfigId}`);
  console.log(`   Business:         ${merged.sovereignIdentity.businessName}`);
  console.log(`   Sovereign Truths: ${merged.sovereignTruths.length}`);
  console.log(`   Operational Keys: ${Object.keys(merged.operationalData).length}`);
  console.log(`   Required Tools:   ${merged.requiredTools.length}`);
  console.log(`   FAQ Entries:      ${Object.keys(merged.faqAnswers).length}`);
  console.log(`\n   Site Config ID (use this for the jail webhook):   ${siteConfigId}`);
}

function mergeByKey<T extends Record<string, any>>(key: string, existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((t) => [t[key], t]));
  for (const t of incoming) map.set(t[key], t);
  return [...map.values()];
}

main().catch((err) => {
  console.error("Fatal error:", err.message ?? err);
  process.exit(1);
});
