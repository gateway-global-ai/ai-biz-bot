/**
 * Agent Portal – Unified controller: Olympic MapDisplay + search modals + B2B OS.
 * Corporate Lock white theme; restores session from Postgres; production ItinerarySidebar with markup slider.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { B2bMap, type MapMarker } from "@/components/B2bMap";
import MapDisplay from "@/components/MapDisplay";
import ItinerarySidebar, { type DayForSidebar } from "@/components/ItinerarySidebar";
import { HotelSearchModalB2b } from "@/components/showcase/HotelSearchModalB2b";
import { FlightSearchModalB2b } from "@/components/showcase/FlightSearchModalB2b";
import { EventSearchPanel } from "@/components/showcase/EventSearchPanel";
import type { DayItinerary, Poi } from "@/types/olympic";
import { LocationType } from "@/types/olympic";
import { MapPin, Plane } from "lucide-react";

const CLIENT_REF = "test-b2b-demo";
const API = "/api/b2b";
const DEFAULT_COORD = { lat: 25.0782, lng: 55.1342 };

export default function AgentPortal() {
  const [activeItineraryId, setActiveItineraryId] = useState<string | null>(null);
  const [days, setDays] = useState<DayForSidebar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activePoiId, setActivePoiId] = useState<string | null>(null);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [flightModalOpen, setFlightModalOpen] = useState(false);
  const [hotelSearchLocation, setHotelSearchLocation] = useState("");
  const [hotelSearchCoords, setHotelSearchCoords] = useState<{ lat: number; lng: number } | null>(null);

  const refreshItinerary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/itineraries/in-progress?clientRef=${encodeURIComponent(CLIENT_REF)}`);
      let data: { itinerary?: { id: string; tripAnchor?: string } } = {};
      try {
        const text = await res.text();
        data = text.length ? JSON.parse(text) : {};
      } catch {
        setError("Server returned invalid response. Is the API running?");
        setDays([]);
        return;
      }
      if (data.itinerary) {
        setActiveItineraryId(data.itinerary.id);
        const r2 = await fetch(`${API}/itineraries/${data.itinerary.id}`);
        let d2: { items?: unknown[] } = {};
        try {
          d2 = await r2.json();
        } catch {
          setError("Invalid response loading itinerary.");
          setDays([]);
          return;
        }
        const rawItems = (d2.items || []) as Array<{
          id: string;
          leadType: string;
          hotelId?: string | null;
          flightId?: string | null;
          markupApplied?: string | null;
        }>;
        const leads = await loadLeadsForItems(rawItems);
        const pois = rawItems.map((i) => {
          const lead = leads.find((l) => l.id === i.hotelId || l.id === i.flightId);
          const netRate = lead?.netRate ?? 0;
          const markup = i.markupApplied ?? "15";
          return {
            id: i.id,
            name: lead?.name ?? (i.leadType === "hotel" ? "Hotel" : "Flight"),
            price: netRate,
            markup_applied: Number(markup) || 15,
            type: (i.leadType === "hotel" ? "hotel" : "flight") as "hotel" | "flight",
          };
        });
        setDays([
          {
            dayNumber: 1,
            date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            title: data.itinerary.tripAnchor ?? "Itinerary",
            description: "GRN Connect – Net rate locked; adjust markup to see selling price.",
            pois,
          },
        ]);
      } else {
        const create = await fetch(`${API}/itineraries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientRef: CLIENT_REF, tripAnchor: "Dubai Marina" }),
        });
        let created: { id: string; tripAnchor?: string } = { id: "" };
        try {
          created = await create.json();
        } catch {
          setError("Could not create itinerary. Is the API running?");
          setDays([]);
          return;
        }
        setActiveItineraryId(created.id);
        setDays([
          {
            dayNumber: 1,
            date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            title: created.tripAnchor ?? "Itinerary",
            description: "Add hotels to see them here with live B2B markup and commission tracking.",
            pois: [],
          },
        ]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load itinerary");
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeadsForItems = async (
    rawItems: Array<{ hotelId?: string | null; flightId?: string | null }>
  ): Promise<Array<{ id: string; name: string; netRate: number }>> => {
    const wantHotelIds = new Set(rawItems.map((i) => i.hotelId).filter(Boolean)) as Set<string>;
    const wantFlightIds = new Set(rawItems.map((i) => i.flightId).filter(Boolean)) as Set<string>;
    const out: Array<{ id: string; name: string; netRate: number }> = [];
    if (wantHotelIds.size) {
      const hotels = await fetch(`${API}/hotels`).then((r) => (r.ok ? r.json() : []));
      hotels.forEach((h: { id: string; name?: string | null; hotelCode?: string; rawResponse?: { net_price?: number } }) => {
        if (wantHotelIds.has(h.id))
          out.push({
            id: h.id,
            name: h.name || h.hotelCode || "Hotel",
            netRate: Number(h.rawResponse?.net_price) || 0,
          });
      });
    }
    if (wantFlightIds.size) {
      const flights = await fetch(`${API}/flights`).then((r) => (r.ok ? r.json() : []));
      flights.forEach((f: { id: string; rawResponse?: { net_price?: number } }) => {
        if (wantFlightIds.has(f.id))
          out.push({
            id: f.id,
            name: (f.rawResponse as { airline?: string })?.airline ?? "Flight",
            netRate: Number((f.rawResponse as { net_price?: number })?.net_price) || 0,
          });
      });
    }
    return out;
  };

  useEffect(() => {
    refreshItinerary();
  }, [refreshItinerary]);

  useEffect(() => {
    fetch("/api/config/maps-key")
      .then((r) => (r.ok ? r.json() : { key: null }))
      .then((d) => setMapsKey(d?.key ?? null))
      .catch(() => setMapsKey(null));
  }, []);

  const handleExportPdf = useCallback(() => {
    const lines = ["Itinerary OS – Confidential", `Client: ${CLIENT_REF}`, ""];
    days.forEach((day) => {
      day.pois.forEach((poi, i) => {
        const pct = Number(poi.markup_applied) || 15;
        const selling = (poi.price ?? 0) * (1 + pct / 100);
        lines.push(`${i + 1}. ${poi.name} | Net $${(poi.price ?? 0).toFixed(0)} | Selling $${selling.toFixed(0)}`);
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itinerary-${CLIENT_REF}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [days]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return days.flatMap((d) =>
      d.pois.map((p) => ({ ...DEFAULT_COORD, name: p.name, id: p.id }))
    );
  }, [days]);

  const allDaysOlympic: DayItinerary[] = useMemo(() => {
    return days.map((d) => ({
      dayNumber: d.dayNumber,
      date: d.date ?? "",
      title: d.title,
      description: d.description ?? "",
      pois: d.pois.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type === "flight" ? LocationType.FLIGHT_START : LocationType.HOTEL,
        description: p.type === "hotel" ? "Hotel lead" : "Flight lead",
        coordinates: DEFAULT_COORD,
        price: p.price,
        currency: "USD",
      })) as Poi[],
    }));
  }, [days]);

  const selectedDayOlympic = allDaysOlympic[selectedDayNumber - 1] ?? allDaysOlympic[0] ?? {
    dayNumber: 1,
    date: "",
    title: "Itinerary",
    description: "",
    pois: [],
  };

  const handleBookHotel = useCallback((poi: Poi) => {
    setHotelSearchLocation(poi.name);
    setHotelModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        <p className="text-slate-600">Loading itinerary…</p>
        <p className="text-xs text-slate-400">Ensure the server is running and /api/b2b is reachable.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white p-6">
        <p className="text-center text-red-600 font-medium">{error}</p>
        <button
          type="button"
          onClick={() => { setError(null); setLoading(true); refreshItinerary(); }}
          className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-white font-bold text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 relative">
        {mapsKey ? (
          <MapDisplay
            mapsApiKey={mapsKey}
            selectedDay={selectedDayOlympic}
            allDays={allDaysOlympic}
            isDarkMode={false}
            onSelectDay={(day) => setSelectedDayNumber(day.dayNumber)}
            activePoiId={activePoiId ?? undefined}
            onPoiSelect={(id) => setActivePoiId(id)}
            onBookHotel={handleBookHotel}
          />
        ) : (
          <B2bMap markers={mapMarkers} />
        )}
      </div>
      <div className="w-[400px] border-l border-slate-200 flex flex-col shadow-2xl z-10">
        <div className="p-4 bg-[#1E3A8A] text-white flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="font-bold tracking-tight">AGENT PORTAL</h1>
            <button
              type="button"
              onClick={handleExportPdf}
              className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg"
            >
              EXPORT PDF
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setHotelSearchLocation(days[0]?.title ?? ""); setHotelSearchCoords(null); setHotelModalOpen(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white py-1.5 rounded text-xs font-bold"
            >
              <MapPin className="w-3.5 h-3.5" /> Search hotels
            </button>
            {/* Flight functionality hidden - focus on hotel commissions only */}
            {/* <button
              type="button"
              onClick={() => setFlightModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 text-white py-1.5 rounded text-xs font-bold"
            >
              <Plane className="w-3.5 h-3.5" /> Add flight
            </button> */}
          </div>
        </div>
        <EventSearchPanel
          onUseForHotelSearch={(name, coords) => {
            setHotelSearchLocation(name);
            setHotelSearchCoords(coords);
            setHotelModalOpen(true);
          }}
        />
        <ItinerarySidebar
          days={days}
          isEditable
          onMarkupUpdated={() => refreshItinerary()}
        />
      </div>
      <HotelSearchModalB2b
        isOpen={hotelModalOpen}
        onClose={() => { setHotelModalOpen(false); setHotelSearchLocation(""); setHotelSearchCoords(null); }}
        locationName={hotelSearchLocation}
        location={hotelSearchCoords}
        radiusMeters={3218}
        onAdded={refreshItinerary}
      />
      <FlightSearchModalB2b
        isOpen={flightModalOpen}
        onClose={() => setFlightModalOpen(false)}
        onAdded={refreshItinerary}
      />
    </div>
  );
}
