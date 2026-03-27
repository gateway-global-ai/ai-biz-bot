/**
 * Event search: query → Gemini (date + venue) → Google (venue coords + nearest airport).
 * Shows steps and result; "Use for hotel search" passes venue coords to parent.
 */
import React, { useState } from "react";
import { Calendar, MapPin, Plane, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const API = "/api/b2b";

export type EventSearchResult = {
  success: boolean;
  event: { eventName: string; dateOrRange: string; venueName: string; venueCity: string; venueCountry: string };
  venueCoords: { lat: number; lng: number; formattedAddress: string } | null;
  nearestAirport: { name: string; code: string; lat: number; lng: number; distanceMiles: number } | null;
  steps: Array<{ step: string; status: string; message?: string; data?: unknown }>;
};

type EventSearchPanelProps = {
  onUseForHotelSearch: (venueName: string, coords: { lat: number; lng: number } | null) => void;
};

export function EventSearchPanel({ onUseForHotelSearch }: EventSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(true);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch(`${API}/events/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const text = await r.text();
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("application/json") || text.trimStart().startsWith("<")) {
        setError("API returned a page instead of JSON. Use this app from your server (e.g. https://aibizbot-dev.gatewayglobal.ai) so /api requests hit the same origin.");
        return;
      }
      let data: EventSearchResult;
      try {
        data = JSON.parse(text) as EventSearchResult;
      } catch {
        setError("Invalid JSON from API.");
        return;
      }
      if (!r.ok) {
        const errMsg = (data as { error?: string }).error || "Search failed";
        const stepMsg = Array.isArray((data as { steps?: Array<{ message?: string; status?: string }> }).steps)
          ? (data as { steps?: Array<{ message?: string; status?: string }> }).steps?.find((s) => s.status === "error")?.message
          : undefined;
        setError(stepMsg ? `${errMsg}: ${stepMsg}` : errMsg);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Event search (Gemini + Grounding)</p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Olympics 2026 Milan"
          className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="shrink-0 bg-[#1E3A8A] text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Get dates & venue
        </button>
      </div>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {result && (
        <div className="space-y-2 text-xs">
          {/* Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-2 space-y-1">
            {result.event.eventName && (
              <p className="font-bold text-slate-900">{result.event.eventName}</p>
            )}
            {result.event.dateOrRange && (
              <p className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3 h-3" /> {result.event.dateOrRange}
              </p>
            )}
            {(result.event.venueName || result.event.venueCity) && (
              <p className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-3 h-3" />
                {[result.event.venueName, result.event.venueCity, result.event.venueCountry].filter(Boolean).join(", ")}
              </p>
            )}
            {result.venueCoords && (
              <p className="text-slate-500 font-mono text-[10px]">
                Venue GPS: {result.venueCoords.lat.toFixed(4)}, {result.venueCoords.lng.toFixed(4)}
                {result.venueCoords.formattedAddress && ` · ${result.venueCoords.formattedAddress}`}
              </p>
            )}
            {result.nearestAirport && (
              <p className="flex items-center gap-1 text-slate-600">
                <Plane className="w-3 h-3" />
                {result.nearestAirport.name}
                {result.nearestAirport.distanceMiles != null && (
                  <span className="text-slate-500"> · {result.nearestAirport.distanceMiles} mi</span>
                )}
              </p>
            )}

            {result.venueCoords && (
              <button
                type="button"
                onClick={() => onUseForHotelSearch(result.event.venueName || result.event.venueCity || "Venue", result.venueCoords)}
                className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
              >
                Use this location for hotel search
              </button>
            )}
          </div>

          {/* Steps (process visibility) */}
          <button
            type="button"
            onClick={() => setStepsExpanded((e) => !e)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700 w-full"
          >
            {stepsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            Process ({result.steps.length} steps)
          </button>
          {stepsExpanded && result.steps.length > 0 && (
            <ul className="space-y-1 pl-1">
              {result.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  {s.status === "ok" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-700">{s.step}</span>
                    {s.message && ` · ${s.message}`}
                    {s.data != null && typeof s.data === "object" && (
                      <span className="text-slate-500 ml-1">({JSON.stringify(s.data).slice(0, 60)}…)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
