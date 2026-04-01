/**
 * A2P industry and campaign template types and helpers.
 * Phase 2 (A3) will move these to client/src/lib/a2pTemplates.ts.
 */

export type IndustryType =
  | "hospitality"
  | "healthcare"
  | "retail"
  | "technology"
  | "financial"
  | "real_estate"
  | "default";

export interface ChannelTemplate {
  useCase: string;
  sampleMessage: string;
  description?: string;
}

export interface CampaignTemplates {
  verification?: ChannelTemplate;
  customer_engagement?: ChannelTemplate;
  retention?: ChannelTemplate;
  sales?: ChannelTemplate;
}

export interface LinkCard {
  title?: string;
  imageSrc?: string;
  items?: Array<{ label: string; value?: string }>;
  cta?: string;
}

export function generateCampaignTemplates(
  companyName: string,
  industry: IndustryType
): CampaignTemplates {
  const templates: Record<IndustryType, CampaignTemplates> = {
    real_estate: {
      verification: {
        useCase: "2FA",
        description: "Identity verification for portal access, document signing, showing confirmation",
        sampleMessage: `${companyName}: Your showing confirmation code is 8472. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "ACCOUNT_NOTIFICATION",
        description: "New listing alerts, showing confirmations, offer status updates",
        sampleMessage: `New listing in your area: 4521 Oak St. 3br/2ba. Schedule a tour? Reply STOP to unsubscribe.`,
      },
      retention: {
        useCase: "MARKETING",
        description: "Home anniversary messages, equity reports, neighborhood market updates, referral ask",
        sampleMessage: `Happy home anniversary! Your estimated equity: $42,000. Want a free market report? Reply STOP to opt out.`,
      },
      sales: {
        useCase: "MARKETING",
        description: "Free home valuation CTA, open house invitations, market report delivery",
        sampleMessage: `Get your free home valuation from ${companyName}. This weekend's open house: 890 Pine Ave. Reply STOP to unsubscribe.`,
      },
    },
    hospitality: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your booking code is 1234. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "ACCOUNT_NOTIFICATION",
        sampleMessage: `Your reservation at ${companyName} is confirmed. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Thank you for staying with us. Book again and save 10%. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `Special offer at ${companyName} this week. Reply STOP to unsubscribe.`,
      },
    },
    healthcare: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your verification code is 5678. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "ACCOUNT_NOTIFICATION",
        sampleMessage: `Appointment reminder from ${companyName}. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Health tips from ${companyName}. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `New services at ${companyName}. Reply STOP to unsubscribe.`,
      },
    },
    retail: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your code is 9012. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "DELIVERY_NOTIFICATION",
        sampleMessage: `Your order has shipped. Track at example.com. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Member exclusive: 15% off at ${companyName}. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `Flash sale at ${companyName} today. Reply STOP to unsubscribe.`,
      },
    },
    technology: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your login code is 3456. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "ACCOUNT_NOTIFICATION",
        sampleMessage: `Your account alert from ${companyName}. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Product updates from ${companyName}. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `New feature available at ${companyName}. Reply STOP to unsubscribe.`,
      },
    },
    financial: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your verification code is 7890. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "FRAUD_ALERT",
        sampleMessage: `Security notice from ${companyName}. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Financial insights from ${companyName}. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `Rate update from ${companyName}. Reply STOP to unsubscribe.`,
      },
    },
    default: {
      verification: {
        useCase: "2FA",
        sampleMessage: `${companyName}: Your code is 0000. Reply STOP to opt out.`,
      },
      customer_engagement: {
        useCase: "ACCOUNT_NOTIFICATION",
        sampleMessage: `Notification from ${companyName}. Reply STOP to opt out.`,
      },
      retention: {
        useCase: "MARKETING",
        sampleMessage: `Update from ${companyName}. Reply STOP to unsubscribe.`,
      },
      sales: {
        useCase: "MARKETING",
        sampleMessage: `Offer from ${companyName}. Reply STOP to unsubscribe.`,
      },
    },
  };
  return templates[industry] ?? templates.default;
}

const REAL_ESTATE_KEYWORDS = [
  "real estate",
  "realty",
  "realtor",
  "brokerage",
  "property management",
  "homes",
  "listing",
];

export function mapIndustryToKey(raw: string): IndustryType {
  const lower = (raw || "").toLowerCase().trim();
  if (REAL_ESTATE_KEYWORDS.some((k) => lower.includes(k))) return "real_estate";
  if (lower.includes("hotel") || lower.includes("hospitality") || lower.includes("lodging"))
    return "hospitality";
  if (lower.includes("health") || lower.includes("medical")) return "healthcare";
  if (lower.includes("retail") || lower.includes("store")) return "retail";
  if (lower.includes("tech") || lower.includes("software")) return "technology";
  if (lower.includes("financial") || lower.includes("bank") || lower.includes("insurance"))
    return "financial";
  return "default";
}

export const realEstateLinkCard: LinkCard = {
  title: "Featured listings",
  imageSrc: "/placeholder-property.jpg",
  items: [
    { label: "123 Oak St", value: "3br · 2ba · $425,000" },
    { label: "456 Pine Ave", value: "4br · 3ba · $589,000" },
    { label: "789 Maple Dr", value: "2br · 2ba · $325,000" },
  ],
  cta: "View All Listings",
};
