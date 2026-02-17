
import { GoogleGenAI } from "@google/genai";
import { BusinessData, Review, Agent, InventoryType } from "../types";
import { getSystemInstruction } from "./promptFactory";
import { getToolsForAgent } from "./toolRegistry";

// Always initialize GoogleGenAI with a named apiKey parameter from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enrichBusinessData = async (placeData: any): Promise<BusinessData> => {
  if (!process.env.API_KEY) throw new Error("API Key not found");

  const model = "gemini-3-flash-preview";
  const types = placeData.types || [];
  
  let categoryType: InventoryType = 'catalog';
  if (types.some((t: string) => ['restaurant', 'food', 'cafe', 'bar', 'bakery'].includes(t))) {
    categoryType = 'menu';
  } else if (types.some((t: string) => ['beauty_salon', 'hair_care', 'spa', 'dentist', 'doctor', 'physiotherapist'].includes(t))) {
    categoryType = 'services';
  }

  const minimalData = {
    name: placeData.name,
    address: placeData.formatted_address,
    website: placeData.website,
    rating: placeData.rating,
    reviews: placeData.reviews?.slice(0, 5).map((r: any) => r.text) || [],
    types: types,
  };

  const prompt = `
    I have the following raw data from Google Places for a business:
    ${JSON.stringify(minimalData)}

    I am generating a modern website for this business.
    
    TASKS:
    1. Write a catchy, modern "tagline".
    2. Write a professional, engaging "description" (2-3 sentences).
    3. Generate 3-5 "insights" or highlights about the business.
    4. SEARCH for 5 top-rated restaurants near "${minimalData.address}" (excluding the business itself).
    5. SEARCH for 5 top-rated activities (parks, museums, entertainment, shopping) near "${minimalData.address}".
    6. Generate a full "inventory" of items.
       - If it's a RESTAURANT: Generate a structured MENU.
       - If it's a SALON/SERVICE PROVIDER: Generate a list of SERVICES.
       - If it's RETAIL/STORE: Generate a PRODUCT CATALOG.
       The inventory should have 3-4 categories and 4-5 items per category with real-sounding names, descriptions, and prices.
    
    OUTPUT FORMAT:
    Return a STRICT JSON object inside a markdown code block ( \`\`\`json ... \`\`\` ).
    The JSON must match this structure:
    {
      "tagline": "string",
      "description": "string",
      "insights": ["string", "string"],
      "nearbyRestaurants": [
        { "name": "string", "type": "string", "summary": "string", "rating": number, "location": "string" }
      ],
      "nearbyActivities": [
        { "name": "string", "type": "string", "summary": "string", "rating": number, "location": "string" }
      ],
      "inventory": [
        { "category": "string", "items": [{ "name": "string", "description": "string", "price": "string" }] }
      ]
    }
  `;

  let images: string[] = [];
  if (placeData.photos && placeData.photos.length > 0) {
    images = placeData.photos.map((photo: any) => {
      if (typeof photo.getUrl === 'function') {
        return photo.getUrl({ maxWidth: 1200, maxHeight: 1200 });
      }
      return null;
    }).filter((url: string | null) => url !== null) as string[];
  }

  if (images.length === 0) {
    images = [`https://source.unsplash.com/1600x900/?${encodeURIComponent(placeData.types?.[0] || 'business')}`];
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    let generated: any = {};
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try { generated = JSON.parse(jsonMatch[1]); } catch(e) {}
    } else {
      try { generated = JSON.parse(text); } catch (e) {}
    }

    const reviews: Review[] = placeData.reviews?.map((r: any) => ({
      author_name: r.author_name || "Anonymous",
      rating: r.rating || 0,
      relative_time_description: r.relative_time_description || "",
      text: r.text || "",
      profile_photo_url: r.profile_photo_url || "https://lh3.googleusercontent.com/a/default-user",
      time: r.time || Date.now()
    })) || [];

    const hours = placeData.opening_hours?.weekday_text || ["Hours not available"];

    return {
      name: placeData.name,
      address: placeData.formatted_address,
      rating: placeData.rating || 0,
      reviewCount: placeData.user_ratings_total || 0,
      mapLink: placeData.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeData.name + ' ' + placeData.formatted_address)}`,
      hours: hours,
      reviews: reviews,
      tagline: generated.tagline || `Welcome to ${placeData.name}`,
      description: generated.description || `${placeData.name} is located at ${placeData.formatted_address}. Come visit us!`,
      insights: generated.insights || ["Local Business", "Great Service"],
      images: images,
      nearbyRestaurants: generated.nearbyRestaurants || [],
      nearbyActivities: generated.nearbyActivities || [],
      rawPlaceData: placeData,
      types: types,
      menu: generated.inventory || [],
      categoryType: categoryType
    };

  } catch (error) {
    console.error("Error enriching business data:", error);
    return {
      name: placeData.name,
      address: placeData.formatted_address,
      rating: placeData.rating || 0,
      reviewCount: placeData.user_ratings_total || 0,
      mapLink: placeData.url || "",
      hours: [],
      reviews: [],
      tagline: placeData.name,
      description: placeData.formatted_address,
      insights: [],
      images: images.length > 0 ? images : ["https://via.placeholder.com/1600x900?text=No+Image+Available"],
      nearbyRestaurants: [],
      nearbyActivities: [],
      rawPlaceData: placeData,
      categoryType: 'catalog'
    };
  }
};

export const createAgentSession = (businessContext: BusinessData, agent: Agent) => {
  const systemInstruction = getSystemInstruction(agent, businessContext);
  const tools = getToolsForAgent(agent, businessContext);

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: { 
      systemInstruction,
      tools
    }
  });

  return chat;
};

export const createSupportChatSession = () => {
    return createAgentSession(PLATFORM_BUSINESS_DATA, {
        id: 'advisor-1',
        name: "Biz Machine",
        role: "AI Biz Bot",
        roleType: 'owner',
        type: 'assistant',
        discProfile: "Enthusiastic, helpful, high-tech",
        basePrompt: "Technical advisor for business owners.",
        enabled: true,
        voiceConfig: { voiceName: 'Kore', language: 'en' }
    });
};

const PLATFORM_BUSINESS_DATA: BusinessData = {
  name: "BizFlow AI",
  tagline: "The World's First Talking Website Machine",
  description: "A neural-network driven onboarding experience. Speak to build.",
  address: "Global AI Hub",
  rating: 5.0,
  reviewCount: 9999,
  mapLink: "#",
  hours: ["Online 24/7"],
  reviews: [],
  insights: ["Voice Command Only", "Maps Integrated", "Instant Generation"],
  images: [],
  nearbyRestaurants: [],
  nearbyActivities: [],
  rawPlaceData: {},
  categoryType: 'catalog'
};
