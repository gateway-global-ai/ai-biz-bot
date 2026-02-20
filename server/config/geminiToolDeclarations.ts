export const TOOL_DECLARATIONS = {
  search_local_business: {
    name: "search_local_business",
    description: "Searches for local businesses or places based on user criteria. Use this tool whenever a user asks to see locations, find a business, or view a map.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The type of business or specific name to search for (e.g., 'coffee shops', 'Gateway Global AI office')."
        },
        location: {
          type: "STRING",
          description: "The specific city, neighborhood, or area to search in (e.g., 'Downtown Lafayette', 'near me')."
        },
        zoom_level: {
          type: "NUMBER",
          description: "The suggested map zoom level (1-20). Use 14 for neighborhoods, 18 for specific buildings."
        }
      },
      required: ["query"]
    }
  },
  
  request_manual_input: {
    name: "request_manual_input",
    description: "Displays a text input box in the 40% Content Window for the user to manually type sensitive or unclear information.",
    parameters: {
      type: "OBJECT",
      properties: {
        field_type: {
          type: "STRING",
          enum: ["address", "business_name", "email", "phone"],
          description: "The specific type of information the user needs to correct."
        },
        label: {
          type: "STRING",
          description: "The text label to display above the input box (e.g., 'Please type the address here')."
        }
      },
      required: ["field_type", "label"]
    }
  },
  
  confirm_location_selection: {
    name: "confirm_location_selection",
    description: "Triggered when the user manually selects a business or location from the Place Picker in the UI.",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "The unique Google Places ID of the selected location."
        },
        confirmed_name: {
          type: "STRING",
          description: "The human-readable name of the selected place."
        },
        selection_type: {
          type: "STRING",
          enum: ["manual_search", "suggested_correction"],
          description: "Whether the user searched for this or picked it from a list of corrections."
        }
      },
      required: ["place_id", "confirmed_name"]
    }
  },
  
  search_grn_hotels: {
    name: "search_grn_hotels",
    description: "Searches for real-time hotel availability and rates using the GRN Connect database and API. Use this when a user asks for specific hotel recommendations or pricing in a city.",
    parameters: {
      type: "OBJECT",
      properties: {
        destination_code: {
          type: "STRING",
          description: "The city code from the static database (e.g., '121449' for Dubai)."
        },
        hotel_codes: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of specific hotel IDs to check availability for."
        },
        checkin: {
          type: "STRING",
          description: "Check-in date in YYYY-MM-DD format."
        },
        checkout: {
          type: "STRING",
          description: "Check-out date in YYYY-MM-DD format."
        },
        adults: {
          type: "INTEGER",
          default: 2
        }
      },
      required: ["destination_code", "checkin", "checkout"]
    }
  },
  
  enrich_hotels_with_rates: {
    name: "enrich_hotels_with_rates",
    description: "Searches for hotels via Google and enriches them with live rates and availability from the GRN database. Use this for all specific hotel pricing or availability requests.",
    parameters: {
      type: "OBJECT",
      properties: {
        location: {
          type: "STRING",
          description: "City or specific area (e.g., 'Milan, Italy')"
        },
        query: {
          type: "STRING",
          description: "Search term (e.g., 'boutique hotel near arena')"
        },
        checkin: {
          type: "STRING",
          description: "Check-in date (YYYY-MM-DD)"
        },
        checkout: {
          type: "STRING",
          description: "Check-out date (YYYY-MM-DD)"
        },
        currency: {
          type: "STRING",
          enum: ["USD", "EUR"],
          default: "USD"
        },
        rooms: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              adults: { type: "NUMBER" },
              childrenAges: { type: "ARRAY", items: { type: "NUMBER" } }
            }
          }
        }
      },
      required: ["location", "checkin", "checkout"]
    }
  },

  get_business_details: {
    name: "get_business_details",
    description: "Fetches enriched business data for a Google Place (name, address, hours, rating, etc.). Use when the user asks about a specific business or when you need current place details.",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "Google Place ID of the business."
        }
      },
      required: ["place_id"]
    }
  },

  get_business_reviews: {
    name: "get_business_reviews",
    description: "Fetches and optionally analyzes reviews for a business. Use when the user asks about reviews, ratings, or what customers say.",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "Google Place ID of the business."
        },
        max_reviews: {
          type: "NUMBER",
          description: "Maximum number of reviews to fetch (default 20). Use 100 for full BI report."
        }
      },
      required: ["place_id"]
    }
  },

  get_business_intelligence: {
    name: "get_business_intelligence",
    description: "Generates a premium business intelligence report (executive summary, SWOT, cinematic narrative) from reviews. Use when the user or owner asks for insights, strengths/weaknesses, or a tour script.",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "Google Place ID of the business."
        },
        business_name: {
          type: "STRING",
          description: "Display name of the business for the report."
        }
      },
      required: ["place_id", "business_name"]
    }
  },

  get_place_ui_data: {
    name: "get_place_ui_data",
    description: "Fetches minimal place metadata for the Places UI Kit (e.g. for displaying in the 40% content window when the user lands on a place).",
    parameters: {
      type: "OBJECT",
      properties: {
        place_id: {
          type: "STRING",
          description: "Google Place ID."
        }
      },
      required: ["place_id"]
    }
  }
};
