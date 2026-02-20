import type { Agent, BusinessData } from "../types";
import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";

export const recommendItemTool: FunctionDeclaration = {
  name: "recommendItem",
  description:
    "Recommends a specific item from the menu, services catalog, or product list to the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      price: { type: Type.STRING },
    },
    required: ["name", "description", "price"],
  },
};

export const searchBusinessTool: FunctionDeclaration = {
  name: "searchBusiness",
  description: "Searches for a business on Google Maps using a search query.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The business name or website." },
    },
    required: ["query"],
  },
};

export const triggerWebsiteGenerationTool: FunctionDeclaration = {
  name: "triggerWebsiteGeneration",
  description: "Starts the website creation process.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      placeId: { type: Type.STRING, description: "The Google Place ID." },
    },
    required: ["placeId"],
  },
};

/** Gemini `tools` array shape used in both `ai.chats.create` and `ai.live.connect`. */
export type GeminiToolsArray = Array<{ functionDeclarations: FunctionDeclaration[] }>;

export function getToolsForAgent(agent: Agent, businessData: BusinessData): GeminiToolsArray {
  // In platform/onboarding mode, owner agent needs maps tools.
  // In generated mode, keep the tools available but the prompt rules should prevent false claims.
  if (agent.roleType === "owner") {
    return [{ functionDeclarations: [searchBusinessTool, triggerWebsiteGenerationTool] }];
  }

  // Customer concierge
  return [{ functionDeclarations: [recommendItemTool] }];
}

