
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { BusinessData, Review, AgentConfig, SwotAnalysis, MenuSection, InventoryType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const enrichBusinessData = async (placeData: any): Promise<BusinessData> => {
  if (!apiKey) throw new Error("API Key not found");

  const model = "gemini-3-flash-preview";
  const types = placeData.types || [];
  
  // Determine inventory type
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

const recommendItemTool: FunctionDeclaration = {
  name: 'recommendItem',
  description: 'Recommends a specific item from the menu, services catalog, or product list to the user. Use this when the user is looking for a specific food, product, or service.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The exact name of the item from the catalog.' },
      description: { type: Type.STRING, description: 'A short appetizing description.' },
      price: { type: Type.STRING, description: 'The price as shown in the catalog.' }
    },
    required: ['name', 'description', 'price']
  }
};

export const createChatSession = (businessContext: BusinessData, agentConfig?: AgentConfig) => {
  const config = agentConfig || {
    name: "AI Assistant",
    role: "Assistant",
    discProfile: "Helpful and polite",
    basePrompt: "Your goal is to help customers on the website. Be friendly, professional, and concise."
  };

  const inventoryLabel = businessContext.categoryType === 'menu' ? 'Menu' : (businessContext.categoryType === 'services' ? 'Services' : 'Catalog');

  const systemInstruction = `
    Identity: You are ${config.name}, a ${config.role} for "${businessContext.name}".
    Personality/DISC Profile: ${config.discProfile}.
    
    Core Instructions:
    ${config.basePrompt}
    
    Business Context:
    Address: ${businessContext.address}.
    About: ${businessContext.description}.
    
    Our Full ${inventoryLabel}:
    ${JSON.stringify(businessContext.menu)}
    
    CRITICAL:
    If a user asks for a recommendation, looks for something specific, or asks "what do you have?", 
    look at the ${inventoryLabel.toLowerCase()} and call the "recommendItem" function with the details of the matching item(s).
    You can also provide a text response along with the tool call.
  `;

  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: { 
      systemInstruction,
      tools: [{ functionDeclarations: [recommendItemTool] }]
    }
  });
};

export const generateBusinessSWOT = async (data: BusinessData): Promise<SwotAnalysis> => {
  if (!apiKey) throw new Error("API Key not found");
  
  const prompt = `
    Generate a detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the following business.
    
    Business Name: ${data.name}
    Description: ${data.description}
    Rating: ${data.rating} (${data.reviewCount} reviews)
    Reviews Sample: ${data.reviews.slice(0,3).map(r => r.text).join(" | ")}
    Insights: ${data.insights.join(", ")}
    
    Output strictly valid JSON with this shape:
    {
      "strengths": ["string", "string"],
      "weaknesses": ["string", "string"],
      "opportunities": ["string", "string"],
      "threats": ["string", "string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    return {
      strengths: ["Strong local presence", "Positive customer feedback"],
      weaknesses: ["Limited digital footprint", "Manual booking processes"],
      opportunities: ["Online marketing", "Loyalty program"],
      threats: ["Local competition", "Economic downturn"]
    };
  }
};

export const generateMarketingImage = async (prompt: string): Promise<string | null> => {
    if (!apiKey) throw new Error("API Key not found");
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: "Generate a high quality, photorealistic, professional marketing image for a business. Context: " + prompt }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64String = part.inlineData.data;
                    return `data:image/png;base64,${base64String}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Image generation failed:", error);
        return null;
    }
}

const integrationTool: FunctionDeclaration = {
  name: 'suggestIntegration',
  description: 'Suggests a premium integration (like Google Workspace) when the user asks about emails, appointments, booking, or productivity tools.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      integrationType: {
        type: Type.STRING,
        description: 'The type of integration to suggest. Use "google_workspace" for email/calendar requests.',
        enum: ['google_workspace']
      }
    },
    required: ['integrationType']
  }
};

export const createSupportChatSession = () => {
  const systemInstruction = `
    You are the \"AI Biz Bot\", an expert technical integration specialist for this website builder platform.
    You are talking to the BUSINESS OWNER.
    
    Your goal is to help them integrate external data sources and tools.
    
    CRITICAL INSTRUCTION:
    If the user asks about \"emails\", \"gmail\", \"Google Workspace\", \"booking appointments\", \"calendar\", or \"scheduling\", you MUST call the \"suggestIntegration\" tool with integrationType=\"google_workspace\".
    
    For other integrations (Square, Shopify, etc.), explain how you can help generate API keys or webhooks.
    Be helpful, technical but accessible, and enthusiastic about automation.
  `;
  
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: { 
      systemInstruction,
      tools: [{ functionDeclarations: [integrationTool] }]
    }
  });
};
