/**
 * parsePlanService.ts
 * Uses the Gemini API to parse a free-text "Website Plan" document into
 * a structured knowledgeLibrary JSON that gets merged into site_configs.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedPlan {
  sovereignIdentity: {
    businessName: string;
    ownerName?: string;
    licenseStatus?: string;
    coreServiceArea?: string[];
  };
  sovereignTruths: Array<{
    topic: string;
    fact: string;
  }>;
  operationalData: Record<string, string>;
  requiredTools: Array<{
    toolName: string;
    description: string;
    uiComponent?: string;
  }>;
}

const SOVEREIGN_MAPPER_PROMPT = `You are the Sovereign Architecture Mapper. The user has provided a "Website Plan" for a local business.

Extract this data and output a single valid JSON object with exactly these four root keys:

1. "sovereignIdentity" — object containing: businessName (string), ownerName (string or null), licenseStatus (string or null), coreServiceArea (array of strings).

2. "sovereignTruths" — array of objects with "topic" (string) and "fact" (string). Each entry must capture a law, fixed price, legal constraint, or strict policy that the AI MUST know verbatim. Focus on the 1% information that differentiates this business (e.g., "12% non-refundable bail premium per Louisiana R.S. §22:1443").

3. "operationalData" — flat key-value object where each key is a descriptive label and each value is a contact number, URL, or operational fact. Example: {"EBRSO_Booking_Line": "225-308-3400", "gracePeriod": "180 days"}.

4. "requiredTools" — array of objects with "toolName" (snake_case string), "description" (string), and "uiComponent" (SCREAMING_SNAKE_CASE string for the React panel). Only include tools that require live data lookups (warrants, inmate search, scheduling, inventory, etc.).

Output ONLY the raw JSON object. No markdown fences. No commentary.`;

export async function parseWebsitePlan(planText: string): Promise<ParsedPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const modelId = process.env.GEMINI_MODEL_ID ?? "models/gemini-2.5-flash-native-audio-preview-12-2025";
  // For text-only tasks, use GEMINI_MODEL_FALLBACK; the voice/native-audio model cannot do generateContent
  const textModelId = (modelId.includes("native-audio") || modelId.includes("live"))
    ? (process.env.GEMINI_MODEL_FALLBACK || (console.error('[GOVERNANCE] GEMINI_MODEL_FALLBACK not set in Doppler'), "gemini-2.0-flash"))
    : modelId;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: textModelId,
    systemInstruction: SOVEREIGN_MAPPER_PROMPT,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(planText);
  const rawText = result.response.text().trim();

  // Strip accidental markdown fences if the model wraps the output anyway
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: ParsedPlan;
  try {
    parsed = JSON.parse(cleaned) as ParsedPlan;
  } catch {
    throw new Error("Gemini returned non-JSON output. Raw: " + cleaned.slice(0, 300));
  }

  // Defensive normalization
  parsed.sovereignTruths   = Array.isArray(parsed.sovereignTruths)   ? parsed.sovereignTruths   : [];
  parsed.requiredTools     = Array.isArray(parsed.requiredTools)      ? parsed.requiredTools     : [];
  parsed.operationalData   = parsed.operationalData && typeof parsed.operationalData === "object"
    ? parsed.operationalData
    : {};
  parsed.sovereignIdentity = parsed.sovereignIdentity ?? { businessName: "Unknown Business" };

  return parsed;
}
