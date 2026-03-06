/**
 * HotelBookingBlock — Rates & availability below the hero for hospitality sites.
 * Shown when place.types includes lodging/hotel and siteConfigId is present.
 * Calls GET /api/site-configs/:id/hotel-availability (GRN-backed) and renders
 * HotelInventoryGrid. Sovereign styling: glass cards, rounded-sui, framer-motion.
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Loader2, ExternalLink } from 'lucide-react';
import { HotelInventoryGrid } from '@/components/voice/tools/HotelInventoryGrid';

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface HotelBookingBlockProps {
  siteConfigId: string;
  placeTypes?: string[];
  hotelName?: string;
}

const LODGING_TYPES = ['lodging', 'hotel', 'motel', 'resort'];

export function HotelBookingBlock({ siteConfigId, placeTypes = [], hotelName }: HotelBookingBlockProps) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [checkIn, setCheckIn] = useState(formatDateInput(today));
  const [checkOut, setCheckOut] = useState(formatDateInput(tomorrow));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    success?: boolean;
    error?: string;
    hotelName?: string;
    checkIn?: string;
    checkOut?: string;
    platformId?: string;
    totalAvailable?: number;
    rooms?: any[];
    bookingUrl?: string | null;
  } | null>(null);

  const isHospitality = placeTypes.some((t) => LODGING_TYPES.includes(t.toLowerCase()));

  const fetchAvailability = useCallback(async () => {
    if (!siteConfigId) return;
    setLoading(true);
    setData(null);
    try {
      const q = new URLSearchParams({ checkIn, checkOut, guests: '2' });
      const res = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/hotel-availability?${q}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setData({ success: false, error: 'Could not load availability.' });
    } finally {
      setLoading(false);
    }
  }, [siteConfigId, checkIn, checkOut]);

  if (!isHospitality || !siteConfigId) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-7xl mx-auto px-6 -mt-12 relative z-20 pb-10"
    >
      <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Check-in</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-sui bg-slate-800/60 border border-indigo-500/20 text-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Check-out</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-sui bg-slate-800/60 border border-indigo-500/20 text-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAvailability}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-sui bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                Check availability
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {data !== null && (
          <div className="mt-4">
            <HotelInventoryGrid data={data} checkIn={checkIn} checkOut={checkOut} />
          </div>
        )}
        {data === null && !loading && (
          <p className="text-slate-500 text-sm">
            Select dates and click Check availability to see rates for {hotelName || 'this property'}.
          </p>
        )}
      </div>
    </motion.section>
  );
}
