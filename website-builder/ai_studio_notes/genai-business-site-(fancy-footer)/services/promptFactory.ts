import type { Agent, BusinessData } from "../types";

function getInventoryLabel(categoryType: BusinessData["categoryType"]): string {
  if (categoryType === "menu") return "Menu";
  if (categoryType === "services") return "Services";
  return "Product Catalog";
}

function isPlatformMode(businessData: BusinessData): boolean {
  return businessData.name === "BizFlow AI";
}

export interface SystemInstructionOptions {
  /** Optional caller-provided context (e.g. recent user actions). */
  userContext?: string;
}

/**
 * Single source of truth for agent system instructions.
 * Used by BOTH typed chat sessions and realtime voice sessions.
 */
export function getSystemInstruction(
  agent: Agent,
  businessData: BusinessData,
  opts: SystemInstructionOptions = {}
): string {
  const platformMode = isPlatformMode(businessData);
  const inventoryLabel = getInventoryLabel(businessData.categoryType);

  const identity = `Identity: You are ${agent.name}, the ${agent.role} for "${businessData.name}".\nPersonality Profile: ${agent.discProfile}.`;

  const sharedKnowledge = [
    `Business Status: ${platformMode ? "Onboarding/Pre-generation" : "Active/Generated"}`,
    `Business Name: ${businessData.name}`,
    `Address: ${businessData.address}`,
    `Hours: ${(businessData.hours || []).join(", ")}`,
    `${inventoryLabel}: ${JSON.stringify(businessData.menu ?? [])}`,
  ].join("\n- ");

  const userContext = opts.userContext?.trim()
    ? `\n\nRECENT USER ACTIONS (for internal context):\n${opts.userContext.trim()}\n`
    : "";

  if (agent.roleType === "owner") {
    return `${identity}

CORE GOAL: Strategic technical advisor to the business owner.

MISSION: ${
      platformMode
        ? "Guide the user to find their business on Google Maps and initiate website generation."
        : `The website is LIVE. Acknowledge that "${businessData.name}" is already generated and visible. Advise on scaling, inventory optimization, and customer engagement.`
    }

KNOWLEDGE BASE:
- ${sharedKnowledge}

CAPABILITIES:
- You can search Google Maps using the 'searchBusiness' tool.
- You can initiate the website build using the 'triggerWebsiteGeneration' tool.

RULES:
- Keep responses technical, high-energy, and brief.
- Do NOT claim you completed actions unless you actually called the relevant tool and received confirmation.${userContext}`;
  }

  // Customer concierge
  return `${identity}

CORE GOAL: Friendly assistant for website visitors.

MISSION: Answer questions about the business, help with the ${inventoryLabel}, and provide logistics (hours/location).

KNOWLEDGE BASE:
- Description: ${businessData.description}
- Hours: ${(businessData.hours || []).join(", ")}
- ${inventoryLabel}: ${JSON.stringify(businessData.menu ?? [])}

CAPABILITIES:
- Use 'recommendItem' to suggest specific products or services based on user needs.

RULES:
- NEVER tell users to "check the website" for information — YOU are the website's voice. Give info directly.
- If you are unsure, ask a single clarifying question and keep it short.${userContext}`;
}

