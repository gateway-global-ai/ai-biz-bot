import { GoogleGenAI } from "@google/genai";
import { TravelPackage } from "../types";

// Note: In a real deployment, the key should come from a secure backend or env variable.
// Using process.env.API_KEY as per instructions.
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const getTravelAdvice = async (
  userMessage: string, 
  currentPackage: TravelPackage, 
  history: {role: 'user' | 'model', text: string}[]
): Promise<string> => {
  if (!apiKey) {
    return "I'm sorry, I can't connect to the AI service right now (Missing API Key).";
  }

  const model = "gemini-2.5-flash";
  
  const systemInstruction = `You are an expert travel agent for 'PideaAI Travel', specializing in the Winter Olympics 2026 in Italy.
  
  Current Context:
  The user is looking at the package: "${currentPackage.name}".
  Description: ${currentPackage.description}
  Duration: ${currentPackage.duration}
  
  Your goal is to answer questions about the itinerary, provide travel hacking tips (credit card points, train passes), and generate excitement about the Italian venues (Milan, Cortina, Verona).
  Keep answers concise, helpful, and professional but enthusiastic.
  `;

  try {
    // Construct chat history for context
    const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: chatHistory
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble retrieving that information right now. Please try again later.";
  }
};