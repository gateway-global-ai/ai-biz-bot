/**
 * HotelResultsPanel — renders enriched hotel data in the 40% Content Window.
 *
 * Accepts the JSON payload produced by `enrich_hotels_with_rates` /
 * `search_hotels` tool calls and displays each hotel as a card containing:
 *   • Name
 *   • Photo (Google Places photo URI when available, fallback placeholder)
 *   • Star / review score
 *   • Lowest available price from GRN Connect
 *
 * Usage in ToolRouter:
 *   case 'enrich_hotels_with_rates':
 *   case 'search_hotels':
 *     return <HotelResultsPanel data={metadata} ... />;
 */
import React from 'react';
import { Star, MapPin, DollarSign } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (intentionally loose — data arrives from dynamic tool calls)
// ---------------------------------------------------------------------------
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
  // From Places API enrichment (optional)
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
  // enrich_hotels_with_rates returns flat GRN structure merged with availability
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
  searchQuery?: {
    location?: string;
    query?: string;
  };
  // Allow arbitrary extra keys from tool responses
  [key: string]: unknown;
}

interface HotelResultsPanelProps {
  data: HotelResultsPanelData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getHotelName(hotel: MatchedHotel): string {
  return (
    hotel.hotel_name ||
    hotel.grn?.hotel_name ||
    hotel.google?.name ||
    'Unknown Hotel'
  );
}

function getHotelAddress(hotel: MatchedHotel): string {
  return (
    hotel.grn?.address ||
    hotel.google?.address ||
    hotel.grn?.city_name ||
    ''
  );
}

function getStarRating(hotel: MatchedHotel): number {
  return (
    hotel.star_rating ??
    hotel.grn?.star_rating ??
    0
  );
}

function getReviewScore(hotel: MatchedHotel): number | null {
  return hotel.google?.rating ?? hotel.grn?.rating ?? null;
}

function getMinRate(hotel: MatchedHotel): number | null {
  const avail = hotel.availability ?? hotel.grn?.availability;
  return avail?.available ? (avail.minRate ?? null) : null;
}

function getPhotoUri(hotel: MatchedHotel): string | null {
  // Use server-provided photoUri only (avoids exposing API key client-side)
  return hotel.grn?.photoUri ?? null;
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < count ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hotel Card
// ---------------------------------------------------------------------------
function HotelCard({ hotel }: { hotel: MatchedHotel }) {
  const name      = getHotelName(hotel);
  const address   = getHotelAddress(hotel);
  const stars     = getStarRating(hotel);
  const score     = getReviewScore(hotel);
  const minRate   = getMinRate(hotel);
  const photoUri  = getPhotoUri(hotel);

  return (
    <div className="flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-32 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {photoUri ? (
          <img
            src={photoUri}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
            <MapPin className="w-8 h-8" />
            <span className="text-xs">No photo</span>
          </div>
        )}
        {/* Availability badge */}
        {minRate !== null && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Available
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{name}</p>

        {address && (
          <p className="text-xs text-slate-500 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col gap-0.5">
            {stars > 0 && <StarRow count={stars} />}
            {score !== null && (
              <span className="text-xs text-amber-600 font-medium">
                {score.toFixed(1)} review score
              </span>
            )}
          </div>

          {minRate !== null && (
            <div className="text-right">
              <div className="flex items-center gap-0.5 text-emerald-700 font-bold text-sm">
                <DollarSign className="w-3.5 h-3.5" />
                {minRate.toFixed(0)}
              </div>
              <p className="text-[10px] text-slate-400">/ night</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function HotelResultsPanel({ data }: HotelResultsPanelProps) {
  const hotels = data.hotels ?? [];
  const location = data.searchQuery?.location;
  const checkin  = data.checkin;
  const checkout = data.checkout;
  const count    = data.hotelsWithAvailability ?? data.totalHotels ?? data.totalResults ?? hotels.length;

  if (!hotels.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
        <MapPin className="w-8 h-8 text-slate-300" />
        <p className="text-sm font-medium">No hotels found</p>
        {location && <p className="text-xs text-slate-400">for "{location}"</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {count} hotel{count !== 1 ? 's' : ''}{location ? ` in ${location}` : ''}
          </p>
          {checkin && checkout && (
            <p className="text-xs text-slate-500">{checkin} → {checkout}</p>
          )}
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          GRN + Google
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {hotels.map((hotel, idx) => (
          <HotelCard
            key={
              hotel.grn_hotel_id ??
              hotel.grn?.grn_hotel_id ??
              hotel.google?.placeId ??
              String(idx)
            }
            hotel={hotel}
          />
        ))}
      </div>
    </div>
  );
}
