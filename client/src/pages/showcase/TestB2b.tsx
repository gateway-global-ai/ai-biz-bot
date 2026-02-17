/**
 * B2B Agent Portal Test Page: POI hotel search (Google Places + GRN), map, and itinerary.
 * - Search hotels by location; results shown on map and as cards with GRN enrichment.
 * - Drag leads into Itinerary Canvas; adjust commission via Markup slider.
 */
import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";

const B2bMap = lazy(() => import("@/components/B2bMap").then((m) => ({ default: m.B2bMap })));
type MapMarker = { lat: number; lng: number; name: string; id?: string };

const CLIENT_REF = "test-b2b-demo";
const API = "/api/b2b";

type Lead = { id: string; type: "hotel" | "flight"; name: string; netRate: number; hotelId?: string; flightId?: string };
type ItineraryItem = {
  id: string;
  leadType: string;
  hotelId: string | null;
  flightId: string | null;
  markupApplied: string | null;
  lead?: Lead;
};

type PoiPlace = { placeId: string; name: string; address: string; rating: number; userRatingCount?: number; types?: string[]; primaryType?: string; photos?: string[]; location?: { latitude: number; longitude: number } };
type GrnHotel = { id: string; hotelCode: string; name?: string | null; rawResponse?: unknown };
type PoiSearchResult = { place: PoiPlace; grn?: GrnHotel };

export default function TestB2b() {
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poiQuery, setPoiQuery] = useState("");
  const [poiResults, setPoiResults] = useState<PoiSearchResult[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);

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

  const loadItinerary = useCallback(async () => {
    try {
      const r = await fetch(`${API}/itineraries/in-progress?clientRef=${encodeURIComponent(CLIENT_REF)}`);
      const d = await r.json();
      if (d.itinerary) {
        setItineraryId(d.itinerary.id);
        const r2 = await fetch(`${API}/itineraries/${d.itinerary.id}`);
        const d2 = await r2.json();
        setItems(d2.items || []);
        return d.itinerary.id;
      }
      const create = await fetch(`${API}/itineraries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRef: CLIENT_REF, tripAnchor: "Demo" }),
      });
      const created = await create.json();
      setItineraryId(created.id);
      setItems([]);
      return created.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load itinerary");
      return null;
    }
  }, []);

  const loadLeads = useCallback(async () => {
    try {
      const [hotelRes, flightRes] = await Promise.all([
        fetch(`${API}/hotels`),
        fetch(`${API}/flights`),
      ]);
      const hotels: Array<{ id: string; hotelCode?: string; name?: string | null; rawResponse?: unknown }> =
        hotelRes.ok ? await hotelRes.json() : [];
      const flights: Array<{
        id: string;
        departureId?: string;
        arrivalId?: string;
        rawResponse?: { airline?: string; net_price?: number };
      }> = flightRes.ok ? await flightRes.json() : [];

      if (hotels.length > 0 || flights.length > 0) {
        const fromHotels: Lead[] = hotels.map((h) => ({
          id: h.id,
          type: "hotel",
          name: h.name || h.hotelCode || "Hotel",
          netRate: Number((h.rawResponse as { net_price?: number })?.net_price) || 0,
          hotelId: h.id,
        }));
        const fromFlights: Lead[] = flights.map((f) => ({
          id: f.id,
          type: "flight",
          name: (f.rawResponse?.airline as string) || `${f.departureId || "?"} → ${f.arrivalId || "?"}`,
          netRate: Number(f.rawResponse?.net_price) || 0,
          flightId: f.id,
        }));
        setLeads([...fromFlights, ...fromHotels]);
        return;
      }
    } catch (_) {
      /* fallback to demo leads */
    }
    // Fallback: create demo leads if none exist (e.g. before running seed script)
    const hotelRes = await fetch(`${API}/hotels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelCode: "ROVE-DXB", name: "Rove Hotel", googlePlaceId: "ChIJdemo" }),
    });
    const flightRes = await fetch(`${API}/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingToken: "emirates-demo", departureId: "DXB", arrivalId: "LHR" }),
    });
    const hotel = await hotelRes.json();
    const flight = await flightRes.json();
    setLeads([
      { id: flight.id, type: "flight", name: "Emirates Flight", netRate: 450, flightId: flight.id },
      { id: hotel.id, type: "hotel", name: "Rove Hotel", netRate: 120, hotelId: hotel.id },
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        await loadItinerary();
        if (!cancelled) await loadLeads();
      } catch (_) {
        setError("Failed to load itinerary or leads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadItinerary, loadLeads]);

  const addToItinerary = async (lead: Lead) => {
    if (!itineraryId) return;
    const body =
      lead.type === "hotel"
        ? { leadType: "hotel", hotelId: lead.hotelId, markupApplied: "0" }
        : { leadType: "flight", flightId: lead.flightId, markupApplied: "0" };
    const r = await fetch(`${API}/itineraries/${itineraryId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return;
    const item = await r.json();
    setItems((prev) => [...prev, { ...item, lead }]);
    await fetch(`${API}/curation-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itineraryId, leadType: lead.type, leadId: lead.id, eventType: "added" }),
    });
  };

  const updateMarkup = async (itemId: string, markupPct: number) => {
    const r = await fetch(`${API}/itinerary-items/${itemId}/markup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markupApplied: String(markupPct) }),
    });
    if (!r.ok) return;
    const updated = await r.json();
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, markupApplied: updated.markupApplied } : i)));
  };

  const removeItem = async (itemId: string) => {
    await fetch(`${API}/itinerary-items/${itemId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  /** Search hotels by POI (Google Places) and enrich with GRN/B2B data. */
  const searchHotelsByPoi = async () => {
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
  };

  /** Add a POI search result as a B2B hotel lead and optionally to itinerary. */
  const addPoiResultToLeads = async (result: PoiSearchResult) => {
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
          rawResponse: { rating: place.rating, address: place.address, userRatingCount: place.userRatingCount },
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        setPoiError(err.error || "Failed to add hotel");
        return;
      }
      const created = await createRes.json();
      hotelId = created.id;
    }
    const lead: Lead = { id: hotelId, type: "hotel", name, netRate, hotelId };
    setLeads((prev) => (prev.some((l) => l.hotelId === hotelId) ? prev : [...prev, lead]));
    await addToItinerary(lead);
  };

  /** Whitelabel export: branded doc with Selling Price only (net rate hidden). */
  const exportItinerary = () => {
    const lines = [
      "────────────────────────────────────────",
      "  B2B Itinerary – Confidential",
      "  Client Reference: " + CLIENT_REF,
      "────────────────────────────────────────",
      "",
    ];
    items.forEach((item, i) => {
      const lead = item.lead || leads.find((l) => l.hotelId === item.hotelId || l.flightId === item.flightId);
      const net = lead?.netRate ?? 0;
      const pct = Number(item.markupApplied) || 0;
      const selling = net * (1 + pct / 100);
      const name = lead?.name ?? (item.leadType === "hotel" ? "Hotel" : "Flight");
      lines.push(`${i + 1}. ${name}`);
      lines.push(`   Selling Price: $${selling.toFixed(2)}`);
      lines.push("");
    });
    lines.push("────────────────────────────────────────");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itinerary-${CLIENT_REF}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-slate-400">Loading B2B test portal...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}. Is the server running on this port?</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">B2B Agent Portal – Test</h1>
        <p className="text-slate-400 mb-6">
          Search hotels by POI (Google Places) and see GRN-enriched data. Drag leads into the Itinerary Canvas; use the Markup slider for commission.
        </p>

        {/* Search hotels by POI (Google Places + GRN enrichment) */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Search hotels by location (POI + GRN)</h2>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <input
              type="text"
              value={poiQuery}
              onChange={(e) => setPoiQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchHotelsByPoi()}
              placeholder="City or area (e.g. Dallas, Las Vegas Strip)"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={searchHotelsByPoi}
              disabled={poiLoading || !poiQuery.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {poiLoading ? "Searching…" : "Search"}
            </button>
          </div>
          {poiError && <p className="text-red-400 text-sm mb-2">{poiError}</p>}
          {poiResults.length > 0 && (
            <>
              <div className="mt-3">
                <Suspense fallback={<div className="h-[280px] rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">Loading map…</div>}>
                  <B2bMap markers={mapMarkers} height={280} className="w-full" />
                </Suspense>
              </div>
              <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                {poiResults.map((r) => (
                <div
                  key={r.place.placeId}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-800 border border-slate-600"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{r.place.name}</div>
                    <div className="text-xs text-slate-400 truncate">{r.place.address}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {r.place.rating > 0 && <span className="text-amber-400 text-xs">★ {r.place.rating}</span>}
                      {r.grn && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-200">GRN: {r.grn.hotelCode}</span>
                      )}
                      {r.grn?.rawResponse && typeof (r.grn.rawResponse as { net_price?: number }).net_price === "number" && (
                        <span className="text-slate-400 text-xs">Net ${(r.grn.rawResponse as { net_price: number }).net_price}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPoiResultToLeads(r)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500"
                  >
                    Add to itinerary
                  </button>
                </div>
              ))}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leads column */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Leads</h2>
            <div className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify(lead))}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-600 cursor-grab active:cursor-grabbing"
                >
                  <span>{lead.name}</span>
                  <span className="text-slate-400 text-sm">Net ${lead.netRate}</span>
                  <button
                    type="button"
                    onClick={() => addToItinerary(lead)}
                    className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Itinerary Canvas */}
          <div
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 min-h-[200px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const lead = JSON.parse(e.dataTransfer.getData("application/json")) as Lead;
                addToItinerary(lead);
              } catch (_) {}
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Itinerary Canvas</h2>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={exportItinerary}
                  className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Export
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-slate-500 text-sm">Drop leads here or click Add. Persistence via B2B Data API.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const lead = item.lead || leads.find((l) => l.hotelId === item.hotelId || l.flightId === item.flightId);
                  const net = lead?.netRate ?? 0;
                  const pct = Number(item.markupApplied) || 0;
                  const selling = net * (1 + pct / 100);
                  return (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-800 border border-slate-600">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{lead?.name ?? (item.leadType === "hotel" ? "Hotel lead" : "Flight lead")}</span>
                        <button type="button" onClick={() => removeItem(item.id)} className="text-xs text-red-400 hover:underline">
                          Remove
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">Agent Markup (commission %)</div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={pct}
                        onChange={(e) => updateMarkup(item.id, Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-600"
                      />
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-slate-400">Net ${net.toFixed(0)}</span>
                        <span className="font-semibold text-green-400">Selling Price ${selling.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
