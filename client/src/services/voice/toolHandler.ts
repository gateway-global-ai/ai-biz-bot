/**
 * Gemini Live API - Tool Call Dispatcher
 *
 * This service receives a function call from the geminiVoice.ts proxy,
 * routes it to the appropriate internal service (e.g., Maps, Reviews, BI),
 * and returns the result.
 */

import {
  handleGetBusinessDetails,
  handleGetBusinessReviews,
  handleGetBusinessIntelligence,
  handleGetPlaceUiData,
} from "../../tools/businessToolHandlers.js";
import { handleSearchGrnHotels, handleEnrichHotelsWithRates } from "../../tools/grnHotelsHandler.js";
import { handlePlacesSearch } from "../../tools/placesHandler.js";

/**
 * Dispatches tool calls to their respective service handlers.
 * @param functionCall The function call object from the Gemini API.
 * @returns The result from the executed tool.
 */
export async function handleToolCall(functionCall: { name: string; args: any }): Promise<unknown> {
  const { name, args } = functionCall;
  console.log(`[ToolHandler] Executing: ${name}`, JSON.stringify(args).substring(0, 200));

  switch (name) {
    // Business & Place Tools
    case "get_business_details":
      return await handleGetBusinessDetails(args as any);
    case "get_business_reviews":
      return await handleGetBusinessReviews(args as any);
    case "get_business_intelligence":
      return await handleGetBusinessIntelligence(args as any);
    case "get_place_ui_data":
      return await handleGetPlaceUiData(args as any);

    // Hotel Search Tools (GRN)
    case "search_grn_hotels":
      return await handleSearchGrnHotels(args as any);
    case "enrich_hotels_with_rates":
      return await handleEnrichHotelsWithRates(args as any);

    // General Local Search
    case "search_local_business":
      return await handlePlacesSearch(args.query as string, args.location as string | undefined);

    // Client-side signal
    case "request_manual_input":
      return { status: "awaiting_user_input" };

    default:
      console.warn(`[ToolHandler] Unknown tool called: ${name}`);
      throw new Error(`Unknown tool: ${name}`);
  }
}