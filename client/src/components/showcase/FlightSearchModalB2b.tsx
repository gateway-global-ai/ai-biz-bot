/**
 * Flight Search Modal – B2B: add a flight lead to the itinerary (demo flow; creates flight then item).
 */
import React, { useState, useCallback } from "react";
import { X, Plane, Loader2 } from "lucide-react";

const API = "/api/b2b";
const CLIENT_REF = "test-b2b-demo";

type FlightSearchModalB2bProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export function FlightSearchModalB2b({ isOpen, onClose, onAdded }: FlightSearchModalB2bProps) {
  const [departure, setDeparture] = useState("JFK");
  const [arrival, setArrival] = useState("DXB");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("450");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFlight = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = `demo-${Date.now()}`;
      const dep = departure.trim().toUpperCase().slice(0, 3) || "JFK";
      const arr = arrival.trim().toUpperCase().slice(0, 3) || "DXB";
      const createRes = await fetch(`${API}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingToken: token,
          departureId: dep,
          arrivalId: arr,
          rawResponse: { airline: "Demo", net_price: Number(price) || 0, date: date || undefined },
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create flight");
      const flight = await createRes.json();

      const inProgressRes = await fetch(`${API}/itineraries/in-progress?clientRef=${encodeURIComponent(CLIENT_REF)}`);
      const inProgressData = await inProgressRes.json();
      const itineraryId = inProgressData.itinerary?.id;
      if (!itineraryId) throw new Error("No itinerary");

      const itemRes = await fetch(`${API}/itineraries/${itineraryId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadType: "flight", flightId: flight.id, markupApplied: "15" }),
      });
      if (!itemRes.ok) throw new Error("Failed to add to itinerary");
      onAdded();
      onClose();
      setDeparture("JFK");
      setArrival("DXB");
      setPrice("450");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [departure, arrival, date, price, onAdded, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-500" />
            Add flight
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure (IATA)</label>
            <input
              type="text"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              placeholder="e.g. JFK"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Arrival (IATA)</label>
            <input
              type="text"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              placeholder="e.g. DXB"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date (optional)</label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. 2026-02-15"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Net price (USD)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              step={10}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={addFlight}
            className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add to itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
