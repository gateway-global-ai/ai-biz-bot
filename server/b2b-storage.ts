/**
 * B2B Travel OS – storage for GRN Connect hotels, SerpAPI flights, itineraries, markups, and curation events.
 * System of record for the Agent Curation Panel and Master Orchestrator state.
 */
import {
  b2bHotels,
  b2bFlights,
  b2bAgentMarkups,
  b2bItineraries,
  b2bItineraryItems,
  b2bCurationEvents,
  type InsertB2bHotel,
  type InsertB2bFlight,
  type InsertB2bAgentMarkup,
  type InsertB2bItinerary,
  type InsertB2bItineraryItem,
  type InsertB2bCurationEvent,
  type B2bItinerary,
  type B2bItineraryItem,
  type B2bHotel,
  type B2bFlight,
  type B2bAgentMarkup,
  type B2bCurationEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export const b2bStorage = {
  // --- Hotels (GRN) ---
  createHotel(data: InsertB2bHotel): Promise<B2bHotel> {
    return db.insert(b2bHotels).values(data).returning().then(([r]) => r);
  },
  getHotel(id: string) {
    return db.select().from(b2bHotels).where(eq(b2bHotels.id, id)).then(([r]) => r);
  },
  getHotelByCode(hotelCode: string) {
    return db.select().from(b2bHotels).where(eq(b2bHotels.hotelCode, hotelCode)).then(([r]) => r);
  },

  // --- Flights (SerpAPI) ---
  createFlight(data: InsertB2bFlight): Promise<B2bFlight> {
    return db.insert(b2bFlights).values(data).returning().then(([r]) => r);
  },
  getFlight(id: string) {
    return db.select().from(b2bFlights).where(eq(b2bFlights.id, id)).then(([r]) => r);
  },

  // --- Agent markups ---
  getMarkupForAgent(agentId: string) {
    return db.select().from(b2bAgentMarkups).where(eq(b2bAgentMarkups.agentId, agentId)).orderBy(desc(b2bAgentMarkups.updatedAt)).limit(1).then(([r]) => r);
  },
  upsertMarkup(data: InsertB2bAgentMarkup): Promise<B2bAgentMarkup> {
    return db.insert(b2bAgentMarkups).values({ ...data, updatedAt: new Date() }).returning().then(([r]) => r);
  },

  // --- Itineraries (orchestrator state: in-progress per client + trip anchor) ---
  async getInProgressItinerary(clientRef: string, tripAnchor?: string): Promise<B2bItinerary | undefined> {
    const conditions = tripAnchor
      ? and(eq(b2bItineraries.clientRef, clientRef), eq(b2bItineraries.status, "in_progress"), eq(b2bItineraries.tripAnchor, tripAnchor))
      : and(eq(b2bItineraries.clientRef, clientRef), eq(b2bItineraries.status, "in_progress"));
    const rows = await db.select().from(b2bItineraries).where(conditions).orderBy(desc(b2bItineraries.updatedAt)).limit(1);
    return rows[0];
  },
  createItinerary(data: InsertB2bItinerary): Promise<B2bItinerary> {
    return db.insert(b2bItineraries).values(data).returning().then(([r]) => r);
  },
  updateItinerary(id: string, updates: Partial<InsertB2bItinerary> & { thoughtState?: unknown }): Promise<B2bItinerary | undefined> {
    return db.update(b2bItineraries).set({ ...updates, updatedAt: new Date() }).where(eq(b2bItineraries.id, id)).returning().then(([r]) => r);
  },
  getItinerary(id: string): Promise<B2bItinerary | undefined> {
    return db.select().from(b2bItineraries).where(eq(b2bItineraries.id, id)).then(([r]) => r);
  },
  getItineraryItems(itineraryId: string): Promise<B2bItineraryItem[]> {
    return db.select().from(b2bItineraryItems).where(eq(b2bItineraryItems.itineraryId, itineraryId)).orderBy(b2bItineraryItems.sortOrder);
  },

  // --- Itinerary items (leads in itinerary) ---
  addItineraryItem(data: InsertB2bItineraryItem): Promise<B2bItineraryItem> {
    return db.insert(b2bItineraryItems).values(data).returning().then(([r]) => r);
  },
  removeItineraryItem(id: string): Promise<boolean> {
    return db.delete(b2bItineraryItems).where(eq(b2bItineraryItems.id, id)).then((r) => (r.rowCount ?? 0) > 0);
  },
  updateItineraryItemMarkup(id: string, markupApplied: string): Promise<B2bItineraryItem | undefined> {
    return db.update(b2bItineraryItems).set({ markupApplied }).where(eq(b2bItineraryItems.id, id)).returning().then(([r]) => r);
  },

  // --- Curation events (audit trail for lead scoring / GRN) ---
  recordCurationEvent(data: InsertB2bCurationEvent): Promise<B2bCurationEvent> {
    return db.insert(b2bCurationEvents).values(data).returning().then(([r]) => r);
  },
  async getCurationEvents(itineraryId?: string, limit = 100): Promise<B2bCurationEvent[]> {
    const q = itineraryId
      ? db.select().from(b2bCurationEvents).where(eq(b2bCurationEvents.itineraryId, itineraryId))
      : db.select().from(b2bCurationEvents);
    return q.orderBy(desc(b2bCurationEvents.createdAt)).limit(limit);
  },
};
