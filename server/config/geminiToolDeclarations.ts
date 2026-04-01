export const TOOL_DECLARATIONS = {
  manage_pricing_plans: {
    name: "manage_pricing_plans",
    description: "Displays an interactive interface for the business owner to view, add, or edit their service plans and pricing. Use this when the user wants to manage their business offerings, prices, or packages.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          enum: ["view", "edit"],
          description: "Whether to start in view or edit mode.",
          default: "view"
        }
      },
      required: []
    }
  },

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
          enum: ["address", "business_name", "email", "phone", "otp"],
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
    description: "Fetches live room availability and rates for this business. Use when the user asks for availability, rates, or rooms at THIS hotel (e.g. Boardwalk Suites). Works for both Cloudbeds-connected and GRN-linked properties. Requires check-in and check-out dates.",
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

  guest_phone_verification: {
    name: "guest_phone_verification",
    description:
      "Sends or verifies a one-time code (SMS) for the guest's phone number before discussing account-specific or folio details. Use send_otp first, then verify_otp with the code the guest enters. Requires Twilio Verify on the server. On inbound PSTN calls, the server binds to Twilio caller ID — do not rely on a verbally supplied number for identity.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          enum: ["send_otp", "verify_otp"],
          description: "send_otp to text a code; verify_otp after the guest reads the code.",
        },
        phone: {
          type: "STRING",
          description:
            "Guest phone for browser/web sessions. On inbound phone calls with verified caller ID in session, omit this — the server uses signaling-derived ANI.",
        },
        otp_code: {
          type: "STRING",
          description: "Required when action is verify_otp — the code the guest entered.",
        },
      },
      required: ["action"],
    },
  },

  pms_lookup_guest_journey: {
    name: "pms_lookup_guest_journey",
    description:
      "Looks up the guest in Cloudbeds by phone across recent/future reservations and classifies journey: in_house, upcoming_stay, recent_checkout, past_guest, or no_pms_match. Use after OTP verification when required. On inbound PSTN, the server uses Twilio caller ID for the lookup phone. Does not replace folio or payment advice—follow property policy.",
    parameters: {
      type: "OBJECT",
      properties: {
        phone: {
          type: "STRING",
          description:
            "Guest phone for browser sessions. Omit on inbound phone calls when session carries verified caller ID — server binds to Twilio From.",
        },
      },
      required: [],
    },
  },

  pms_get_housekeeping_status: {
    name: "pms_get_housekeeping_status",
    description:
      "Reads Cloudbeds housekeeping room status for the property (room condition, occupancy flags). For housekeeping managers and supervisors. Optional filter by room condition clean vs dirty.",
    parameters: {
      type: "OBJECT",
      properties: {
        roomCondition: {
          type: "STRING",
          enum: ["clean", "dirty"],
          description: "Optional filter.",
        },
        pageSize: {
          type: "INTEGER",
          description: "Page size (default 100, max 5000).",
        },
      },
      required: [],
    },
  },

  pms_get_hotel_dashboard: {
    name: "pms_get_hotel_dashboard",
    description:
      "Returns Cloudbeds property dashboard snapshot for a date (occupancy and operational summary fields per API). For hotel managers and GM agents.",
    parameters: {
      type: "OBJECT",
      properties: {
        date: {
          type: "STRING",
          description: "YYYY-MM-DD (defaults to today).",
        },
      },
      required: [],
    },
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

  get_booking_and_pricing_info: {
    name: "get_booking_and_pricing_info",
    description: "Returns the business website URL for current pricing and to book an appointment. Call this when the user asks for service prices, menu prices, or appointment booking and you do not have specific prices in your knowledge. The server will return the website URL; then direct the customer there clearly.",
    parameters: {
      type: "OBJECT",
      properties: {
        siteConfigId: {
          type: "STRING",
          description: "The site/business UUID (injected by server if omitted)."
        }
      },
      required: []
    }
  },

  query_knowledge_library: {
    name: "query_knowledge_library",
    description: "Searches the business's knowledge library for information relevant to the user's question. Call this when the user asks something that might be answered by uploaded documents, FAQs, policies, or other indexed content. Use the returned snippets to answer accurately.",
    parameters: {
      type: "OBJECT",
      properties: {
        question: {
          type: "STRING",
          description: "The user's question or search query to find relevant knowledge."
        },
        siteConfigId: {
          type: "STRING",
          description: "The site/business UUID (injected by server if omitted)."
        }
      },
      required: ["question"]
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
    description: "Harvest all available Google Maps reviews for a business using its stable SerpAPI data_id. Paginates automatically through the full review corpus. First 10 reviews per site are free; additional reviews billed at $1.00 each. Requires operator authorization before harvest. Reviews are classified: 4-5★ = experiences (strengths), 1-3★ = lessons (improvement areas).",
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
  },

  show_canvas: {
    name: "show_canvas",
    // LEGACY ADAPTER (p5-adapter) — This tool is preserved for backward compat during the
    // transition to the Canvas Control Syscall Layer. All invocations are routed through
    // canvasControlRoutes.ts with source:'legacy_adapter'. A WARN is logged on every call.
    // DO NOT add new canvas features via this tool. This will be removed after p5-deprecate confirms zero usage.
    // New canvas surfaces: use CanvasSyscallEnvelope with syscall:'canvas.resolve' via /api/canvas-control.
    description: "Display rich structured content in the shared canvas window so the user can read it while you speak. Use proactively whenever presenting multi-item information: service menus, appointment schedules, pricing tables, FAQ lists, intake checklists, or business summaries. The canvas stays visible until the user dismisses it.",
    parameters: {
      type: "OBJECT",
      properties: {
        canvas_type: {
          type: "STRING",
          enum: ["service_menu", "schedule", "pricing_table", "faq_list", "intake_checklist", "business_summary", "custom_card"],
          description: "The type of content layout to render."
        },
        title: {
          type: "STRING",
          description: "Heading shown at the top of the canvas card."
        },
        subtitle: {
          type: "STRING",
          description: "Optional secondary line under the title."
        },
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              label: { type: "STRING", description: "Item name or question" },
              value: { type: "STRING", description: "Item value, answer, or time slot" },
              description: { type: "STRING", description: "Supporting detail" },
              price: { type: "STRING", description: "Price string e.g. '$49/mo'" },
              duration: { type: "STRING", description: "Duration e.g. '30 min'" }
            }
          },
          description: "Array of items to display. Each item has label, value, description, price, duration (all optional except label)."
        },
        cta_label: {
          type: "STRING",
          description: "Optional call-to-action button text shown at the bottom."
        },
        cta_action: {
          type: "STRING",
          enum: ["book", "call", "form", "link"],
          description: "What happens when the CTA is tapped."
        },
        accent_color: {
          type: "STRING",
          enum: ["indigo", "emerald", "amber", "rose"],
          description: "Color accent for the card. Defaults to indigo."
        }
      },
      required: ["canvas_type", "title", "items"]
    }
  },

  get_inbound_caller_identity: {
    name: "get_inbound_caller_identity",
    description:
      "Returns whether the Twilio inbound Caller ID / CNAM skill is enabled for this site and how to use it responsibly. Does NOT return live PSTN numbers in browser voice. Caller Name is not identity verification — use guest_phone_verification / OTP before PMS or guest account details.",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "Optional short reason you are checking (e.g. greeting inbound caller).",
        },
      },
    },
  },

  set_canvas_background: {
    name: "set_canvas_background",
    description:
      "Changes the live animated canvas background to a specific effect. The user sees the new background immediately behind the frosted overlay. Use this to preview backgrounds during the conversational selection flow.",
    parameters: {
      type: "OBJECT",
      properties: {
        background_id: {
          type: "STRING",
          description: "The unique ID of the background effect. Examples: 'particles', 'sparkles', 'fireflies', 'bokeh', 'bubble', 'confetti', 'starfield', 'aurora', 'meteors', 'shooting_stars', 'constellation', 'orbits', 'rain', 'snow', 'fog', 'underwater', 'fireworks', 'grid_pattern', 'dot_pattern', 'hexagon', 'flickering_grid', 'retro_grid', 'interactive_grid', 'mesh_gradient', 'gradient', 'gradient_animation', 'vortex', 'wavy', 'light_waves', 'wave_grid', 'topography', 'paths', 'beams', 'beams_collision', 'spotlight', 'ripple', 'circles', 'matrix', 'glitch', 'neon', 'warp', 'boxes'.",
        },
      },
      required: ["background_id"],
    },
  },

  get_background_categories: {
    name: "get_background_categories",
    description:
      "Returns all available canvas background categories with their names, descriptions, and item counts. Use this when the user asks about background options or you need to navigate them through the catalog.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  get_backgrounds_in_category: {
    name: "get_backgrounds_in_category",
    description:
      "Returns all background effects within a specific category, including their IDs, labels, and effect profiles. Use this to help the user browse options within a category.",
    parameters: {
      type: "OBJECT",
      properties: {
        category_id: {
          type: "STRING",
          description: "The category ID to list backgrounds for. Valid IDs: 'particles_floating', 'space_sky', 'weather_nature', 'grids_patterns', 'gradients_color', 'waves_flow', 'light_beams', 'tech_digital'.",
        },
      },
      required: ["category_id"],
    },
  },

  save_background_as_default: {
    name: "save_background_as_default",
    description:
      "Saves the currently displayed background as the user's default desktop. Requires the user to be authenticated. If the user is anonymous, tell them you need to set up their profile first.",
    parameters: {
      type: "OBJECT",
      properties: {
        background_id: {
          type: "STRING",
          description: "The background ID to save as the user's default.",
        },
      },
      required: ["background_id"],
    },
  },

  get_screen_size: {
    name: "get_screen_size",
    description:
      "Returns the user's current viewport dimensions and device type. Use this to recommend fullscreen mode on desktop or adjust background recommendations based on screen size.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },

  update_visualizer: {
    name: "update_visualizer",
    description:
      "Change the active audio visualizer appearance in real-time. Use when user asks to change colors, style, intensity, or visualizer type. Valid types: 'circular_pulse' (radial FFT bars), 'sine_wave' (Siri-style wave), 'orb' (breathing blob). Have a conversation about what they want — ask about mood, brand colors, use case. Always show a live preview before saving.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: {
          type: "STRING",
          description: "Visualizer engine: 'circular_pulse', 'sine_wave', or 'orb'",
        },
        primaryColor: {
          type: "STRING",
          description: "CSS color for primary elements (e.g. '#00FFFF', '#FF0000')",
        },
        secondaryColor: {
          type: "STRING",
          description: "CSS color for secondary/AI-speaking elements",
        },
        opacity: {
          type: "NUMBER",
          description: "Overall opacity 0-1 (default 0.85)",
        },
        glowIntensity: {
          type: "NUMBER",
          description: "Glow strength 0-2 (default 0.6)",
        },
        barCount: {
          type: "NUMBER",
          description: "Number of frequency bars 16-128 (for circular_pulse, default 64)",
        },
        amplitudeScale: {
          type: "NUMBER",
          description: "How aggressively bars react to audio 0.5-3 (default 1.0)",
        },
        smoothing: {
          type: "NUMBER",
          description: "Animation smoothing 0-1 (default 0.7)",
        },
      },
    },
  },

  save_visualizer: {
    name: "save_visualizer",
    description:
      "Save the current visualizer configuration to the community library. Requires user authentication. Ask the user for a name and optional description. The visualizer will be shared publicly so others can discover and use it.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: {
          type: "STRING",
          description: "Name for this visualizer (e.g. 'Ocean Pulse', 'Neon Circuit')",
        },
        description: {
          type: "STRING",
          description: "Brief description of the visual style",
        },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Discovery tags like 'calm', 'energetic', 'business', 'gaming'",
        },
        is_public: {
          type: "BOOLEAN",
          description: "Whether to share with the community (default true)",
        },
      },
      required: ["name"],
    },
  },

  browse_visualizers: {
    name: "browse_visualizers",
    description:
      "Search the community visualizer library. Use when user wants to see what others have created or wants recommendations. You can search by type, popularity, or keywords.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Search term (matches name and description)",
        },
        engine_type: {
          type: "STRING",
          description: "Filter by engine: 'circular_pulse', 'sine_wave', 'orb'",
        },
        sort: {
          type: "STRING",
          description: "'popular' (most used) or 'recent' (newest first)",
        },
      },
    },
  },

  // ── Agent Management Tools (AI OS Assistant — owner-only) ─────────────
  list_agents: {
    name: "list_agents",
    description: "Lists all agents configured for the current business/site. Returns agent names, roles, status, and AI model provider. Use when the owner asks to see their agents, team, or swarm.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Filter by agent status: 'active', 'paused', 'inactive', or 'all'. Defaults to 'all'.",
        },
      },
      required: [],
    },
  },

  inspect_agent: {
    name: "inspect_agent",
    description: "Returns detailed configuration for a specific agent including system prompt, voice config, DiSC profile, knowledge status, and operational mode. Use when the owner wants to see how an agent is configured.",
    parameters: {
      type: "OBJECT",
      properties: {
        agentId: {
          type: "STRING",
          description: "The ID of the agent to inspect.",
        },
        agentName: {
          type: "STRING",
          description: "The name of the agent to inspect (used if agentId is not provided).",
        },
      },
      required: [],
    },
  },

  update_agent_prompt: {
    name: "update_agent_prompt",
    description: "Updates the system prompt for a specific agent. Use when the owner wants to change how an agent behaves, what it says, or its instructions. Returns the updated prompt for confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        agentId: {
          type: "STRING",
          description: "The ID of the agent to update.",
        },
        systemPrompt: {
          type: "STRING",
          description: "The new system prompt text to assign to this agent.",
        },
        appendMode: {
          type: "BOOLEAN",
          description: "If true, appends to the existing prompt instead of replacing it. Defaults to false.",
        },
      },
      required: ["agentId", "systemPrompt"],
    },
  },

  update_agent_knowledge: {
    name: "update_agent_knowledge",
    description: "Adds or updates a knowledge entry for a specific agent. Use when the owner wants to teach an agent something new, add business information, or update its knowledge base.",
    parameters: {
      type: "OBJECT",
      properties: {
        agentId: {
          type: "STRING",
          description: "The ID of the agent to update knowledge for.",
        },
        title: {
          type: "STRING",
          description: "Short title for the knowledge entry.",
        },
        content: {
          type: "STRING",
          description: "The knowledge content to add.",
        },
        category: {
          type: "STRING",
          description: "Category: 'business_info', 'product', 'policy', 'faq', 'procedure', or 'general'.",
        },
      },
      required: ["agentId", "title", "content"],
    },
  },

  dispatch_agent_task: {
    name: "dispatch_agent_task",
    description: "Dispatches a task to a local coding or UI agent. Use when the owner asks you to have an agent build something, fix something, or generate UI. The task runs through the governed orchestration pipeline.",
    parameters: {
      type: "OBJECT",
      properties: {
        agentRoleType: {
          type: "STRING",
          description: "The role of the agent to dispatch to: 'coding_agent' or 'ui_agent'.",
        },
        taskType: {
          type: "STRING",
          description: "Task classification: 'code', 'ui', 'governance', or 'agent'.",
        },
        prompt: {
          type: "STRING",
          description: "The task description and instructions for the agent.",
        },
        targetFile: {
          type: "STRING",
          description: "Optional target file path the agent should work on.",
        },
      },
      required: ["agentRoleType", "taskType", "prompt"],
    },
  },
};

export const generateMarketingArtifactTool = {
  name: "generate_marketing_artifact",
  description: "Creates a strategic marketing playbook or campaign artifact based on frontline review signals. Commits the strategy to the control plane database for human approval.",
  parameters: {
    type: "OBJECT",
    properties: {
      artifactType: {
        type: "STRING",
        description: "The category of the playbook: 'SMS_CAMPAIGN', 'FRONTLINE_SCRIPT_UPDATE', 'SEO_POSITIONING', or 'REPUTATION_RESPONSE'."
      },
      evidenceReviewIds: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Array of raw review_ids that justify this campaign."
      },
      evidenceSignalIds: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Array of signal_ids from the Tier-1 routing plane that prove this is a valid trend."
      },
      evidenceSummary: {
        type: "STRING",
        description: "A clinical, 2-sentence executive summary of the data trend triggering this action."
      },
      targetMetric: {
        type: "STRING",
        description: "The exact KPI this artifact is designed to move (e.g., 'Lead Conversion Rate', 'Google Review Volume')."
      },
      metricSource: {
        type: "STRING",
        description: "Where this metric is tracked (e.g., 'SerpAPI', 'Twilio Call Logs')."
      },
      frontmatter: {
        type: "OBJECT",
        description: "The actual payload of the artifact (e.g., the exact SMS copy, the updated agent prompt constraints)."
      }
    },
    required: ["artifactType", "evidenceSummary", "targetMetric", "metricSource", "frontmatter"]
  }
};
