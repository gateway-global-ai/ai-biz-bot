/**
 * Hotel Search Modal – B2B: search by POI via /api/b2b/hotels/search-by-poi, add to itinerary.
 */
import React, { useState, useCallback, useEffect } from "react";
import { X, MapPin, Loader2, Plus, Star } from "lucide-react";

const API = "/api/b2b";

type Place = { placeId: string; name: string; address: string; rating: number; location?: { latitude: number; longitude: number } };
type GrnHotel = { id: string; hotelCode: string; name?: string | null; rawResponse?: { net_price?: number } };
type Result = { place: Place; grn?: GrnHotel };

type HotelSearchModalB2bProps = {
  isOpen: boolean;
  onClose: () => void;
  locationName?: string;
  /** When set (e.g. from event search venue), search hotels within radius of this point (1–2 mi). */
  location?: { lat: number; lng: number } | null;
  /** Radius in meters (default 3200 ≈ 2 miles). */
  radiusMeters?: number;
  onAdded: () => void;
};

export function HotelSearchModalB2b({ isOpen, onClose, locationName = "", location: locationProp, radiusMeters = 3200, onAdded }: HotelSearchModalB2bProps) {
  const [query, setQuery] = useState(locationName);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setQuery(locationName);
  }, [isOpen, locationName]);

  const search = useCallback(async () => {
    const q = query.trim() || (locationProp ? "hotels" : "");
    if (!q && !locationProp) return;
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const body: { query: string; location?: { latitude: number; longitude: number }; radius?: number } = {
        query: q || "hotels",
      };
      if (locationProp) {
        body.location = { latitude: locationProp.lat, longitude: locationProp.lng };
        body.radius = radiusMeters;
      }
      const r = await fetch(`${API}/hotels/search-by-poi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Search failed");
        return;
      }
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, locationProp, radiusMeters]);

  const addToItinerary = useCallback(
    async (result: Result) => {
      const { place, grn } = result;
      setAddingId(place.placeId);
      try {
        let hotelId: string;
        let name = place.name;
        let netRate = 0;
        if (grn) {
          hotelId = grn.id;
          name = grn.name || place.name;
          netRate = Number(grn.rawResponse?.net_price) || 0;
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
          if (!createRes.ok) throw new Error("Failed to create hotel");
          const created = await createRes.json();
          hotelId = created.id;
        }

        const inProgressRes = await fetch(`${API}/itineraries/in-progress?clientRef=test-b2b-demo`);
        const inProgressData = await inProgressRes.json();
        const itineraryId = inProgressData.itinerary?.id;
        if (!itineraryId) throw new Error("No itinerary");

        const itemRes = await fetch(`${API}/itineraries/${itineraryId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadType: "hotel", hotelId, markupApplied: "15" }),
        });
        if (!itemRes.ok) throw new Error("Failed to add to itinerary");
        onAdded();
        onClose();
        setResults([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add");
      } finally {
        setAddingId(null);
      }
    },
    [onAdded, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            {locationProp ? `Hotels near ${query || "venue"} (within 2 mi)` : "Search hotels"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-100 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="City or hotel name..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Search
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {!loading && results.length === 0 && !error && query && (
            <p className="text-slate-500 text-sm">Search for a city or hotel name above.</p>
          )}
          {results.map((r) => (
            <div
              key={r.place.placeId}
              className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-100/50"
            >
              <div>
                <p className="font-bold text-slate-900">{r.place.name}</p>
                <p className="text-xs text-slate-500">{r.place.address}</p>
                {r.place.rating ? (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 mt-1">
                    <Star className="w-3 h-3 fill-current" /> {r.place.rating}
                  </span>
                ) : null}
                {r.grn && (
                  <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    GRN
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={addingId !== null}
                onClick={() => addToItinerary(r)}
                className="bg-[#E91E63] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              >
                {addingId === r.place.placeId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
