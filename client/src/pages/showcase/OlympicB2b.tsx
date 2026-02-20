/**
 * Olympic Experience – Corporate Lock UI wired to B2B OS.
 * Full S-Class ItinerarySidebar with B2B Markup Slider in every POI card; map + persistence.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { B2bMap, type MapMarker } from "@/components/B2bMap";
import { ItinerarySidebarOlympic } from "@/components/showcase/ItinerarySidebarOlympic";
import type { DayItinerary, Poi, B2bPoiBinding } from "@/types/olympic";
import { LocationType } from "@/types/olympic";
import { MapPin, Search, Loader2 } from "lucide-react";

const CLIENT_REF = "test-b2b-demo";
const API = "/api/b2b";

type PoiPlace = { placeId: string; name: string; address: string; rating: number; location?: { latitude: number; longitude: number } };
type GrnHotel = { id: string; hotelCode: string; name?: string | null; rawResponse?: unknown };
type PoiSearchResult = { place: PoiPlace; grn?: GrnHotel };

export default function OlympicB2b() {
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [tripAnchor, setTripAnchor] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id: string; leadType: "hotel" | "flight"; name: string; netRate: number; markupApplied: string; hotelId?: string | null; flightId?: string | null }>>([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [poiQuery, setPoiQuery] = useState("");
  const [poiResults, setPoiResults] = useState<PoiSearchResult[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const loadItinerary = useCallback(async () => {
    try {
      const r = await fetch(`${API}/itineraries/in-progress?clientRef=${encodeURIComponent(CLIENT_REF)}`);
      const d = await r.json();
      if (d.itinerary) {
        setItineraryId(d.itinerary.id);
        setTripAnchor(d.itinerary.tripAnchor ?? null);
        const r2 = await fetch(`${API}/itineraries/${d.itinerary.id}`);
        const d2 = await r2.json();
        const rawItems = (d2.items || []) as Array<{
          id: string;
          leadType: string;
          hotelId?: string | null;
          flightId?: string | null;
          markupApplied?: string | null;
        }>;
        const leads = await loadLeadsForItems(rawItems);
        const list = rawItems.map((i) => {
          const lead = leads.find((l) => l.id === i.hotelId || l.id === i.flightId);
          return {
            id: i.id,
            leadType: i.leadType as "hotel" | "flight",
            name: lead?.name ?? (i.leadType === "hotel" ? "Hotel" : "Flight"),
            netRate: lead?.netRate ?? 0,
            markupApplied: i.markupApplied ?? "0",
            hotelId: i.hotelId ?? null,
            flightId: i.flightId ?? null,
          };
        });
        setItems(list);
        return d.itinerary.id;
      }
      const create = await fetch(`${API}/itineraries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRef: CLIENT_REF, tripAnchor: "Dubai Marina" }),
      });
      const created = await create.json();
      setItineraryId(created.id);
      setTripAnchor(created.tripAnchor ?? "Dubai Marina");
      setItems([]);
      return created.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load itinerary");
      return null;
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
      flights.forEach((f: { id: string; rawResponse?: { airline?: string; net_price?: number }; departureId?: string; arrivalId?: string }) => {
        if (wantFlightIds.has(f.id))
          out.push({
            id: f.id,
            name: (f.rawResponse?.airline as string) || `${f.departureId || "?"} → ${f.arrivalId || "?"}`,
            netRate: Number(f.rawResponse?.net_price) || 0,
          });
      });
    }
    return out;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadItinerary().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [loadItinerary]);

  const handleSaveToItinerary = useCallback(
    async (item: { id?: string; hotelId?: string; name: string; netRate?: number }, type: "hotel" | "flight") => {
      if (!itineraryId) return;
      let leadId = type === "hotel" ? item.hotelId ?? item.id : item.hotelId ?? item.id;
      if (!leadId && type === "hotel") {
        const createRes = await fetch(`${API}/hotels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelCode: "GRN-" + (item.id ?? Date.now()),
            name: item.name,
            rawResponse: { net_price: item.netRate ?? 0 },
          }),
        });
        if (!createRes.ok) return;
        const created = await createRes.json();
        leadId = created.id;
      }
      if (!leadId) return;
      const body = type === "hotel"
        ? { leadType: "hotel", hotelId: leadId, markupApplied: "15" }
        : { leadType: "flight", flightId: leadId, markupApplied: "15" };
      const r = await fetch(`${API}/itineraries/${itineraryId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) return;
      await loadItinerary();
    },
    [itineraryId, loadItinerary]
  );

  const addPoiResultToItinerary = useCallback(
    async (result: PoiSearchResult) => {
      const { place, grn } = result;
      let hotelId: string;
      let name = place.name;
      let netRate = 0;
      if (grn) {
        hotelId = grn.id;
        name = grn.name || place.name;
        netRate = Number((grn.rawResponse as { net_price?: number })?.net_price) || 0;
      } else {
        const createRes = await fetch(`${API}/hotels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelCode: "GRN-" + place.placeId.replace(/\//g, "-").slice(-24),
            googlePlaceId: place.placeId,
            name: place.name,
            rawResponse: { rating: place.rating, address: place.address },
          }),
        });
        if (!createRes.ok) {
          setPoiError("Failed to add hotel");
          return;
        }
        const created = await createRes.json();
        hotelId = created.id;
      }
      await handleSaveToItinerary({ id: hotelId, hotelId, name, netRate }, "hotel");
      setIsSearchOpen(false);
      setPoiResults([]);
    },
    [handleSaveToItinerary]
  );

  const searchHotelsByPoi = useCallback(async () => {
    const q = poiQuery.trim();
    if (!q) return;
    setPoiError(null);
    setPoiLoading(true);
    setPoiResults([]);
    try {
      const r = await fetch(`${API}/hotels/search-by-poi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await r.json();
      if (!r.ok) {
        setPoiError(data.error || "Search failed");
        return;
      }
      setPoiResults(data.results || []);
    } catch (e) {
      setPoiError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setPoiLoading(false);
    }
  }, [poiQuery]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    return poiResults
      .filter((r) => r.place.location?.latitude != null && r.place.location?.longitude != null)
      .map((r) => ({
        lat: r.place.location!.latitude,
        lng: r.place.location!.longitude,
        name: r.place.name,
        id: r.place.placeId,
      }));
  }, [poiResults]);

  const removeItem = useCallback(async (itemId: string) => {
    await fetch(`${API}/itinerary-items/${itemId}`, { method: "DELETE" });
    await loadItinerary();
  }, [loadItinerary]);

  const defaultCoord = { lat: 25.0782, lng: 55.1342 };

  const days: DayItinerary[] = useMemo(() => {
    if (items.length === 0) {
      return [
        {
          dayNumber: 1,
          date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
          title: tripAnchor ?? "Itinerary",
          description: "Add hotels and flights from search to see them here with live B2B markup.",
          pois: [],
        },
      ];
    }
    return [
      {
        dayNumber: 1,
        date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        title: tripAnchor ?? "Itinerary",
        description: "GRN Connect – Net rate locked; adjust markup to see selling price.",
        pois: items.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.leadType === "hotel" ? LocationType.HOTEL : LocationType.FLIGHT_START,
          description: i.leadType === "hotel" ? "Hotel lead" : "Flight lead",
          coordinates: defaultCoord,
          price: i.netRate,
          currency: "USD",
        })) as Poi[],
      },
    ];
  }, [items, tripAnchor]);

  const b2bByPoiId: Record<string, B2bPoiBinding> = useMemo(() => {
    const out: Record<string, B2bPoiBinding> = {};
    items.forEach((i) => {
      out[i.id] = { itemId: i.id, markupApplied: i.markupApplied, netRate: i.netRate };
    });
    return out;
  }, [items]);

  const exportPdf = useCallback(() => {
    const lines = ["Itinerary OS – Confidential", `Client: ${CLIENT_REF}`, `Anchor: ${tripAnchor ?? "—"}`, ""];
    items.forEach((item, i) => {
      const pct = Number(item.markupApplied) || 0;
      const selling = item.netRate * (1 + pct / 100);
      lines.push(`${i + 1}. ${item.name} | Net $${item.netRate.toFixed(0)} | Selling $${selling.toFixed(0)}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itinerary-${CLIENT_REF}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items, tripAnchor]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-red-600 p-6">
        Error: {error}. Ensure server is running and B2B routes are registered.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* Map – Olympic grounded view */}
      <div className="flex-1 relative flex flex-col">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-md hover:bg-slate-50 text-slate-700 font-medium"
          >
            <Search className="w-4 h-4" />
            Search hotels
          </button>
        </div>
        {isSearchOpen && (
          <div className="absolute top-14 left-4 right-4 md:right-auto md:w-96 z-10 bg-white rounded-xl border border-slate-200 shadow-xl p-4">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={poiQuery}
                  onChange={(e) => setPoiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchHotelsByPoi()}
                  placeholder="City or area (e.g. Dubai Marina)"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={searchHotelsByPoi}
                disabled={poiLoading || !poiQuery.trim()}
                className="px-4 py-2 rounded-lg bg-[#1E3A8A] text-white font-medium disabled:opacity-50"
              >
                {poiLoading ? "…" : "Search"}
              </button>
            </div>
            {poiError && <p className="text-red-500 text-sm mb-2">{poiError}</p>}
            {poiResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {poiResults.map((r) => (
                  <div
                    key={r.place.placeId}
                    className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{r.place.name}</div>
                      <div className="text-xs text-slate-500 truncate">{r.place.address}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addPoiResultToItinerary(r)}
                      className="shrink-0 ml-2 text-xs px-3 py-1.5 rounded bg-[#E91E63] text-white font-medium"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-h-[320px]">
          <B2bMap
            markers={mapMarkers}
            height="100%"
            className="w-full h-full min-h-[320px] rounded-none"
          />
        </div>
      </div>

      {/* Itinerary OS – S-Class sidebar with B2B Markup Slider in POI cards */}
      <div className="w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl shrink-0">
        <div className="p-4 bg-[#1E3A8A] text-white flex justify-between items-center shrink-0">
          <h2 className="font-bold">Itinerary OS</h2>
          <button
            type="button"
            onClick={exportPdf}
            className="bg-[#E91E63] px-3 py-1 rounded text-xs font-bold hover:bg-[#d81b60] transition-colors"
          >
            Export PDF
          </button>
        </div>
        <ItinerarySidebarOlympic
          days={days}
          selectedDayNumber={selectedDayNumber}
          onSelectDay={(d) => setSelectedDayNumber(d.dayNumber)}
          b2bByPoiId={b2bByPoiId}
          onMarkupSaved={() => loadItinerary()}
        />
      </div>
    </div>
  );
}
