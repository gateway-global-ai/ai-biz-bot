/**
 * B2B Travel OS API: itineraries, leads (hotels/flights), markups, curation events.
 * Used by the Master Orchestrator for state persistence and the Agent Curation Panel.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { b2bStorage } from "../b2b-storage";

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
      const updated = await b2bStorage.updateItinerary(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ error: "Itinerary not found" });
      return res.json(updated);
    } catch (e: unknown) {
      console.error("[B2B] updateItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  app.get("/api/b2b/itineraries/:id", async (req: Request, res: Response) => {
    try {
      const itinerary = await b2bStorage.getItinerary(req.params.id);
      if (!itinerary) return res.status(404).json({ error: "Itinerary not found" });
      const items = await b2bStorage.getItineraryItems(req.params.id);
      return res.json({ itinerary, items });
    } catch (e: unknown) {
      console.error("[B2B] getItinerary:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
    }
  });

  // --- Leads: hotels (GRN) and flights (SerpAPI) ---
  app.post("/api/b2b/hotels", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ hotelCode: z.string(), googlePlaceId: z.string().optional(), name: z.string().optional(), rawResponse: z.unknown().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const hotel = await b2bStorage.createHotel(parsed.data);
      return res.status(201).json(hotel);
    } catch (e: unknown) {
      console.error("[B2B] createHotel:", e);
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
      const flight = await b2bStorage.createFlight(parsed.data);
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
      const item = await b2bStorage.addItineraryItem({
        itineraryId: req.params.id,
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
      const ok = await b2bStorage.removeItineraryItem(req.params.id);
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
      const item = await b2bStorage.updateItineraryItemMarkup(req.params.id, parsed.data.markupApplied);
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
      const event = await b2bStorage.recordCurationEvent(parsed.data);
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
      const markup = await b2bStorage.getMarkupForAgent(req.params.agentId);
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
}
