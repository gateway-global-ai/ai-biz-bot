/**
 * AgentBuilder Governed Schema — Phase 6
 *
 * The single source of truth for the AgentBuilder form payload.
 * Binds the UI form, the provision API call, and the post-provision DISC/ARCH patch.
 *
 * Architecture: The UI is a deterministic payload generator.
 *   Step 1 → identity (feeds POST /api/intelligence/provision)
 *   Step 2 → behavioral calibration (feeds PATCH /api/agents/:id after provision)
 *   Step 3 → knowledge domains (feeds agent tags / site knowledge config)
 *
 * The provision API only accepts { siteConfigId, placeTypes, businessName }.
 * DISC/ARCH overrides are applied post-provision to the primary Concierge agent.
 */
import { z } from "zod";
import { PLACES_TYPE_TO_INDUSTRY } from "./schema";
import {
  HOSPITALITY_PHASE1_CONTRACT_ID,
  EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
  ONBOARDING_PHASE1_SCHEMA_VERSION,
} from "./onboardingPhase1ContractDefinition";

// ── Industry Vertical Registry ────────────────────────────────────────────────
// Maps a human-readable vertical to the representative Google Places type
// that the provision service uses for industry detection.

export const INDUSTRY_VERTICAL_OPTIONS = [
  { label: "Restaurant / Café / Bar",      industryGroup: "food_beverage",          placeType: "restaurant"         },
  { label: "Beauty Salon / Spa / Nail",     industryGroup: "health_wellness",        placeType: "beauty_salon"       },
  { label: "Dental Office",                 industryGroup: "health_wellness",        placeType: "dentist"            },
  { label: "Medical / Health Clinic",       industryGroup: "health_wellness",        placeType: "doctor"             },
  { label: "HVAC / Home Services",          industryGroup: "home_services",          placeType: "general_contractor" },
  { label: "Plumber / Electrician",         industryGroup: "home_services",          placeType: "plumber"            },
  { label: "Auto Service / Repair",         industryGroup: "automotive",             placeType: "car_repair"         },
  { label: "Hotel / Motel / Inn",           industryGroup: "hospitality_travel",     placeType: "lodging"            },
  { label: "Retail Store",                  industryGroup: "retail",                 placeType: "store"              },
  { label: "Real Estate Agency",            industryGroup: "real_estate",            placeType: "real_estate_agency" },
  { label: "Law Firm / Accounting",         industryGroup: "professional_services",  placeType: "lawyer"             },
  { label: "Insurance Agency",              industryGroup: "professional_services",  placeType: "insurance_agency"   },
] as const;

export type VerticalPlaceType = typeof INDUSTRY_VERTICAL_OPTIONS[number]["placeType"];

// ── Canonical Knowledge Domain Tags ──────────────────────────────────────────
// These map directly to the `tags` column on knowledge_artifacts.
// Checked domains are surfaced to agents as retrievable knowledge context.

export const KNOWLEDGE_DOMAIN_OPTIONS = [
  { id: "anti_platform_doctrine",  label: "Anti-Platform Doctrine",    description: "Voice doctrine, brand positioning, sovereignty hooks" },
  { id: "product_facts",           label: "Product Facts",             description: "Pricing, features, integrations, technical specs" },
  { id: "objection_handling",      label: "Objection Handling",        description: "Common objections + structured responses" },
  { id: "voice_sales",             label: "Voice Sales Playbook",      description: "Sales engine principles, ARCH mechanics, connection principles" },
  { id: "booking_flows",           label: "Booking & Scheduling",      description: "Appointment workflows, confirmation scripts, reschedule logic" },
  { id: "customer_retention",      label: "Customer Retention",        description: "Re-engagement scripts, win-back, empathy flows" },
  { id: "billing_workflows",       label: "Billing & Payments",        description: "Invoice logic, payment links, Stripe flows" },
  { id: "local_business",          label: "Local Business Operations", description: "Hours, location, parking, local area context" },
  { id: "funnel",                  label: "Industry Funnel Payloads",  description: "Vertical-specific acquisition funnel content" },
] as const;

export type KnowledgeDomainId = typeof KNOWLEDGE_DOMAIN_OPTIONS[number]["id"];

// ── DISC schema ───────────────────────────────────────────────────────────────

export const discSchema = z.object({
  dominance:       z.number().int().min(0).max(100).default(50),
  influence:       z.number().int().min(0).max(100).default(68),
  steadiness:      z.number().int().min(0).max(100).default(72),
  conscientiousness: z.number().int().min(0).max(100).default(55),
});

export type DiscValues = z.infer<typeof discSchema>;

// ── ARCH schema ───────────────────────────────────────────────────────────────

export const archSchema = z.object({
  acknowledge:           z.number().int().min(0).max(100).default(75),
  reflect:               z.number().int().min(0).max(100).default(62),
  context:               z.number().int().min(0).max(100).default(58),
  handoff:               z.number().int().min(0).max(100).default(78),
  responseWindowSeconds: z.number().int().min(5).max(120).default(25),
});

export type ArchValues = z.infer<typeof archSchema>;

// ── Master AgentBuilder schema ────────────────────────────────────────────────

export const agentBuilderSchema = z.object({
  // Step 1: Identity Context
  siteConfigId:  z.string().min(1, "Site Config ID is required"),
  businessName:  z.string().min(2, "Business name is required").max(200),
  placeType:     z.string().min(1, "Industry vertical is required") as z.ZodType<VerticalPlaceType | string>,

  // Step 2: Behavioral Calibration
  // Defaults are Gateway Founder Voice calibration; operators may override for specific clients
  disc: discSchema,
  arch: archSchema,

  // Step 3: Knowledge Domains
  knowledgeDomains: z.array(z.string()).min(1, "Select at least one knowledge domain"),

  // Internal
  applyDiscOverride: z.boolean().default(true),
});

export type AgentBuilderPayload = z.infer<typeof agentBuilderSchema>;

// ── Provision API payload extractor ──────────────────────────────────────────

function detectIndustryGroupFromPlaceTypes(placeTypes: string[]): string {
  for (const type of placeTypes) {
    const g = PLACES_TYPE_TO_INDUSTRY[type];
    if (g) return g;
  }
  return "professional_services";
}

/** Builds POST /api/intelligence/provision body; adds admission contract for hospitality_travel. */
export function toProvisionPayload(data: AgentBuilderPayload) {
  const placeTypes = [data.placeType];
  const base = {
    siteConfigId: data.siteConfigId,
    placeTypes,
    businessName: data.businessName,
  };
  if (detectIndustryGroupFromPlaceTypes(placeTypes) === "hospitality_travel") {
    return {
      ...base,
      admissionContractId: HOSPITALITY_PHASE1_CONTRACT_ID,
      admissionContractHash: EXPECTED_HOSPITALITY_PHASE1_CONTRACT_HASH,
      admissionContractVersion: ONBOARDING_PHASE1_SCHEMA_VERSION,
    };
  }
  return base;
}

// ── Default values (Gateway Founder Voice calibration) ───────────────────────

export const AGENT_BUILDER_DEFAULTS: AgentBuilderPayload = {
  siteConfigId: "",
  businessName: "",
  placeType: "beauty_salon",
  disc: {
    dominance: 50,
    influence: 68,
    steadiness: 72,
    conscientiousness: 55,
  },
  arch: {
    acknowledge: 75,
    reflect: 62,
    context: 58,
    handoff: 78,
    responseWindowSeconds: 25,
  },
  knowledgeDomains: ["anti_platform_doctrine", "product_facts", "voice_sales"],
  applyDiscOverride: true,
};
