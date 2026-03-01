/**
 * HotelResultsPanel — Sovereign OS edition.
 * Renders enriched hotel data in the 40% Content Window.
 * Jason Standard: glass cards, rounded-sui, indigo borders, framer-motion.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, DollarSign, Building2 } from 'lucide-react';

interface GrnHotel {
  hotel_name?: string;
  grn_hotel_id?: string;
  city_name?: string;
  country_name?: string;
  star_rating?: number;
  latitude?: string | number;
  longitude?: string | number;
  address?: string;
  availability?: {
    available: boolean;
    minRate?: number;
    rates?: Array<{ room_type?: string; net_price?: number; currency?: string }>;
  };
  googlePlaceId?: string;
  photoUri?: string;
  rating?: number;
  userRatingCount?: number;
}

interface MatchedHotel {
  google?: {
    placeId?: string;
    name?: string;
    address?: string;
    rating?: number;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
  };
  grn?: GrnHotel | null;
  matchScore?: number;
  matched?: boolean;
  hotel_name?: string;
  grn_hotel_id?: string;
  city_name?: string;
  star_rating?: number;
  availability?: GrnHotel['availability'];
}

export interface HotelResultsPanelData {
  success?: boolean;
  hotels?: MatchedHotel[];
  totalHotels?: number;
  totalResults?: number;
  hotelsWithAvailability?: number;
  checkin?: string;
  checkout?: string;
  searchQuery?: { location?: string; query?: string };
  [key: string]: unknown;
}

interface HotelResultsPanelProps {
  data: HotelResultsPanelData;
}

function getHotelName(h: MatchedHotel) {
  return h.hotel_name || h.grn?.hotel_name || h.google?.name || 'Unknown Hotel';
}
function getHotelAddress(h: MatchedHotel) {
  return h.grn?.address || h.google?.address || h.grn?.city_name || '';
}
function getStarRating(h: MatchedHotel) {
  return h.star_rating ?? h.grn?.star_rating ?? 0;
}
function getReviewScore(h: MatchedHotel): number | null {
  return h.google?.rating ?? h.grn?.rating ?? null;
}
function getMinRate(h: MatchedHotel): number | null {
  const avail = h.availability ?? h.grn?.availability;
  return avail?.available ? (avail.minRate ?? null) : null;
}
function getPhotoUri(h: MatchedHotel): string | null {
  return h.grn?.photoUri ?? null;
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < count ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </div>
  );
}

function HotelCard({ hotel, index }: { hotel: MatchedHotel; index: number }) {
  const name     = getHotelName(hotel);
  const address  = getHotelAddress(hotel);
  const stars    = getStarRating(hotel);
  const score    = getReviewScore(hotel);
  const minRate  = getMinRate(hotel);
  const photoUri = getPhotoUri(hotel);
  const hasRate  = minRate !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay: index * 0.055 }}
      whileHover={{ scale: 1.03, y: -3, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
      className="flex flex-col rounded-sui overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-indigo-500/15 hover:border-indigo-500/30 shadow-xl transition-shadow duration-300"
    >
      {/* Photo */}
      <div className="relative h-32 bg-slate-800/60 flex items-center justify-center overflow-hidden shrink-0">
        {photoUri ? (
          <img
            src={photoUri}
            alt={name}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5">
            <Building2 className="w-7 h-7" />
            <span className="text-[10px]">No photo</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

        {/* Availability badge */}
        {hasRate && (
          <div className="absolute top-2 right-2 badge-insight">
            Available
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-bold text-white text-sm leading-tight line-clamp-2">{name}</p>

        {address && (
          <p className="text-[10px] text-slate-500 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-600" />
            <span className="line-clamp-1">{address}</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col gap-0.5">
            {stars > 0 && <StarRow count={stars} />}
            {score !== null && (
              <span className="text-[10px] text-amber-400 font-medium">
                {score.toFixed(1)} ★
              </span>
            )}
          </div>

          {hasRate && (
            <div className="text-right">
              <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-sm">
                <DollarSign className="w-3.5 h-3.5" />
                {minRate!.toFixed(0)}
              </div>
              <p className="text-[10px] text-slate-600">/ night</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function HotelResultsPanel({ data }: HotelResultsPanelProps) {
  const hotels   = data.hotels ?? [];
  const location = data.searchQuery?.location;
  const checkin  = data.checkin;
  const checkout = data.checkout;
  const count    = data.hotelsWithAvailability ?? data.totalHotels ?? data.totalResults ?? hotels.length;

  if (!hotels.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 gap-3"
      >
        <div className="w-12 h-12 rounded-sui bg-slate-800/60 border border-indigo-500/15 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-400">No hotels found</p>
        {location && <p className="text-xs text-slate-600">for "{location}"</p>}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-bold text-white">
            {count} hotel{count !== 1 ? 's' : ''}{location ? ` in ${location}` : ''}
          </p>
          {checkin && checkout && (
            <p className="data-chip mt-1 inline-block">{checkin} → {checkout}</p>
          )}
        </div>
        <span className="data-chip">GRN + Google</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {hotels.map((hotel, idx) => (
            <HotelCard
              key={
                hotel.grn_hotel_id ??
                hotel.grn?.grn_hotel_id ??
                hotel.google?.placeId ??
                String(idx)
              }
              hotel={hotel}
              index={idx}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
