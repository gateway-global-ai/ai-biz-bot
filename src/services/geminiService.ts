import { GoogleGenAI, FunctionDeclaration, Type, ThinkingLevel } from "@google/genai";
import { fetchSerpFlights } from "./serpApiService";

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey });

// --- TOOL DEFINITIONS ---

const recommendItemTool: FunctionDeclaration = {
  name: 'recommendItem',
  description: 'Recommends a specific item from the business inventory (menu, services, or catalog) to the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The exact name of the item (e.g., "Orecchiette alla Pugliese").' },
      description: { type: Type.STRING, description: 'A brief, sensory-rich description of the item.' },
      price: { type: Type.STRING, description: 'The price formatted with currency (e.g., "$24.00").' }
    },
    required: ['name', 'description', 'price']
  }
};

const triggerWebsiteGenerationTool: FunctionDeclaration = {
  name: 'triggerWebsiteGeneration',
  description: 'Starts the neural-network driven website creation process using Google Places data.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      placeId: { type: Type.STRING, description: 'The unique Google Place ID captured from the search session.' },
      businessName: { type: Type.STRING, description: 'The full verified name of the business.' }
    },
    required: ['placeId', 'businessName']
  }
};

const callMapsSpecialistTool: FunctionDeclaration = {
  name: 'callMapsSpecialist',
  description: 'Calls the Geography Specialist to perform grounded searches for exact locations, distances, and routes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The specific geographical or proximity query.' },
      anchor: { type: Type.STRING, description: 'The location anchor for the search (e.g., "Venetian Ballroom").' }
    },
    required: ['query', 'anchor']
  }
};

const searchSerpFlightsTool: FunctionDeclaration = {
  name: 'search_serp_flights',
  description: 'Searches for real-time flight offers using SerpAPI Google Flights.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      departure_id: { type: Type.STRING, description: 'IATA code for departure airport (e.g., JFK).' },
      arrival_id: { type: Type.STRING, description: 'IATA code for arrival airport (e.g., DXB).' },
      outbound_date: { type: Type.STRING, description: 'Departure date in YYYY-MM-DD format.' },
      return_date: { type: Type.STRING, description: 'Return date in YYYY-MM-DD format (optional).' },
      currency: { type: Type.STRING, description: 'Currency code (default: USD)' },
      travel_class: { 
        type: Type.NUMBER, 
        description: '1: Economy, 2: Premium Economy, 3: Business, 4: First' 
      }
    },
    required: ['departure_id', 'arrival_id', 'outbound_date']
  }
};

// --- RELAY & HANDOFF LOGIC ---

/**
 * RELAY FUNCTION: callMapsSpecialist
 * Orchestrates the handoff to a grounded agent to solve geographical queries
 * without breaking the Orchestrator's function-calling session.
 */
export const callMapsSpecialist = async (query: string, locationAnchor: string) => {
  console.log(`[RELAY] Initializing Maps Specialist for: ${query}`);

  const mapsSpecialist = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    generationConfig: { temperature: 0.1 } 
  });

  const specialistInstruction = `
    ROLE: You are the Geography Specialist.
    TASK: Use Google Maps Grounding to find exact locations, distances, and pedestrian routes.
    ANCHOR: All proximity searches must be relative to "${locationAnchor}".
    OUTPUT: Return a structured JSON block containing lat/lng, distance_km, and weather_summary.
  `;

  const result = await mapsSpecialist.generateContent({
    contents: [{ role: "user", parts: [{ text: query }] }],
    tools: [{ googleSearchRetrieval: {} }],
    systemInstruction: specialistInstruction,
  });

  const candidate = result.response.candidates[0];
  const part = candidate.content.parts[0];

  return {
    data: result.response.text(),
    thought_signature: candidate.thought_signature
  };
};

/**
 * MASTER ORCHESTRATOR TURN
 * Manages the primary conversation and handles tool handoffs.
 */
export const handleOrchestratorTurn = async (userMessage: string, history: any[], systemInstruction: string) => {
  const orchestrator = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    systemInstruction,
    generationConfig: {
      temperature: 0.2,
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: ThinkingLevel.HIGH,
      }
    }
  });
  
  const chat = orchestrator.startChat({
    history,
    tools: [
      { functionDeclarations: [recommendItemTool, triggerWebsiteGenerationTool, callMapsSpecialistTool, searchSerpFlightsTool] }
    ]
  });

  const result = await chat.sendMessage(userMessage);
  const candidate = result.response.candidates[0];
  const part = candidate.content.parts[0];

  // Check for tool calls
  if (part.functionCall) {
    const { name, args } = part.functionCall;
    let toolResult;

    if (name === 'callMapsSpecialist') {
      const { query, anchor } = args;
      const groundedData = await callMapsSpecialist(query, anchor);
      toolResult = groundedData.data;
    } else if (name === 'search_serp_flights') {
      toolResult = await fetchSerpFlights(args);
    }

    if (toolResult) {
      const followUp = await chat.sendMessage([{
        functionResponse: {
          name,
          response: toolResult
        },
        thought_signature: candidate.thought_signature
      }]);
      return followUp.response.text();
    }
  }

  return result.response.text();
};

/**
 * BIGQUERY LEAD SCRAPER
 * Analyzes POI data to identify premium placement opportunities.
 */
export const runLeadScraper = async (poiData: any[]) => {
  const scraper = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { temperature: 0.1 }
  });

  const systemInstruction = "ROLE: BigQuery Lead Scraper.\nTASK: Analyze geographical data and competitor POIs to identify premium placement opportunities.\nLOGIC: Filter for businesses with high proximity but low star ratings or missing services. Generate a 'Lead Score' (0-100) and suggested outreach strategy.\nOUTPUT: Return a BigQuery-ready JSON array of leads.";

  const prompt = `
    DATA: ${JSON.stringify(poiData)}
    
    TASK: Identify the top 5 leads for premium placement.
    Return a JSON array of objects with: business_name, lead_score, reasoning, and outreach_strategy.
  `;

  const result = await scraper.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction
  });

  return result.response.text();
};
