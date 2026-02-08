import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { BusinessData, Review } from "../types";

// SECURITY: For production, Gemini calls should go through a backend proxy.
// This client-side approach is for development/demo only.
// The backend API endpoint (if available) takes precedence over direct Gemini calls.
const BACKEND_API_URL = (typeof window !== 'undefined' && (window as any).__BACKEND_API_URL__) || '';
const apiKey = (typeof window !== 'undefined' && (window as any).__GEMINI_API_KEY__) || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Check if we should use backend proxy instead of direct Gemini calls
const useBackendProxy = !!BACKEND_API_URL;

export const enrichBusinessData = async (placeData: any): Promise<BusinessData> => {
  // Prefer backend proxy for security (keeps API key server-side)
  if (useBackendProxy) {
    const response = await fetch(`${BACKEND_API_URL}/api/gemini/enrich-business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeData })
    });
    if (!response.ok) throw new Error('Backend enrichment failed');
    return response.json();
  }
  
  // Fallback to direct Gemini calls (development only - exposes API key)
  if (!apiKey || !ai) throw new Error("API Key not found - set window.__GEMINI_API_KEY__ or use backend proxy");

  const model = "gemini-2.5-flash";
  
  // Construct a context object from the raw Place result to send to Gemini
  const minimalData = {
    name: placeData.name,
    address: placeData.formatted_address,
    rating: placeData.rating,
    reviews: placeData.reviews?.slice(0, 5).map((r: any) => r.text) || [],
    types: placeData.types || [],
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
    
    For each nearby place, provide:
       - name
       - type (e.g. Italian, Museum, Park)
       - a short appetizing/engaging blog-style summary (1 sentence)
       - rating (number, e.g. 4.5)
       - approximate location/distance context
    
    OUTPUT FORMAT:
    Return a STRICT JSON object inside a markdown code block (\`\`\`json ... \`\`\`).
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
      ]
    }
  `;

  // Extract photos if available
  let images: string[] = [];
  if (placeData.photos && placeData.photos.length > 0) {
    images = placeData.photos.map((photo: any) => {
      if (typeof photo.getUrl === 'function') {
        return photo.getUrl({ maxWidth: 1200, maxHeight: 1200 });
      }
      return null;
    }).filter((url: string | null) => url !== null) as string[];
  }

  // Fallback image if none exist
  if (images.length === 0) {
    images = [`https://source.unsplash.com/1600x900/?${encodeURIComponent(placeData.types?.[0] || 'business')}`];
  }

  try {
    // We use the googleMaps tool to allow the model to actually find real nearby places
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || "";
    
    // Extract JSON
    let generated: any = {};
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try { generated = JSON.parse(jsonMatch[1]); } catch(e) {}
    } else {
      try { generated = JSON.parse(text); } catch (e) {}
    }

    // Process reviews into rich objects
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
    };

  } catch (error) {
    console.error("Error enriching business data:", error);
    // Return a safe fallback
    return {
      name: placeData.name,
      address: placeData.formatted_address,
      rating: placeData.rating || 0,
      reviewCount: placeData.user_ratings_total || 0,
      mapLink: placeData.url || "",
      hours: placeData.opening_hours?.weekday_text || [],
      reviews: [],
      tagline: placeData.name,
      description: placeData.formatted_address,
      insights: [],
      images: images.length > 0 ? images : ["https://via.placeholder.com/1600x900?text=No+Image+Available"],
      nearbyRestaurants: [],
      nearbyActivities: [],
      rawPlaceData: placeData,
    };
  }
};

export const createChatSession = (businessContext: BusinessData) => {
  const systemInstruction = `
    You are a helpful AI assistant for the business "${businessContext.name}".
    Address: ${businessContext.address}.
    About: ${businessContext.description}.
    Hours: ${businessContext.hours.join(', ')}.
    
    Your goal is to help customers on the website. Be friendly, professional, and concise.
    Use the provided business context to answer questions about hours, location, and services.
  `;

  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: { systemInstruction }
  });
};

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

// Google Workspace MCP Tools
const googleCalendarTool: FunctionDeclaration = {
  name: 'createCalendarEvent',
  description: 'Creates a new event in Google Calendar. Use when the user wants to schedule appointments, meetings, or reminders.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: 'Title of the event'
      },
      description: {
        type: Type.STRING,
        description: 'Description or notes for the event'
      },
      startTime: {
        type: Type.STRING,
        description: 'Start time in ISO 8601 format (e.g., 2026-02-10T10:00:00-05:00)'
      },
      endTime: {
        type: Type.STRING,
        description: 'End time in ISO 8601 format'
      },
      attendees: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of attendee email addresses'
      }
    },
    required: ['summary', 'startTime', 'endTime']
  }
};

const googleTasksTool: FunctionDeclaration = {
  name: 'createTask',
  description: 'Creates a new task in Google Tasks. Use when the user wants to add a to-do item or reminder.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Title of the task'
      },
      notes: {
        type: Type.STRING,
        description: 'Additional notes or details'
      },
      dueDate: {
        type: Type.STRING,
        description: 'Due date in ISO 8601 format'
      }
    },
    required: ['title']
  }
};

const googleDocsTool: FunctionDeclaration = {
  name: 'createDocument',
  description: 'Creates a new Google Document. Use when the user wants to create a document, proposal, or written content.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Title of the document'
      },
      content: {
        type: Type.STRING,
        description: 'Initial content to add to the document'
      }
    },
    required: ['title']
  }
};

const googleSheetsTool: FunctionDeclaration = {
  name: 'createSpreadsheet',
  description: 'Creates a new Google Spreadsheet. Use when the user wants to track data, create reports, or manage lists.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Title of the spreadsheet'
      },
      headers: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Column headers for the first row'
      },
      data: {
        type: Type.ARRAY,
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        description: 'Initial data rows (array of arrays)'
      }
    },
    required: ['title']
  }
};

const listCalendarEventsTool: FunctionDeclaration = {
  name: 'listCalendarEvents',
  description: 'Lists upcoming events from Google Calendar. Use when the user wants to check their schedule.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum number of events to return (default 10)'
      },
      timeMin: {
        type: Type.STRING,
        description: 'Start of time range in ISO 8601 format (defaults to now)'
      }
    },
    required: []
  }
};

const listTasksTool: FunctionDeclaration = {
  name: 'listTasks',
  description: 'Lists tasks from Google Tasks. Use when the user wants to see their to-do list.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: {
        type: Type.NUMBER,
        description: 'Maximum number of tasks to return (default 10)'
      }
    },
    required: []
  }
};

const generateBusinessReportTool: FunctionDeclaration = {
  name: "generateBusinessReport",
  description: "Generate an area insights report. Two modes: 'owner' (default) looks up a business and reports on all nearby categories using the business's own type. 'marketing' searches for a specific category near a location with optional rating/price filters. Default radius is 3 miles.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING, description: "Search mode: 'owner' for business area report, 'marketing' for targeted market search. Default: 'owner'" },
      businessName: { type: Type.STRING, description: "For owner mode: the business name (e.g., 'Boardwalk Suites Lafayette'). For marketing mode: the address or location to search near." },
      category: { type: Type.STRING, description: "For marketing mode: the business category to search (e.g., restaurant, cafe, lodging, store, bar). Required for marketing mode." },
      radiusMiles: { type: Type.NUMBER, description: "Search radius in miles (default 3)" },
      minRating: { type: Type.NUMBER, description: "For marketing mode: minimum review rating filter (1.0-5.0)" },
      maxRating: { type: Type.NUMBER, description: "For marketing mode: maximum review rating filter (1.0-5.0)" }
    },
    required: ["businessName"]
  }
};

const googleWorkspaceTools: FunctionDeclaration[] = [
  integrationTool,
  googleCalendarTool,
  googleTasksTool,
  googleDocsTool,
  googleSheetsTool,
  listCalendarEventsTool,
  listTasksTool,
  generateBusinessReportTool
];

export const createSupportChatSession = (hasGoogleWorkspace: boolean = false) => {
  const baseInstruction = `
    You are the "AI Biz Bot", an expert technical integration specialist for this website builder platform.
    You are talking to the BUSINESS OWNER.
    
    Your goal is to help them integrate external data sources and tools, and perform actions on their behalf.
  `;
  
  const noWorkspaceInstruction = `
    ${baseInstruction}
    
    CRITICAL INSTRUCTION:
    If the user asks about "emails", "gmail", "Google Workspace", "booking appointments", "calendar", or "scheduling", you MUST call the "suggestIntegration" tool with integrationType="google_workspace" to offer them the integration.
    
    For other integrations (Square, Shopify, etc.), explain how you can help generate API keys or webhooks.
    Be helpful, technical but accessible, and enthusiastic about automation.
  `;
  
  const withWorkspaceInstruction = `
    ${baseInstruction}
    
    GOOGLE WORKSPACE CONNECTED - You have full access to:
    - Google Calendar: Create events, check schedule, manage appointments
    - Google Tasks: Create and list to-do items
    - Google Docs: Create documents and proposals
    - Google Sheets: Create spreadsheets for tracking data
    - Area Insights: Generate business reports using Google Places Aggregate API
    
    TOOL USAGE RULES:
    - When user asks to schedule something → Use createCalendarEvent
    - When user asks to add a task/reminder → Use createTask
    - When user asks to create a document → Use createDocument
    - When user asks to track data/create a list → Use createSpreadsheet
    - When user asks about their schedule → Use listCalendarEvents
    - When user asks about their to-do list → Use listTasks
    - When user asks about competitors, area report, business insights, or nearby businesses → Use generateBusinessReport with mode='owner' and the business name
    - When user wants to search for specific business types in an area (market research) → Use generateBusinessReport with mode='marketing', the category, and the location
    - Default search radius is 3 miles. User can specify a different radius in miles.
    
    For other integrations (Square, Shopify, etc.), explain how you can help generate API keys or webhooks.
    Be helpful, proactive, and enthusiastic about automation. Take action when the user requests it.
  `;

  const systemInstruction = hasGoogleWorkspace ? withWorkspaceInstruction : noWorkspaceInstruction;
  const tools = hasGoogleWorkspace ? googleWorkspaceTools : [integrationTool];
  
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: { 
      systemInstruction,
      tools: [{ functionDeclarations: tools }]
    }
  });
};

// Export types for external tool handlers
export type GoogleWorkspaceTool = 
  | 'suggestIntegration'
  | 'createCalendarEvent'
  | 'createTask'
  | 'createDocument'
  | 'createSpreadsheet'
  | 'listCalendarEvents'
  | 'listTasks'
  | 'generateBusinessReport';

export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}