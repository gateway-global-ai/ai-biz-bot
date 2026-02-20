

import { GroundingMetadata } from "@google/genai";
import { Coordinates, Message, TripFocus } from "../types";

const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL_NAME = "gemini-3.0-flash";

function getApiKey(): string {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("API_KEY or GEMINI_API_KEY not configured");
  return key;
}

export const sendMessageToGemini = async (
  history: Message[],
  userLocation: Coordinates | null,
  tripFocus: TripFocus | null,
  userPhoneNumber?: string | null,
  previousInteractionId?: string | null
): Promise<{ text: string; groundingMetadata?: GroundingMetadata; interactionId?: string | null }> => {
  try {
    const lastUserMessage = history[history.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== "user") {
      throw new Error("Invalid history state");
    }

    const apiKey = getApiKey();
    const toolConfig: Record<string, unknown> = {};
    if (userLocation) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      };
    }

    let systemInstruction = `You are "NurseNest", a specialized AI housing coordinator for traveling nurses.
    Your mission is to find the perfect extended-stay accommodation near their hospital assignment.

    *** INTERACTION PROTOCOL - FOLLOW STRICTLY ***

    PHASE 1: ANCHORING (When user sets a location/hospital)
    1. Acknowledge the location.
    2. **STOP.** Do NOT list hotels yet. It is impersonal to dump results immediately.
    3. Ask narrowing questions first:
       - "How close would you like to be to the hospital?"
       - "Will you have a car, or will you be using Uber/Lyft (rideshare), walking, or public transit?" (Crucial for determining amenities)
       - "Do you have a specific budget or specific needs like a full kitchen?"

    PHASE 2: RECOMMENDATION (Only after preferences are clear)
    1. Use googleMaps to find options based on the criteria.
    2. **STRICT RESULT LIMIT:** You must NEVER show more than 2 results at a time. This is critical to avoid overwhelming the user.
    3. **MANDATORY DISTANCE & COMMUTE CONTEXT:** 
       - For EVERY result, you MUST explicitly state the approximate distance AND travel time from the Trip Anchor${tripFocus ? ` ("${tripFocus.name}")` : ''}.
       - **Calculation Rule:** If the user has specified a transport mode (or if you know it), calculate time based on that mode (e.g., "5 min drive", "15 min walk", "10 min Uber ride"). If unknown, give driving time.
    4. **PRIORITIZE:** Present the **#1 Highest Rated/Best Fit** option first.
       - Format: "The top recommendation is [Name]. It is rated [Rating]. It is a [Time] [Mode] from your hospital."
    5. Mention others exist: "I have other options if this doesn't fit."
    6. **SAVE SUGGESTION:** Remind them they can click "Save" on the map cards to add hotels to their comparison list in the notes.

    PHASE 3: LIFESTYLE CHECK (Mandatory Follow-up)
    - Immediately after presenting a housing option, ask:
      "Would you like me to take a look at nearby gyms, grocery stores, or coffee shops to see what's nearby?"
    - Contextualize this: "Since you are [Transport Mode], I can check for things within [Distance]."

    GENERAL RULES:
    - Persona: Empathetic, efficient, professional.
    - Focus on "Safety", "Quiet", "Blackout curtains", "Commute time".
    - If the user speaks a language other than English, reply in that language.`;

    if (userPhoneNumber) {
        systemInstruction += `\n\nUSER CONTEXT: Verified Phone: ${userPhoneNumber}. Assure them their profile is linked if they call support.`;
    }

    if (tripFocus) {
        systemInstruction += `\n\nCURRENT TRIP ANCHOR: The user is assigned to: "${tripFocus.name}" (${tripFocus.type}).`;
        if (tripFocus.transportMode) {
             systemInstruction += `\nTRANSPORT MODE: The user is traveling by: ${tripFocus.transportMode.toUpperCase()}. Calculate all travel times based on this mode.`;
             if (tripFocus.transportMode === 'walking') systemInstruction += ` Prioritize safety and sidewalks.`;
             if (tripFocus.transportMode === 'rideshare') systemInstruction += ` User is using Uber/Lyft. Calculate driving times but mention "ride".`;
        }
        
        systemInstruction += `\nCRITICAL INSTRUCTION:
        For EVERY location recommendation you provide, you MUST calculate and state the approximate travel time from the Trip Anchor ("${tripFocus.name}") using the mode: ${tripFocus.transportMode || "Driving"}.`;
    }

    const body: Record<string, unknown> = {
      model: MODEL_NAME,
      system_instruction: systemInstruction,
      tools: [{ googleMaps: {} }],
      generation_config: { max_output_tokens: 2048, temperature: 0.8 },
    };
    if (Object.keys(toolConfig).length > 0) {
      body.tool_config = toolConfig;
    }

    if (previousInteractionId) {
      body.previous_interaction_id = previousInteractionId;
      body.input = lastUserMessage.text;
    } else {
      body.input = history.map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));
    }

    const res = await fetch(INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Interactions API error:", res.status, errText);
      throw new Error("Gemini API request failed");
    }

    const data = (await res.json()) as {
      id?: string;
      outputs?: Array<{ type: string; text?: string; annotations?: unknown; groundingMetadata?: GroundingMetadata }>;
      groundingMetadata?: GroundingMetadata;
    };
    const outputs = data.outputs ?? [];
    const textOutput = outputs.find((o) => o.type === "text");
    const text = textOutput?.text?.trim() || "I couldn't find that information.";
    const groundingMetadata =
      data.groundingMetadata ?? (textOutput as { groundingMetadata?: GroundingMetadata })?.groundingMetadata;

    return {
      text,
      groundingMetadata,
      interactionId: data.id ?? previousInteractionId ?? null,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "I'm having trouble connecting to my travel database right now. Please try again in a moment.",
    };
  }
};