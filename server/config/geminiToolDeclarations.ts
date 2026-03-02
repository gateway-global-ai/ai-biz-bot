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

  get_hotel_inventory: {
    name: "get_hotel_inventory",
    description: "Fetches live room availability and rates for a specific hotel already linked to the platform. Use when the user asks for availability at THIS business (Boardwalk Suites or any site with a GRN hotel code). Requires check-in and check-out dates.",
    parameters: {
      type: "OBJECT",
      properties: {
        platformId: {
          type: "STRING",
          description: "Internal UUID from platform_business_map. Omit to use the session anchor."
        },
        checkIn: {
          type: "STRING",
          description: "Check-in date YYYY-MM-DD"
        },
        checkOut: {
          type: "STRING",
          description: "Check-out date YYYY-MM-DD"
        },
        guests: {
          type: "INTEGER",
          description: "Number of adult guests (default 2)"
        },
        roomFilter: {
          type: "STRING",
          description: "Optional keyword to filter room types, e.g. 'jacuzzi' or 'kitchen'"
        }
      },
      required: ["checkIn", "checkOut"]
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
  },

  // ── Lead Qualifier tools ──────────────────────────────────────────────────

  search_crm: {
    name: "search_crm",
    description: "Silently checks whether a caller already exists in the business CRM by phone number or email. Call at the start of every inbound lead conversation. Never announce this check to the caller.",
    parameters: {
      type: "OBJECT",
      properties: {
        caller_id: {
          type: "STRING",
          description: "The caller's phone number or email address to look up."
        },
        email: {
          type: "STRING",
          description: "Optional email address to cross-reference."
        }
      },
      required: ["caller_id"]
    }
  },

  qualify_lead: {
    name: "qualify_lead",
    description: "Scores an inbound lead 1–10 based on NBAT signals (Need, Budget, Authority, Timeline) gathered from the conversation. Call after collecting at least 3 signals. Returns a score and routing recommendation.",
    parameters: {
      type: "OBJECT",
      properties: {
        nbat_signals: {
          type: "OBJECT",
          description: "The four NBAT qualification signals extracted from the conversation.",
          properties: {
            need: { type: "STRING", description: "The stated problem or pain point." },
            budget: { type: "STRING", description: "Budget range or willingness to invest." },
            authority: { type: "STRING", description: "Whether this person can make the buying decision." },
            timeline: { type: "STRING", description: "When they need the solution." }
          }
        },
        caller_name: {
          type: "STRING",
          description: "The caller's name for personalization."
        }
      },
      required: ["nbat_signals"]
    }
  },

  book_meeting: {
    name: "book_meeting",
    description: "Books a meeting for a qualified lead (score ≥ 7). Returns the next available time slot. Only call this after a successful qualification — do not book unqualified leads.",
    parameters: {
      type: "OBJECT",
      properties: {
        lead_name: {
          type: "STRING",
          description: "Full name of the lead."
        },
        lead_contact: {
          type: "STRING",
          description: "Phone number or email for calendar invite."
        },
        preferred_slot: {
          type: "STRING",
          description: "Optional preferred time the lead mentioned (e.g. 'Tuesday afternoon')."
        }
      },
      required: ["lead_name", "lead_contact"]
    }
  },

  // ── Sales Closer tools ────────────────────────────────────────────────────

  generate_quote: {
    name: "generate_quote",
    description: "Generates a structured quote/proposal based on the scope of work discussed in the conversation. Call as soon as the prospect's needs are defined — do not wait for explicit permission. Returns a formatted proposal summary.",
    parameters: {
      type: "OBJECT",
      properties: {
        scope_summary: {
          type: "STRING",
          description: "A concise summary of the services or products the prospect is interested in."
        },
        tier: {
          type: "STRING",
          enum: ["free", "starter", "ai_pro", "enterprise"],
          description: "The subscription tier being quoted."
        },
        prospect_name: {
          type: "STRING",
          description: "Name to personalize the quote."
        }
      },
      required: ["scope_summary", "tier"]
    }
  },

  apply_discount: {
    name: "apply_discount",
    description: "Checks the business's site configuration for available promotional discounts and validates whether the requested discount is within the authorized limit. Call silently when price hesitation is detected. Never announce the check — only reveal the outcome if a discount is approved.",
    parameters: {
      type: "OBJECT",
      properties: {
        business_id: {
          type: "STRING",
          description: "The site config UUID of the business."
        },
        requested_pct: {
          type: "NUMBER",
          description: "The discount percentage being requested (e.g. 10 for 10%)."
        }
      },
      required: ["business_id", "requested_pct"]
    }
  },

  stripe_checkout: {
    name: "stripe_checkout",
    description: "Creates a live Stripe Checkout payment link for the agreed service tier and sends it to the prospect. Call when verbal agreement is reached. Tell the prospect: 'I've sent a secure payment link to your screen right now.'",
    parameters: {
      type: "OBJECT",
      properties: {
        business_id: {
          type: "STRING",
          description: "The site config UUID of the business."
        },
        plan: {
          type: "STRING",
          enum: ["starter", "ai_pro", "enterprise"],
          description: "The subscription plan to charge for."
        },
        customer_email: {
          type: "STRING",
          description: "Optional prospect email to pre-fill in the Stripe checkout."
        }
      },
      required: ["business_id", "plan"]
    }
  },

  // ── Bail Bonds / Legal vertical ──────────────────────────────────────────

  vine_lookup_and_dispatch: {
    name: "vine_lookup_and_dispatch",
    description: "Looks up an inmate in the statewide jail roster to confirm custody status and bond amount, then dispatches an urgent SMS to their outside contact (the indemnitor / payer) with a deep link to arrange bail payment. Use this immediately after the inmate provides their name and the outside contact's phone number.",
    parameters: {
      type: "OBJECT",
      properties: {
        inmateFirstName: {
          type: "STRING",
          description: "First name of the inmate in custody."
        },
        inmateLastName: {
          type: "STRING",
          description: "Last name of the inmate in custody."
        },
        outsideContactNumber: {
          type: "STRING",
          description: "10-digit US phone number of the person on the outside who will pay the bail premium."
        },
        platformId: {
          type: "STRING",
          description: "Internal UUID. Omit — the session anchor is injected automatically."
        }
      },
      required: ["inmateFirstName", "inmateLastName", "outsideContactNumber"]
    }
  },

  fetch_city_warrants: {
    name: "fetch_city_warrants",
    description: "Searches the official Baton Rouge City Court open-data database for active warrants by first and last name. Use this whenever a user asks whether they or someone else has a warrant in Baton Rouge.",
    parameters: {
      type: "OBJECT",
      properties: {
        firstName: {
          type: "STRING",
          description: "The first name of the individual to search."
        },
        lastName: {
          type: "STRING",
          description: "The last name of the individual to search."
        },
        platformId: {
          type: "STRING",
          description: "Internal UUID. Omit — the session anchor is injected automatically."
        }
      },
      required: ["firstName", "lastName"]
    }
  },

  // ── Post-payment follow-up ────────────────────────────────────────────────

  send_onboarding_email: {
    name: "send_onboarding_email",
    description: "Sends a comprehensive welcome kit and onboarding guide to a customer after a successful payment or plan upgrade. Requires a valid Platform ID. Only call this after stripe_checkout confirms success — never speculatively.",
    parameters: {
      type: "OBJECT",
      properties: {
        platformId: {
          type: "STRING",
          description: "The unique UUID (platform_id) of the business from the platform_business_map table, used to fetch correct branding and verify payment status."
        },
        customerEmail: {
          type: "STRING",
          description: "The recipient's email address. Must be a valid email format."
        },
        customerName: {
          type: "STRING",
          description: "The name of the customer to personalize the greeting."
        },
        planName: {
          type: "STRING",
          description: "The name of the subscription plan purchased (e.g., 'Starter', 'AI Pro', 'Enterprise')."
        },
        agentName: {
          type: "STRING",
          description: "The name of the agent sending the email, to maintain conversational continuity (e.g., 'Jordan')."
        }
      },
      required: ["platformId", "customerEmail", "customerName", "planName"]
    }
  },

  // ── Business Intelligence Tools (Data Miner / Sage) ──────────────────────────

  resolve_data_id: {
    name: "resolve_data_id",
    description: "Resolve a business name string to a stable SerpAPI data_id. The data_id never rotates — unlike Google's place_id. Use this first to anchor any business before review harvesting.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The business name and location as a string (e.g., 'Boardwalk Suites Lafayette')."
        },
        ll: {
          type: "STRING",
          description: "Optional GPS coordinates in SerpAPI format: @lat,lng,zoom. Improves local search accuracy."
        },
        site_config_id: {
          type: "STRING",
          description: "Optional. If provided, stores the resolved data_id to the platform_business_map for this site."
        }
      },
      required: ["query"]
    }
  },

  ingest_serpapi_reviews: {
    name: "ingest_serpapi_reviews",
    description: "Harvest all available Google Maps reviews for a business using its stable SerpAPI data_id. Paginates automatically through the full review corpus. First 10 reviews per site are free; additional reviews billed at $0.10 each.",
    parameters: {
      type: "OBJECT",
      properties: {
        data_id: {
          type: "STRING",
          description: "The stable SerpAPI data_id for the business (from resolve_data_id)."
        },
        max_reviews: {
          type: "INTEGER",
          description: "Maximum reviews to harvest. Range: 1-500. Default: 100."
        },
        sort_by: {
          type: "STRING",
          description: "Review sort order: qualityScore (default, most relevant), newestFirst, ratingHigh, or ratingLow."
        },
        site_config_id: {
          type: "STRING",
          description: "Optional. If provided, stores the raw review snapshot in the database."
        }
      },
      required: ["data_id"]
    }
  },

  compile_knowledge_base: {
    name: "compile_knowledge_base",
    description: "Analyze harvested reviews with Gemini to produce a structured SWOT intelligence brief. Auto-tunes the recommended DISC profile for the business's ideal agent. Inserts the compiled markdown document into the site's knowledgeLibrary.",
    parameters: {
      type: "OBJECT",
      properties: {
        data_id: {
          type: "STRING",
          description: "The stable SerpAPI data_id for the business."
        },
        business_name: {
          type: "STRING",
          description: "The full business name as it should appear in the compiled brief."
        },
        site_config_id: {
          type: "STRING",
          description: "The site config ID where the compiled intelligence brief will be stored."
        }
      },
      required: ["data_id", "business_name", "site_config_id"]
    }
  }
};
