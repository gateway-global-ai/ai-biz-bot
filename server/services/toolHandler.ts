/**
 * toolHandler.ts - Server-side tool execution for Gemini Multimodal Live
 * Location: /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/server/services/voice/toolHandler.ts
 */
import { getBusinessDetails, getBusinessReviews } from "./mapsService";
import { generateBusinessIntelligence } from "./intelligenceService";

/**
 * Interface for the tool call structure received from the Gemini v1beta protocol
 */
interface ToolCall {
  name: string;
  args: any;
  id?: string;
}

/**
 * Main dispatcher that routes Gemini's function calls to internal services.
 * Every tool declared in the client's setupMessage must be handled here.
 */
export async function handleToolCall(toolCall: ToolCall) {
  console.log(`[ToolHandler] 🛠️ Executing tool: ${toolCall.name} with args:`, toolCall.args);

  try {
    switch (toolCall.name) {
      case "get_business_details":
        // Required by Gemini protocol: placeId
        return await getBusinessDetails(toolCall.args.placeId);

      case "get_business_reviews":
        // Maps to SerpApi Google Maps Reviews engine
        return await getBusinessReviews(
          toolCall.args.placeId, 
          toolCall.args.maxReviews || 5
        );

      case "get_business_intelligence":
        // Handles SWOT and Tour Narrative requests
        return await generateBusinessIntelligence(
          toolCall.args.businessName,
          toolCall.args.focusArea
        );

      case "request_manual_input":
        // Acknowledge the request; the React frontend renders the form
        return { 
          status: "awaiting_user_input", 
          prompt: toolCall.args.prompt || "Please provide the requested info." 
        };

      default:
        console.warn(`[ToolHandler] ⚠️ Tool not recognized: ${toolCall.name}`);
        return { error: `Tool ${toolCall.name} is not implemented on the server.` };
    }
  } catch (error) {
    console.error(`[ToolHandler] ❌ Error executing ${toolCall.name}:`, error);
    // Return error to Gemini so it can inform the user via voice
    return { error: "I'm having trouble accessing that information right now." };
  }
}