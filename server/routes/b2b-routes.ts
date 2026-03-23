/**
 * B2B Travel OS API: itineraries, leads (hotels/flights), markups, curation events.
 * Used by the Master Orchestrator for state persistence and the Agent Curation Panel.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { b2bStorage } from "../b2b-storage";
import { firstRouteParam } from "../utils/expressParams";
import type {
  InsertB2bCurationEvent,
  InsertB2bFlight,
  InsertB2bHotel,
  InsertB2bItinerary,
} from "@shared/schema";

export function registerB2bRoutes(app: Express) {
  // --- Orchestrator: get or create in-progress itinerary for client + optional trip anchor ---
  app.get("/api/b2b/itineraries/in-progress", async (req: Request, res: Response) => {
    try {
      const clientRef = (req.query.clientRef as string) || "";
      const tripAnchor = (req.query.tripAnchor as string) || undefined;
      if (!clientRef) return res.status(400).json({ error: "clientRef required" });
      const itinerary = await b2bStorage.getInProgressItinerary(clientRef, tripAnchor);
      return res.json({ itinerary: itinerary ?? null });
    } catch (e: unknown) {
      console.error("[B2B] getInProgressItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.post("/api/b2b/itineraries", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ clientRef: z.string(), tripAnchor: z.string().optional(), thoughtState: z.unknown().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const itinerary = await b2bStorage.createItinerary({
        clientRef: parsed.data.clientRef,
        tripAnchor: parsed.data.tripAnchor ?? null,
        status: "in_progress",
        thoughtState: parsed.data.thoughtState ?? null,
      });
      return res.status(201).json(itinerary);
    } catch (e: unknown) {
      console.error("[B2B] createItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.patch("/api/b2b/itineraries/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ status: z.enum(["in_progress", "completed"]).optional(), thoughtState: z.unknown().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const id = firstRouteParam(req.params.id);
      if (!id) return res.status(400).json({ error: "Missing itinerary id" });
      const updated = await b2bStorage.updateItinerary(id, {
        status: parsed.data.status,
        thoughtState: parsed.data.thoughtState as InsertB2bItinerary["thoughtState"],
      });
      if (!updated) return res.status(404).json({ error: "Itinerary not found" });
      return res.json(updated);
    } catch (e: unknown) {
      console.error("[B2B] updateItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.get("/api/b2b/itineraries/:id", async (req: Request, res: Response) => {
    try {
      const id = firstRouteParam(req.params.id);
      if (!id) return res.status(400).json({ error: "Missing itinerary id" });
      const itinerary = await b2bStorage.getItinerary(id);
      if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });
      const items = await b2bStorage.getItineraryItems(id);
      return res.json({ itinerary, items });
    } catch (e: unknown) {
      console.error("[B2B] getItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Leads: hotels (GRN) and flights (SerpAPI) ---
  app.get("/api/b2b/hotels", async (_req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(_req.query.limit) || 50, 100);
      const hotels = await b2bStorage.listHotels(limit);
      return res.json(hotels);
    } catch (e: unknown) {
      console.error("[B2B] listHotels:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.post("/api/b2b/hotels", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ hotelCode: z.string(), googlePlaceId: z.string().optional(), name: z.string().optional(), rawResponse: z.unknown().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const hotel = await b2bStorage.createHotel({
        ...parsed.data,
        rawResponse: parsed.data.rawResponse as InsertB2bHotel["rawResponse"],
      });
      return res.status(201).json(hotel);
    } catch (e: unknown) {
      console.error("[B2B] createHotel:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  /**
   * Search hotels by POI (Google Places) and enrich with B2B/GRN data.
   * Body: { query: string, location?: { latitude, longitude }, radius?: number }
   * Returns: { results: Array<{ place: PlacesResult, grn?: B2bHotel }> }
   */
  app.post("/api/b2b/hotels/search-by-poi", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Google API key not configured" });

      const schema = z.object({
        query: z.string().min(1),
        location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
        radius: z.number().positive().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const { query, location, radius } = parsed.data;
      const textQuery = /hotel|lodging|stay|inn|resort/i.test(query) ? query : `hotels ${query}`;

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.photos",
        },
        body: JSON.stringify({
          textQuery,
          ...(location && { locationBias: { circle: { center: location, radius: radius ?? 5000 } } }),
        }),
      });

      const data = (await response.json()) as { places?: Array<{ id: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; rating?: number; userRatingCount?: number; types?: string[]; primaryType?: string; photos?: Array<{ name: string }> }> };
      if (!response.ok) {
        console.error("[B2B search-by-poi] Places API error:", data);
        return res.status(response.status).json({ error: (data as { error?: { message?: string } }).error?.message || "Places search failed", results: [] });
      }

      const places = data.places ?? [];
      const results = await Promise.all(
        places.map(async (place) => {
          const placeId = place.id;
          const grn = await b2bStorage.getHotelByGooglePlaceId(placeId);
          return {
            place: {
              placeId,
              name: place.displayName?.text ?? "Unknown",
              address: place.formattedAddress ?? "",
              location: place.location,
              rating: place.rating ?? 0,
              userRatingCount: place.userRatingCount ?? 0,
              types: place.types ?? [],
              primaryType: place.primaryType,
              photos: place.photos?.map((p) => p.name) ?? [],
            },
            grn: grn ?? undefined,
          };
        })
      );

      return res.json({ results });
    } catch (e: unknown) {
      console.error("[B2B] search-by-poi:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error", results: [] });
    }
  });

  app.get("/api/b2b/flights", async (_req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(_req.query.limit) || 50, 100);
      const flights = await b2bStorage.listFlights(limit);
      return res.json(flights);
    } catch (e: unknown) {
      console.error("[B2B] listFlights:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.post("/api/b2b/flights", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        bookingToken: z.string(),
        departureId: z.string(),
        arrivalId: z.string(),
        rawResponse: z.unknown().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const flight = await b2bStorage.createFlight({
        ...parsed.data,
        rawResponse: parsed.data.rawResponse as InsertB2bFlight["rawResponse"],
      });
      return res.status(201).json(flight);
    } catch (e: unknown) {
      console.error("[B2B] createFlight:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Itinerary items: add/remove lead, update markup (Agent Curation Panel) ---
  app.post("/api/b2b/itineraries/:id/items", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        leadType: z.enum(["hotel", "flight"]),
        hotelId: z.string().optional(),
        flightId: z.string().optional(),
        markupApplied: z.string().optional(),
        sortOrder: z.number().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const { leadType, hotelId, flightId, markupApplied, sortOrder } = parsed.data;
      if (leadType === "hotel" && !hotelId) return res.status(400).json({ error: "hotelId required for hotel lead" });
      if (leadType === "flight" && !flightId) return res.status(400).json({ error: "flightId required for flight lead" });
      const itineraryId = firstRouteParam(req.params.id);
      if (!itineraryId) return res.status(400).json({ error: "Missing itinerary id" });
      const item = await b2bStorage.addItineraryItem({
        itineraryId,
        leadType,
        hotelId: hotelId ?? null,
        flightId: flightId ?? null,
        markupApplied: markupApplied ?? null,
        sortOrder: sortOrder ?? 0,
      });
      return res.status(201).json(item);
    } catch (e: unknown) {
      console.error("[B2B] addItineraryItem:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.delete("/api/b2b/itinerary-items/:id", async (req: Request, res: Response) => {
    try {
      const id = firstRouteParam(req.params.id);
      if (!id) return res.status(400).json({ error: "Missing item id" });
      const ok = await b2bStorage.removeItineraryItem(id);
      if (!ok) return res.status(404).json({ error: "Item not found" });
      return res.status(204).send();
    } catch (e: unknown) {
      console.error("[B2B] removeItineraryItem:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.patch("/api/b2b/itinerary-items/:id/markup", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ markupApplied: z.string() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const id = firstRouteParam(req.params.id);
      if (!id) return res.status(400).json({ error: "Missing item id" });
      const item = await b2bStorage.updateItineraryItemMarkup(id, parsed.data.markupApplied);
      if (!item) return res.status(404).json({ error: "Item not found" });
      return res.json(item);
    } catch (e: unknown) {
      console.error("[B2B] updateItineraryItemMarkup:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Curation events (audit trail; record when agent drags lead or changes markup) ---
  app.post("/api/b2b/curation-events", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        itineraryId: z.string().optional(),
        leadType: z.string(),
        leadId: z.string(),
        eventType: z.enum(["added", "removed", "markup_changed"]),
        agentId: z.string().optional(),
        payload: z.unknown().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const event = await b2bStorage.recordCurationEvent({
        ...parsed.data,
        payload: parsed.data.payload as InsertB2bCurationEvent["payload"],
      });
      return res.status(201).json(event);
    } catch (e: unknown) {
      console.error("[B2B] recordCurationEvent:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.get("/api/b2b/curation-events", async (req: Request, res: Response) => {
    try {
      const itineraryId = (req.query.itineraryId as string) || undefined;
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const events = await b2bStorage.getCurationEvents(itineraryId, limit);
      return res.json({ events });
    } catch (e: unknown) {
      console.error("[B2B] getCurationEvents:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Agent markups (for AgentMarkupComponent / Whitelabel selling price) ---
  app.get("/api/b2b/markups/agent/:agentId", async (req: Request, res: Response) => {
    try {
      const agentId = firstRouteParam(req.params.agentId);
      if (!agentId) return res.status(400).json({ error: "Missing agent id" });
      const markup = await b2bStorage.getMarkupForAgent(agentId);
      return res.json({ markup: markup ?? null });
    } catch (e: unknown) {
      console.error("[B2B] getMarkupForAgent:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.post("/api/b2b/markups", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        agentId: z.string().optional(),
        agentRef: z.string().optional(),
        type: z.enum(["percentage", "flat_fee"]),
        value: z.string(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const markup = await b2bStorage.upsertMarkup(parsed.data);
      return res.status(201).json(markup);
    } catch (e: unknown) {
      console.error("[B2B] upsertMarkup:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Utility: List available Gemini models ---
  app.get("/api/b2b/gemini/models", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const modelsRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      const modelsData = await modelsRes.json();
      
      if (!modelsRes.ok) {
        return res.status(modelsRes.status).json({ 
          error: "Failed to list models", 
          details: modelsData 
        });
      }

      // Filter to only models that support generateContent
      const availableModels = (modelsData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => ({
          name: m.name,
          displayName: m.displayName,
          description: m.description,
          supportedMethods: m.supportedGenerationMethods
        }));

      return res.json({
        success: true,
        configuredModel: process.env.GEMINI_MODEL_ID || "models/gemini-2.5-flash-native-audio-preview-12-2025",
        configuredFallback: process.env.GEMINI_MODEL_FALLBACK || process.env.GEMINI_MODEL_ID,
        availableModels,
        totalCount: availableModels.length
      });
    } catch (e: unknown) {
      console.error("[B2B] gemini/models:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Event search: Gemini (date + venue) then Google Grounding (venue coords + nearest airport) ---
  app.post("/api/b2b/events/search", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ query: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const apiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_CLOUD_API_KEY ||
        process.env.GOOGLE_API_KEY;
      const placesKey =
        process.env.GOOGLE_CLOUD_API_KEY ||
        process.env.GOOGLE_PLACES_API_KEY ||
        process.env.GOOGLE_API_KEY;

      const steps: Array<{ step: string; status: string; message?: string; data?: unknown }> = [];
      let eventName = "";
      let dateOrRange = "";
      let venueName = "";
      let venueCity = "";
      let venueCountry = "";
      let venueLat: number | null = null;
      let venueLng: number | null = null;
      let venueAddress = "";
      let airportName = "";
      let airportCode = "";
      let airportLat: number | null = null;
      let airportLng: number | null = null;
      let distanceMiles: number | null = null;

      // Step 1: Gemini – extract event name, date, venue (grounding via model knowledge)
      if (!apiKey) {
        steps.push({ step: "gemini", status: "error", message: "GEMINI_API_KEY or GOOGLE_CLOUD_API_KEY not configured" });
        return res.status(500).json({ error: "API key not configured", steps });
      }

      const geminiPrompt = `You are a travel research assistant. The user is searching for an event.

Query: "${parsed.data.query}"

Using your knowledge of real-world events, respond with a JSON object only (no markdown, no code block). Use this exact structure:
{
  "eventName": "Official name of the event",
  "dateOrRange": "Single date (e.g. Feb 15, 2026) or date range (e.g. Feb 6–22, 2026)",
  "venueName": "Exact name of the main venue or stadium",
  "venueCity": "City name",
  "venueCountry": "Country name"
}

If the query is ambiguous or you cannot determine a real event/venue, set "eventName" to "" and "venueName" to "".`;

      const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || "models/gemini-2.5-flash-native-audio-preview-12-2025";
      const GEMINI_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || process.env.GEMINI_MODEL_ID;

      let geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        }
      );

      let resText = await geminiRes.text();

      // If primary model fails, try fallback model
      if (!geminiRes.ok && GEMINI_MODEL_FALLBACK) {
        steps.push({ 
          step: "gemini", 
          status: "warning", 
          message: `${GEMINI_MODEL_ID} failed (${geminiRes.status}), trying fallback ${GEMINI_MODEL_FALLBACK}`,
          data: resText.slice(0, 200) 
        });
        
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_FALLBACK}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );
        resText = await geminiRes.text();
      }

      if (!geminiRes.ok) {
        steps.push({ step: "gemini", status: "error", message: `Gemini models failed (${geminiRes.status})`, data: resText.slice(0, 400) });
        return res.status(502).json({ error: "Gemini request failed", steps });
      }

      let geminiText = "";
      try {
        const geminiData = JSON.parse(resText) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { message?: string };
        };
        geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (!geminiText) {
          const errMsg = geminiData.error?.message ?? "Gemini returned no content";
          steps.push({ step: "gemini", status: "error", message: errMsg, data: resText.slice(0, 400) });
          return res.status(502).json({ error: "Gemini request failed", steps });
        }
      } catch {
        steps.push({ step: "gemini", status: "error", message: "Invalid Gemini response", data: resText.slice(0, 400) });
        return res.status(502).json({ error: "Gemini request failed", steps });
      }

      let extracted: { eventName?: string; dateOrRange?: string; venueName?: string; venueCity?: string; venueCountry?: string } = {};
      try {
        extracted = JSON.parse(geminiText) as typeof extracted;
      } catch {
        steps.push({ step: "gemini", status: "error", message: "Invalid JSON from Gemini", data: geminiText.slice(0, 200) });
        return res.status(502).json({ error: "Gemini returned invalid JSON", steps });
      }

      eventName = extracted.eventName ?? "";
      dateOrRange = extracted.dateOrRange ?? "";
      venueName = extracted.venueName ?? "";
      venueCity = extracted.venueCity ?? "";
      venueCountry = extracted.venueCountry ?? "";
      steps.push({
        step: "gemini",
        status: "ok",
        message: "Date and venue extracted",
        data: { eventName, dateOrRange, venueName, venueCity, venueCountry },
      });

      if (!venueName && !venueCity) {
        return res.json({
          success: true,
          event: { eventName, dateOrRange, venueName, venueCity, venueCountry },
          venueCoords: null,
          nearestAirport: null,
          steps,
        });
      }

      // Step 2: Google Places – venue coordinates (text search)
      if (!placesKey) {
        steps.push({ step: "venue_coords", status: "error", message: "Google Places API key not configured" });
        return res.status(500).json({ error: "Places API key not configured", steps });
      }

      const venueQuery = [venueName, venueCity, venueCountry].filter(Boolean).join(", ");
      const placeRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": placesKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({ textQuery: venueQuery }),
      });

      const placeData = (await placeRes.json()) as {
        places?: Array<{
          location?: { latitude?: number; longitude?: number };
          formattedAddress?: string;
          displayName?: { text?: string };
        }>;
      };
      const firstPlace = placeData.places?.[0];
      if (firstPlace?.location?.latitude != null && firstPlace?.location?.longitude != null) {
        venueLat = firstPlace.location.latitude;
        venueLng = firstPlace.location.longitude;
        venueAddress = firstPlace.formattedAddress ?? "";
        steps.push({
          step: "venue_coords",
          status: "ok",
          message: "Venue coordinates found",
          data: { lat: venueLat, lng: venueLng, formattedAddress: venueAddress },
        });
      } else {
        steps.push({ step: "venue_coords", status: "error", message: "No place found for venue" });
      }

      // Step 3: Nearest airport (Places text search with location bias)
      if (venueLat != null && venueLng != null) {
        // Try searching for "international airport" near the venue city
        const airportQuery = `international airport near ${venueCity || venueCountry}`;
        const airportRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": placesKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
          },
          body: JSON.stringify({
            textQuery: airportQuery,
            locationBias: {
              circle: {
                center: { latitude: venueLat, longitude: venueLng },
                radius: 150000, // Increased to 150km
              },
            },
            maxResultCount: 5, // Get top 5 results to find best match
          }),
        });

        const airportData = (await airportRes.json()) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
            types?: string[];
          }>;
          error?: { message?: string };
        };
        
        // Log error if API call failed
        if (airportData.error) {
          steps.push({ 
            step: "nearest_airport", 
            status: "error", 
            message: `Airport search API error: ${airportData.error.message}`,
            data: airportData.error
          });
        } else if (!airportData.places || airportData.places.length === 0) {
          steps.push({ 
            step: "nearest_airport", 
            status: "error", 
            message: "No airport found in search results",
            data: { query: airportQuery, resultsCount: 0 }
          });
        } else {
          // Find the first result that's actually an airport
          const firstAirport = airportData.places.find(p => 
            p.types?.includes("airport") || 
            p.displayName?.text?.toLowerCase().includes("airport")
          ) || airportData.places[0];
          
          if (firstAirport?.location?.latitude != null && firstAirport?.location?.longitude != null) {
            airportLat = firstAirport.location.latitude;
            airportLng = firstAirport.location.longitude;
            airportName = firstAirport.displayName?.text ?? "Airport";
            airportCode = firstAirport.id?.slice(-4) ?? "";
            // Haversine approx distance in miles
            const R = 3959;
            const dLat = ((airportLat - venueLat) * Math.PI) / 180;
            const dLng = ((airportLng - venueLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((venueLat * Math.PI) / 180) *
                Math.cos((airportLat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2;
            distanceMiles = Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
            steps.push({
              step: "nearest_airport",
              status: "ok",
              message: "Nearest airport found",
              data: { name: airportName, code: airportCode, lat: airportLat, lng: airportLng, distanceMiles },
            });
          } else {
            steps.push({ 
              step: "nearest_airport", 
              status: "error", 
              message: "Airport found but missing location data",
              data: { resultsCount: airportData.places.length }
            });
          }
        }
      }

      return res.json({
        success: true,
        event: { eventName, dateOrRange, venueName, venueCity, venueCountry },
        venueCoords:
          venueLat != null && venueLng != null
            ? { lat: venueLat, lng: venueLng, formattedAddress: venueAddress }
            : null,
        nearestAirport:
          airportName && airportLat != null && airportLng != null
            ? { name: airportName, code: airportCode, lat: airportLat, lng: airportLng, distanceMiles }
            : null,
        steps,
      });
    } catch (e: unknown) {
      console.error("[B2B] events/search:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });
}
