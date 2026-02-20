import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { BusinessData, Review, Agent, MenuSection, InventoryType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const PLATFORM_BUSINESS_DATA: BusinessData = {
  name: "AI Biz Bot",
  tagline: "Build Your AI Powered Website in 30 Seconds",
  description: "A neural-network driven onboarding experience. Search to build.",
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
    // Generate high-quality fallback using specific business keywords
    images = [
        `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200`,
        `https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200`
    ];
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
      images: images,
      nearbyRestaurants: [],
      nearbyActivities: [],
      rawPlaceData: placeData,
      categoryType: 'catalog'
    };
  }
};

const recommendItemTool: FunctionDeclaration = {
  name: 'recommendItem',
  description: 'Recommends a specific item from the menu, services catalog, or product list to the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      price: { type: Type.STRING }
    },
    required: ['name', 'description', 'price']
  }
};

const searchBusinessTool: FunctionDeclaration = {
  name: 'searchBusiness',
  description: 'Searches for a business on Google Maps using a search query.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The business name or website.' }
    },
    required: ['query']
  }
};

const triggerWebsiteGenerationTool: FunctionDeclaration = {
  name: 'triggerWebsiteGeneration',
  description: 'Starts the website creation process.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      placeId: { type: Type.STRING, description: 'The Google Place ID.' }
    },
    required: ['placeId']
  }
};

export const createAgentSession = (businessContext: BusinessData, agent: Agent) => {
  const tools: any[] = [];
  
  if (agent.roleType === 'customer') {
    tools.push({ functionDeclarations: [recommendItemTool] });
  } else if (agent.roleType === 'owner') {
    tools.push({ functionDeclarations: [searchBusinessTool, triggerWebsiteGenerationTool] });
  }

  const isGenerated = businessContext.name !== "Gateway Global AI" && businessContext.name !== "AI Biz Bot";
  const inventoryLabel = businessContext.categoryType === 'menu' ? 'Menu' : (businessContext.categoryType === 'services' ? 'Services' : 'Catalog');

  const systemInstruction = agent.roleType === 'owner' 
    ? `
      Identity: You are the "AI Biz Bot" Strategic Technical Advisor for "${businessContext.name}".
      Personality: ${agent.discProfile}.
      
      CORE KNOWLEDGE:
      ${isGenerated ? `The website for ${businessContext.name} has been SUCCESSFULLY GENERATED and is now live in the demo view.` : 'You are helping the user build a website.'}
      - Business Name: ${businessContext.name}
      - Rating: ${businessContext.rating}
      - Address: ${businessContext.address}
      - Hours: ${businessContext.hours.join(', ')}
      - Inventory (${inventoryLabel}): ${JSON.stringify(businessContext.menu)}
      
      CORE GOAL:
      ${isGenerated 
        ? `Acknowledge that the website is already created. Focus on advising the owner on business strategy, optimizing their ${inventoryLabel}, and scaling their online presence. You can discuss the content they see on the page right now.`
        : `Help the user find their business on Google Maps so we can build the site.`
      }
      
      Be professional, high-energy, and data-driven.
    `
    : `
      Identity: You are ${agent.name}, the AI Concierge for "${businessContext.name}".
      Personality: ${agent.discProfile}.
      
      CORE KNOWLEDGE:
      - Name: ${businessContext.name}
      - Description: ${businessContext.description}
      - Hours: ${businessContext.hours.join(', ')}
      - Inventory (${inventoryLabel}): ${JSON.stringify(businessContext.menu)}

      CORE GOAL:
      Greet visitors to the business website. Provide specific details about products, services, and logistics.
      NEVER tell users to "check the website" for info—you ARE the website's voice. Give them the info directly.
      Use the "recommendItem" tool if they seem undecided.
    `;

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: { 
      systemInstruction,
      tools: tools.length > 0 ? tools : undefined
    }
  });

  return chat;
};

export const createSupportChatSession = () => {
    return createAgentSession(PLATFORM_BUSINESS_DATA, {
        id: 'advisor-1',
        name: "AI Biz Bot",
        role: "AI Strategic Advisor",
        roleType: 'owner',
        type: 'assistant',
        discProfile: "Enthusiastic, helpful, high-tech",
        basePrompt: "Technical advisor for business owners.",
        enabled: true,
        voiceConfig: { voiceName: 'Kore', language: 'en' }
    });
};