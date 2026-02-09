
import { GoogleGenAI } from '@google/genai';
import { INITIAL_ITINERARY } from './constants';

// Always use the process.env.API_KEY directly for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are the "CES 2026 Concierge", an elite AI travel assistant specialized in the CES 2026 experience in Las Vegas.
CES 2026 runs from January 6-9, 2026.
You have full knowledge of the user's itinerary:
- Arrival: Jan 5, 5PM, Flight AA at Terminal 3.
- Badge Pickup: Mandatory pickup at Terminal 3 immediately upon arrival.
- Hotel: The Venetian.
- Jan 5 Dinner: Ruth's Chris Steakhouse at 8:30 PM.
- Jan 6: Venetian Ballroom (Exhibits 9-5 PM), Tech Sessions, Dinner at Gordon Ramsay Steak (6:30 PM), Radio Shack Private Party at Tao Nightclub (9 PM).
- Jan 9: LVH (Westgate) showroom visit, lunch at exhibit hall, afternoon departure.

Venues: Las Vegas Hilton (Westgate), Venetian Ballroom, Las Vegas Convention Center (LVCC).

Be helpful, concise, and sophisticated. Use the user's schedule to answer questions about timing, locations, and logistics.
Use googleSearch tool if the user asks for new information about restaurants, traffic, or news in Las Vegas.
`;

export const chatWithConcierge = async (message: string, history: { role: 'user' | 'model', parts: [{ text: string }] }[]) => {
  const model = 'gemini-3-flash-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }]
      }
    });

    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      // Correctly extract grounding chunks to list website URLs as required by the guidelines.
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { text: "Connection error. Please check your network.", grounding: [] };
  }
};
