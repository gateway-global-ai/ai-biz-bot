import OpenAI from "openai";

const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY;
const PROPERTY_ID = "315701";
const CLOUDBEDS_BASE_URL = "https://api.cloudbeds.com/api/v1.3";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function fetchCloudbeds(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${CLOUDBEDS_BASE_URL}/${endpoint}`);
  url.searchParams.set("propertyID", PROPERTY_ID);
  
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "accept": "application/json",
      "x-api-key": CLOUDBEDS_API_KEY || "",
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudbeds API error: ${response.status}`);
  }

  return response.json();
}

export interface AvailabilityResult {
  available: boolean;
  roomTypes: Array<{
    roomTypeId: string;
    roomTypeName: string;
    roomRateId: string;
    pricePerNight: number;
    totalPrice: number;
    maxGuests: number;
    description: string;
  }>;
  searchParams: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    nights: number;
  };
}

export async function checkAvailability(
  checkIn: string,
  checkOut: string,
  adults: number = 2,
  children: number = 0
): Promise<AvailabilityResult> {
  const params: Record<string, string> = {
    startDate: checkIn,
    endDate: checkOut,
    adults: adults.toString(),
    children: children.toString(),
    rooms: "1",
    detailedRates: "true",
  };

  const data = await fetchCloudbeds("getAvailableRoomTypes", params);
  
  const propertyData = data?.data?.[0] || {};
  const roomTypes = propertyData.propertyRooms || [];

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const uniqueRooms = new Map<string, any>();
  for (const room of roomTypes) {
    if (!uniqueRooms.has(room.roomTypeID)) {
      uniqueRooms.set(room.roomTypeID, room);
    }
  }

  const formattedRooms = Array.from(uniqueRooms.values()).map((room: any) => ({
    roomTypeId: room.roomTypeID,
    roomTypeName: room.roomTypeName,
    roomRateId: room.roomRateID,
    pricePerNight: Math.round(room.roomRate / nights),
    totalPrice: room.roomRate,
    maxGuests: room.maxGuests || 4,
    description: room.roomTypeDescription || room.roomTypeName,
  }));

  return {
    available: formattedRooms.length > 0,
    roomTypes: formattedRooms,
    searchParams: {
      checkIn,
      checkOut,
      adults,
      children,
      nights,
    },
  };
}

export interface BookingQuote {
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  baseTotal: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
}

export async function getBookingQuote(
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  adults: number = 2,
  children: number = 0
): Promise<BookingQuote | null> {
  const availability = await checkAvailability(checkIn, checkOut, adults, children);
  const room = availability.roomTypes.find(r => r.roomTypeId === roomTypeId);
  
  if (!room) {
    return null;
  }

  const taxRate = 0.12;
  const taxAmount = room.totalPrice * taxRate;
  const grandTotal = room.totalPrice + taxAmount;

  return {
    roomTypeName: room.roomTypeName,
    checkIn,
    checkOut,
    nights: availability.searchParams.nights,
    adults,
    children,
    baseTotal: room.totalPrice,
    taxAmount: Math.round(taxAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    currency: "USD",
  };
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check room availability at Boardwalk Suites Lafayette for specific dates. Returns available room types with pricing.",
      parameters: {
        type: "object",
        properties: {
          check_in_date: {
            type: "string",
            description: "Check-in date in YYYY-MM-DD format"
          },
          check_out_date: {
            type: "string",
            description: "Check-out date in YYYY-MM-DD format"
          },
          adults: {
            type: "number",
            description: "Number of adults (default: 2)"
          },
          children: {
            type: "number",
            description: "Number of children (default: 0)"
          }
        },
        required: ["check_in_date", "check_out_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_quote",
      description: "Get a detailed price quote for a specific room type and dates",
      parameters: {
        type: "object",
        properties: {
          room_type_id: {
            type: "string",
            description: "The room type ID from availability check"
          },
          check_in_date: {
            type: "string",
            description: "Check-in date in YYYY-MM-DD format"
          },
          check_out_date: {
            type: "string",
            description: "Check-out date in YYYY-MM-DD format"
          },
          adults: {
            type: "number",
            description: "Number of adults"
          },
          children: {
            type: "number",
            description: "Number of children"
          }
        },
        required: ["room_type_id", "check_in_date", "check_out_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_hotel_info",
      description: "Get general information about Boardwalk Suites Lafayette including amenities, location, and policies",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

async function executeToolCall(name: string, args: any): Promise<string> {
  switch (name) {
    case "check_availability": {
      const result = await checkAvailability(
        args.check_in_date,
        args.check_out_date,
        args.adults || 2,
        args.children || 0
      );
      
      if (!result.available) {
        return JSON.stringify({
          available: false,
          message: "No rooms available for the selected dates. Please try different dates."
        });
      }
      
      return JSON.stringify({
        available: true,
        nights: result.searchParams.nights,
        rooms: result.roomTypes.map(r => ({
          id: r.roomTypeId,
          name: r.roomTypeName,
          pricePerNight: `$${r.pricePerNight}`,
          totalPrice: `$${r.totalPrice}`,
          maxGuests: r.maxGuests
        }))
      });
    }
    
    case "get_booking_quote": {
      const quote = await getBookingQuote(
        args.room_type_id,
        args.check_in_date,
        args.check_out_date,
        args.adults || 2,
        args.children || 0
      );
      
      if (!quote) {
        return JSON.stringify({
          error: "Room not available for selected dates"
        });
      }
      
      return JSON.stringify({
        room: quote.roomTypeName,
        dates: `${quote.checkIn} to ${quote.checkOut}`,
        nights: quote.nights,
        guests: `${quote.adults} adults, ${quote.children} children`,
        subtotal: `$${quote.baseTotal}`,
        taxes: `$${quote.taxAmount}`,
        total: `$${quote.grandTotal}`,
        note: "To complete your booking, please provide your contact information on our booking page."
      });
    }
    
    case "get_hotel_info": {
      return JSON.stringify({
        name: "Boardwalk Suites Lafayette",
        address: "1605 N University Ave, Lafayette, LA 70506",
        phone: "(337) 305-7110",
        description: "Extended-stay hotel offering fully furnished suites with kitchens, perfect for business travelers, relocations, and long-term stays.",
        amenities: [
          "Full kitchens in every suite",
          "Free WiFi",
          "Free parking",
          "Laundry facilities",
          "Pet-friendly rooms available",
          "Weekly and monthly rates available"
        ],
        roomTypes: [
          "King Suite Level 1 - $69/night",
          "King Suite Level 2 - $69/night",
          "King Suite Interior - $89/night",
          "VIP King Suite - $89/night",
          "Double Suite Interior - $99/night",
          "Double Suite Exterior - $99/night"
        ],
        policies: {
          checkIn: "3:00 PM",
          checkOut: "11:00 AM",
          cancellation: "Free cancellation up to 24 hours before check-in"
        }
      });
    }
    
    default:
      return JSON.stringify({ error: "Unknown function" });
  }
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function* streamChatWithTools(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<{ type: "text" | "tool_call" | "tool_result" | "done"; content: string }> {
  const systemPrompt = `You are a friendly and helpful booking assistant for Boardwalk Suites Lafayette, an extended-stay hotel in Lafayette, Louisiana.

Your role is to:
- Help guests check room availability and pricing
- Answer questions about the hotel, amenities, and policies
- Provide booking quotes and guide guests through the reservation process
- Be warm, professional, and concise

When checking availability or providing quotes:
- Always confirm the dates and number of guests
- Present room options clearly with pricing
- Mention that weekly (7+ nights) and monthly (30+ nights) stays get discounts
- For bookings, direct guests to complete their reservation on the website

Important information:
- Location: 1605 N University Ave, Lafayette, LA 70506
- Phone: (337) 305-7110
- All suites have full kitchens
- Pet-friendly rooms are available

Today's date is ${new Date().toISOString().split('T')[0]}.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage }
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-5",
    messages,
    tools,
    tool_choice: "auto",
    stream: false,
  });

  let assistantMessage = response.choices[0].message;

  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolMessages: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];
    
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") continue;
      
      const functionName = (toolCall as any).function?.name || "";
      const functionArgs = JSON.parse((toolCall as any).function?.arguments || "{}");
      
      yield { type: "tool_call", content: `Checking ${functionName.replace(/_/g, " ")}...` };
      
      const result = await executeToolCall(functionName, functionArgs);
      
      yield { type: "tool_result", content: result };
      
      toolMessages.push({
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    messages.push(assistantMessage);
    messages.push(...toolMessages);

    response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      tools,
      tool_choice: "auto",
      stream: false,
    });

    assistantMessage = response.choices[0].message;
  }

  if (assistantMessage.content) {
    yield { type: "text", content: assistantMessage.content };
  }

  yield { type: "done", content: "" };
}

export async function chatWithTools(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  let fullResponse = "";
  
  for await (const chunk of streamChatWithTools(userMessage, conversationHistory)) {
    if (chunk.type === "text") {
      fullResponse += chunk.content;
    }
  }
  
  return fullResponse;
}
