/**
 * Client-side list of available tool names.
 * Mirrors the keys in server/config/geminiToolDeclarations.ts.
 * Used by AgentCreatorPanel to render the tool allowlist checkboxes.
 */
export const TOOL_NAMES: string[] = [
  'search_local_business',
  'request_manual_input',
  'confirm_location_selection',
  'search_grn_hotels',
  'enrich_hotels_with_rates',
  'get_hotel_inventory',
  'get_business_details',
  'get_business_reviews',
  'get_business_intelligence',
  'get_place_ui_data',
  'search_crm',
  'qualify_lead',
  'book_meeting',
  'generate_quote',
  'apply_discount',
  'stripe_checkout',
  'vine_lookup_and_dispatch',
  'fetch_city_warrants',
  'send_onboarding_email',
];
