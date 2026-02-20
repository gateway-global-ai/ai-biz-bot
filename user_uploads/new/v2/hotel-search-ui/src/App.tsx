import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { Search, Filter, Send, MapPin, Star, Hotel, X, Loader2, Map, MessageCircle, Maximize2, Minimize2, Square, SlidersHorizontal, Calendar, Users, DollarSign, ChevronRight, ChevronLeft, Bed, List } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO0kKndUNlmQi3B5mxy4dblg_8WYcuKuk';

const libraries: ("places")[] = ["places"];

interface RoomType {
  roomId: string;
  roomName: string;
  bedType: string;
  maxOccupancy: number;
  ratePerNight: number;
  totalRate: number;
  available: number;
  amenities: string[];
  cancellationPolicy: string;
  photoUrl?: string;
}

interface HotelResult {
  placeId?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  photoUrl?: string;
  grnMatch?: {
    grn_hotel_id: string;
    hotel_name: string;
    star_rating?: number;
  };
  rooms?: RoomType[];
  lowestRate?: number;
  priceLevel?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
  action?: 'ask_checkin' | 'ask_checkout' | 'ask_guests';
}

interface SearchFilters {
  minRating: number;
  maxRating: number;
  keywords: string;
  radius: number;
  radiusUnit: 'miles' | 'km';
  // GRN Booking Filters
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  rooms: number;
  maxBudget: number;
}

const getDefaultDates = () => {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(checkIn.getDate() + 7); // Default to 1 week from now
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2); // Default 2 night stay
  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0]
  };
};

const defaultDates = getDefaultDates();

const defaultFilters: SearchFilters = {
  minRating: 0,
  maxRating: 5,
  keywords: '',
  radius: 5,
  radiusUnit: 'miles',
  checkInDate: defaultDates.checkIn,
  checkOutDate: defaultDates.checkOut,
  adults: 2,
  children: 0,
  rooms: 1,
  maxBudget: 500
};

type DesktopChatMode = 'floating' | 'fixed' | 'fullscreen';
type MobileView = 'map' | 'filters' | 'chat' | 'list';

function App() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [center, setCenter] = useState({ lat: 25.7617, lng: -80.1918 });
  const [zoom, setZoom] = useState(12);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelResult | null>(null);
  const [expandedHotel, setExpandedHotel] = useState<HotelResult | null>(null);
  const [poiSearch, setPoiSearch] = useState('');
  const [selectedPoi, setSelectedPoi] = useState<{ name: string; placeId: string; location?: { lat: number; lng: number } } | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to Hotel Search! Search for hotels near a Point of Interest (POI). When would you like to check in?',
      timestamp: new Date(),
      action: 'ask_checkin'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('map');
  const [desktopChatMode, setDesktopChatMode] = useState<DesktopChatMode>('floating');
  const [desktopActiveTab, setDesktopActiveTab] = useState<'chat' | 'filters'>('chat');
  const [awaitingInput, setAwaitingInput] = useState<'checkin' | 'checkout' | 'guests' | null>('checkin');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSelectedPoi({
          name: place.name || place.formatted_address || '',
          placeId: place.place_id || '',
          location
        });
        setCenter(location);
        setZoom(14);
        addChatMessage('system', `Selected POI: ${place.name || place.formatted_address}`);
        handleSearchWithPoi({
          name: place.name || place.formatted_address || '',
          placeId: place.place_id || '',
          location
        });
      }
    }
  }, [filters]);

  const addChatMessage = (type: ChatMessage['type'], content: string, data?: any, action?: ChatMessage['action']) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      data,
      action
    }]);
  };

  const generateMockRooms = (): RoomType[] => {
    const roomTypes = [
      { name: 'Standard Room', bed: 'Queen', max: 2, base: 120, photo: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' },
      { name: 'Deluxe Room', bed: 'King', max: 2, base: 180, photo: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=300&fit=crop' },
      { name: 'Double Queen Room', bed: '2 Queens', max: 4, base: 200, photo: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop' },
      { name: 'Suite', bed: 'King + Sofa', max: 4, base: 280, photo: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop' },
      { name: 'Executive Suite', bed: 'King', max: 2, base: 350, photo: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop' },
    ];

    const nights = Math.max(1, Math.ceil((new Date(filters.checkOutDate).getTime() - new Date(filters.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));

    return roomTypes.slice(0, 2 + Math.floor(Math.random() * 3)).map((room, idx) => ({
      roomId: `room_${idx}`,
      roomName: room.name,
      bedType: room.bed,
      maxOccupancy: room.max,
      ratePerNight: room.base + Math.floor(Math.random() * 50),
      totalRate: (room.base + Math.floor(Math.random() * 50)) * nights,
      available: 1 + Math.floor(Math.random() * 5),
      amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'].slice(0, 2 + Math.floor(Math.random() * 2)),
      cancellationPolicy: Math.random() > 0.5 ? 'Free cancellation until 24h before' : 'Non-refundable',
      photoUrl: room.photo
    }));
  };

  const callMcpTool = async (toolName: string, args: Record<string, any>) => {
    addChatMessage('system', `Searching hotels with availability...`);

    if (toolName === 'search_hotels' || toolName === 'search_hotels_near_poi') {
      const searchLat = args.poiLatitude || center.lat;
      const searchLng = args.poiLongitude || center.lng;

      // Convert radius to meters for Google Places API
      const radiusMeters = args.radiusUnit === 'miles'
        ? args.radius * 1609.34
        : args.radius * 1000;

      try {
        // Use Google Places Nearby Search for real hotels
        const service = new google.maps.places.PlacesService(map!);

        const hotels = await new Promise<HotelResult[]>((resolve, reject) => {
          service.nearbySearch(
            {
              location: { lat: searchLat, lng: searchLng },
              radius: Math.min(radiusMeters, 50000), // Max 50km
              type: 'lodging',
              keyword: args.keywords || 'hotel'
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const hotelResults: HotelResult[] = results
                  .filter(place => {
                    const rating = place.rating || 0;
                    return rating >= args.minRating && rating <= args.maxRating;
                  })
                  .slice(0, 20) // Limit to 20 results
                  .map(place => {
                    // Get photo URL from Google Places if available
                    let photoUrl: string | undefined;
                    if (place.photos && place.photos.length > 0) {
                      photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                    }

                    return {
                      placeId: place.place_id || '',
                      name: place.name || 'Unknown Hotel',
                      address: place.vicinity || '',
                      latitude: place.geometry?.location?.lat() || searchLat,
                      longitude: place.geometry?.location?.lng() || searchLng,
                      rating: place.rating || 0,
                      priceLevel: place.price_level,
                      photoUrl,
                      // Generate mock GRN match and rooms for demo
                      grnMatch: {
                        grn_hotel_id: `H!${Math.floor(1800000 + Math.random() * 100000)}`,
                        hotel_name: place.name || 'Unknown',
                        star_rating: Math.round(place.rating || 3)
                      },
                      rooms: generateMockRooms()
                    };
                  });

                // Add lowest rate from rooms
                const withRates = hotelResults.map(hotel => ({
                  ...hotel,
                  lowestRate: hotel.rooms ? Math.min(...hotel.rooms.map(r => r.ratePerNight)) : undefined
                }));

                // Filter by budget
                const filtered = withRates.filter(h =>
                  !h.lowestRate || h.lowestRate <= args.maxBudget
                );

                resolve(filtered);
              } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                resolve([]);
              } else {
                reject(new Error(`Places API error: ${status}`));
              }
            }
          );
        });

        return { success: true, hotels, totalResults: hotels.length };
      } catch (error) {
        console.error('Places API error:', error);
        return { success: false, error: 'Failed to search hotels', hotels: [], totalResults: 0 };
      }
    }

    return { success: true, message: 'Tool executed' };
  };

  const handleSearchWithPoi = async (poi: { name: string; placeId: string; location?: { lat: number; lng: number } }) => {
    setIsLoading(true);

    try {
      const args = {
        poiName: poi.name,
        poiPlaceId: poi.placeId,
        poiLatitude: poi.location?.lat,
        poiLongitude: poi.location?.lng,
        radius: filters.radius,
        radiusUnit: filters.radiusUnit,
        keywords: filters.keywords,
        minRating: filters.minRating,
        maxRating: filters.maxRating,
        checkInDate: filters.checkInDate,
        checkOutDate: filters.checkOutDate,
        adults: filters.adults,
        children: filters.children,
        rooms: filters.rooms,
        maxBudget: filters.maxBudget
      };

      const result = await callMcpTool('search_hotels_near_poi', args);

      if (result.success && result.hotels) {
        setHotels(result.hotels);
        const nights = Math.ceil((new Date(filters.checkOutDate).getTime() - new Date(filters.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
        addChatMessage('assistant',
          `Found ${result.totalResults} hotels near ${poi.name} with availability for ${filters.checkInDate} to ${filters.checkOutDate} (${nights} nights).\n\n` +
          `Guests: ${filters.adults} adults${filters.children > 0 ? `, ${filters.children} children` : ''}, ${filters.rooms} room(s)\n\n` +
          `Tap "List" to view hotels and room options.`,
          result
        );

        if (result.hotels.length > 0 && map) {
          const bounds = new google.maps.LatLngBounds();
          if (poi.location) {
            bounds.extend(poi.location);
          }
          result.hotels.forEach((hotel: HotelResult) => {
            if (hotel.latitude && hotel.longitude) {
              bounds.extend({ lat: hotel.latitude, lng: hotel.longitude });
            }
          });
          map.fitBounds(bounds);
        }
      }
    } catch (error) {
      addChatMessage('system', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const parseDate = (input: string): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lower = input.toLowerCase().trim();

    // Handle natural language first
    if (lower === 'today') {
      return today.toISOString().split('T')[0];
    }
    if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (lower.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // Handle relative days like "in 3 days" or "3 days from now"
    const daysMatch = lower.match(/(\d+)\s*days?/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate.toISOString().split('T')[0];
    }

    // Try YYYY-MM-DD format first (most reliable)
    const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return input;
    }

    // Try MM/DD/YYYY or M/D/YYYY
    const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try month name formats: "March 15, 2025" or "15 March 2025" or "Mar 15 2025"
    const months: Record<string, string> = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };

    // "March 15, 2025" or "March 15 2025"
    const monthFirstMatch = lower.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (monthFirstMatch) {
      const [, monthStr, day, year] = monthFirstMatch;
      const month = months[monthStr];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // "15 March 2025"
    const dayFirstMatch = lower.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if (dayFirstMatch) {
      const [, day, monthStr, year] = dayFirstMatch;
      const month = months[monthStr];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // Last resort: try native Date parsing
    try {
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}

    return null;
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    addChatMessage('user', userMessage);

    setIsLoading(true);
    const lowerMsg = userMessage.toLowerCase();

    // Handle date input flow
    if (awaitingInput === 'checkin') {
      const date = parseDate(userMessage);
      if (date) {
        setFilters(prev => ({ ...prev, checkInDate: date }));
        setAwaitingInput('checkout');
        addChatMessage('assistant', `Check-in date set to ${date}. When would you like to check out? (Or how many nights will you stay?)`, undefined, 'ask_checkout');
      } else {
        addChatMessage('assistant', 'I couldn\'t understand that date. Please enter a date like "2025-03-15" or "March 15, 2025" or "tomorrow".');
      }
    } else if (awaitingInput === 'checkout') {
      // Check if it's a number of nights
      const nightsMatch = userMessage.match(/(\d+)\s*(night|day|noche)/i);
      if (nightsMatch) {
        const nights = parseInt(nightsMatch[1]);
        const checkOut = new Date(filters.checkInDate);
        checkOut.setDate(checkOut.getDate() + nights);
        const checkOutStr = checkOut.toISOString().split('T')[0];
        setFilters(prev => ({ ...prev, checkOutDate: checkOutStr }));
        setAwaitingInput(null);
        addChatMessage('assistant', `Check-out date set to ${checkOutStr} (${nights} nights). Great! Now search for a POI on the Map, or adjust your filters in the Filters tab.`);
      } else {
        const date = parseDate(userMessage);
        if (date && date > filters.checkInDate) {
          setFilters(prev => ({ ...prev, checkOutDate: date }));
          setAwaitingInput(null);
          const nights = Math.ceil((new Date(date).getTime() - new Date(filters.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
          addChatMessage('assistant', `Check-out date set to ${date} (${nights} nights). Now search for a POI on the Map, or adjust your filters in the Filters tab.`);
        } else {
          addChatMessage('assistant', 'Please enter a valid check-out date after your check-in date, or just tell me how many nights (e.g., "3 nights").');
        }
      }
    } else if (lowerMsg.includes('filter') || lowerMsg.includes('setting')) {
      const nights = Math.ceil((new Date(filters.checkOutDate).getTime() - new Date(filters.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
      addChatMessage('assistant',
        `**Current Booking Filters:**\n` +
        `- Check-in: ${filters.checkInDate}\n` +
        `- Check-out: ${filters.checkOutDate} (${nights} nights)\n` +
        `- Guests: ${filters.adults} adults, ${filters.children} children\n` +
        `- Rooms: ${filters.rooms}\n` +
        `- Max Budget: $${filters.maxBudget}/night\n` +
        `- Rating: ${filters.minRating} - ${filters.maxRating} stars\n` +
        `- Radius: ${filters.radius} ${filters.radiusUnit}`
      );
    } else if (lowerMsg.includes('help')) {
      addChatMessage('assistant',
        `**Hotel Search Help:**\n\n` +
        `1. **Map Tab**: Search for a POI (airport, landmark, etc.)\n` +
        `2. **Filters Tab**: Set dates, guests, rooms, budget\n` +
        `3. **List Tab**: View hotels and drill down to room options\n` +
        `4. **Chat Tab**: Get help and view search summary\n\n` +
        `**Commands:**\n` +
        `- "change check-in" - Update check-in date\n` +
        `- "show filters" - View current settings\n` +
        `- "help" - Show this help`
      );
    } else if (lowerMsg.includes('change check-in') || lowerMsg.includes('new check-in')) {
      setAwaitingInput('checkin');
      addChatMessage('assistant', 'What date would you like to check in?', undefined, 'ask_checkin');
    } else if (lowerMsg.includes('change check-out') || lowerMsg.includes('new check-out')) {
      setAwaitingInput('checkout');
      addChatMessage('assistant', 'What date would you like to check out?', undefined, 'ask_checkout');
    } else {
      addChatMessage('assistant', 'Use the Map tab to search for a POI, or type "help" for guidance. You can also type "show filters" to see your current booking settings.');
    }

    setIsLoading(false);
  };

  const cycleDesktopChatMode = () => {
    setDesktopChatMode(prev => {
      if (prev === 'floating') return 'fixed';
      if (prev === 'fixed') return 'fullscreen';
      return 'floating';
    });
  };

  const getChatModeIcon = () => {
    if (desktopChatMode === 'floating') return <Maximize2 size={16} />;
    if (desktopChatMode === 'fixed') return <Square size={16} />;
    return <Minimize2 size={16} />;
  };

  const getChatModeTitle = () => {
    if (desktopChatMode === 'floating') return 'Expand to full height';
    if (desktopChatMode === 'fixed') return 'Expand to fullscreen';
    return 'Back to floating';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const clearPoi = () => {
    setSelectedPoi(null);
    setPoiSearch('');
    setHotels([]);
    setExpandedHotel(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loadError) {
    return <div className="flex items-center justify-center h-screen">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading Google Maps...</span>
      </div>
    );
  }

  const getDesktopChatClasses = () => {
    if (desktopChatMode === 'fullscreen') {
      return 'fixed inset-0 z-50';
    }
    if (desktopChatMode === 'fixed') {
      return 'w-[480px] h-full';
    }
    return 'w-[480px]';
  };

  const nights = Math.max(1, Math.ceil((new Date(filters.checkOutDate).getTime() - new Date(filters.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));

  // Render Filters Panel
  const renderFiltersPanel = () => (
    <div className="flex-1 overflow-y-auto p-4 min-h-0">
      <div className="space-y-5">
        {/* Booking Dates */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-blue-600" />
            Booking Dates
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Check-in</label>
              <input
                type="date"
                value={filters.checkInDate}
                onChange={(e) => setFilters({ ...filters, checkInDate: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Check-out</label>
              <input
                type="date"
                value={filters.checkOutDate}
                onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                min={filters.checkInDate}
              />
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">{nights} night{nights > 1 ? 's' : ''}</p>
        </div>

        {/* Guest Info */}
        <div className="p-3 bg-green-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <Users size={16} className="text-green-600" />
            Guests & Rooms
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Adults</label>
              <input
                type="number"
                min="1"
                max="10"
                value={filters.adults}
                onChange={(e) => setFilters({ ...filters, adults: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Children</label>
              <input
                type="number"
                min="0"
                max="10"
                value={filters.children}
                onChange={(e) => setFilters({ ...filters, children: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rooms</label>
              <input
                type="number"
                min="1"
                max="10"
                value={filters.rooms}
                onChange={(e) => setFilters({ ...filters, rooms: Number(e.target.value) })}
                className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
              />
            </div>
          </div>
        </div>

        {/* Budget */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-green-600" />
            Max Nightly Budget: ${filters.maxBudget}
          </h3>
          <input
            type="range"
            min="50"
            max="1000"
            step="25"
            value={filters.maxBudget}
            onChange={(e) => setFilters({ ...filters, maxBudget: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>$50</span>
            <span>$1000</span>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
            <Star size={16} className="text-yellow-500" />
            Rating Range: {filters.minRating} - {filters.maxRating}
          </h3>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        {/* Radius Filter */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
            <MapPin size={16} className="text-blue-500" />
            Search Radius
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={filters.radius}
              onChange={(e) => setFilters({ ...filters, radius: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={filters.radiusUnit}
              onChange={(e) => setFilters({ ...filters, radiusUnit: e.target.value as 'miles' | 'km' })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="miles">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2 text-sm">
            <Search size={16} className="text-purple-500" />
            Keywords
          </h3>
          <input
            type="text"
            placeholder="pet friendly, pool, spa..."
            value={filters.keywords}
            onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Reset & Search */}
        <div className="flex gap-2 pt-3 border-t">
          <button
            onClick={() => setFilters(defaultFilters)}
            className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={() => {
              if (selectedPoi) {
                handleSearchWithPoi(selectedPoi);
              } else {
                // Search using current map center if no POI selected
                handleSearchWithPoi({
                  name: 'Current Map Area',
                  placeId: '',
                  location: center
                });
              }
              setMobileView('list');
            }}
            disabled={isLoading}
            className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>

        {/* Current POI */}
        {selectedPoi && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Current POI</span>
              </div>
              <button onClick={clearPoi} className="text-blue-600 hover:text-blue-800">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-blue-700 mt-1 truncate">{selectedPoi.name}</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render List Panel (Hotels and Rooms)
  const renderListPanel = () => (
    <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
      {expandedHotel ? (
        // Room Details View
        <div className="flex flex-col h-full">
          {/* Hotel Photo Banner */}
          {expandedHotel.photoUrl && (
            <div className="relative h-40 flex-shrink-0">
              <img
                src={expandedHotel.photoUrl}
                alt={expandedHotel.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setExpandedHotel(null)}
                className="absolute top-3 left-3 flex items-center gap-1 text-white bg-black/30 px-2 py-1 rounded-full text-sm hover:bg-black/50"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-bold text-lg text-white drop-shadow">{expandedHotel.name}</h3>
                <p className="text-xs text-white/90">{expandedHotel.address}</p>
              </div>
            </div>
          )}
          {!expandedHotel.photoUrl && (
            <div className="p-3 bg-white border-b sticky top-0 z-10">
              <button
                onClick={() => setExpandedHotel(null)}
                className="flex items-center gap-1 text-blue-600 text-sm mb-2"
              >
                <ChevronLeft size={16} /> Back to Hotels
              </button>
              <h3 className="font-bold text-lg">{expandedHotel.name}</h3>
              <p className="text-xs text-gray-600">{expandedHotel.address}</p>
            </div>
          )}

          <div className="p-3 bg-white border-b">
            <div className="flex items-center gap-2">
              {expandedHotel.rating && (
                <div className="flex items-center gap-1">
                  {renderStars(expandedHotel.rating)}
                  <span className="text-xs">({expandedHotel.rating})</span>
                </div>
              )}
              {expandedHotel.grnMatch && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">GRN: {expandedHotel.grnMatch.grn_hotel_id}</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border-b text-xs">
            <span className="font-medium">{formatDate(filters.checkInDate)} - {formatDate(filters.checkOutDate)}</span>
            <span className="mx-2">|</span>
            <span>{nights} night{nights > 1 ? 's' : ''}</span>
            <span className="mx-2">|</span>
            <span>{filters.adults} adult{filters.adults > 1 ? 's' : ''}{filters.children > 0 ? `, ${filters.children} child${filters.children > 1 ? 'ren' : ''}` : ''}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Available Rooms ({expandedHotel.rooms?.length || 0})</h4>
            {expandedHotel.rooms?.map((room) => (
              <div key={room.roomId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                {/* Room Photo */}
                {room.photoUrl && (
                  <img
                    src={room.photoUrl}
                    alt={room.roomName}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{room.roomName}</h5>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        <Bed size={12} /> {room.bedType} · Max {room.maxOccupancy} guests
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-700">${room.ratePerNight}<span className="text-xs font-normal text-gray-500">/night</span></p>
                      <p className="text-xs text-gray-600">${room.totalRate} total</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.map((amenity, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-xs rounded">{amenity}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`text-xs ${room.cancellationPolicy.includes('Free') ? 'text-green-600' : 'text-orange-600'}`}>
                      {room.cancellationPolicy}
                    </span>
                    <span className="text-xs text-blue-600">{room.available} left</span>
                  </div>
                  <button className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Select Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Hotels List View
        <div className="flex flex-col h-full">
          <div className="p-3 bg-white border-b sticky top-0 z-10">
            <h3 className="font-bold text-sm">{hotels.length} Hotels Available</h3>
            <p className="text-xs text-gray-600">
              {formatDate(filters.checkInDate)} - {formatDate(filters.checkOutDate)} · {nights} nights · {filters.adults + filters.children} guests
            </p>
          </div>

          {hotels.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Hotel className="mx-auto mb-3 text-gray-400" size={48} />
                <p className="text-gray-600">No hotels found</p>
                <p className="text-sm text-gray-500 mt-1">Search for a POI on the Map tab to find hotels</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {hotels.map((hotel, index) => (
                <div
                  key={hotel.placeId || index}
                  className="bg-white rounded-lg border shadow-sm cursor-pointer hover:border-blue-300 transition-colors overflow-hidden"
                  onClick={() => setExpandedHotel(hotel)}
                >
                  <div className="flex">
                    {/* Hotel Thumbnail */}
                    {hotel.photoUrl && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={hotel.photoUrl}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 p-3 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Hotel className={hotel.grnMatch ? 'text-green-600' : 'text-gray-400'} size={18} />
                          <h4 className="font-medium text-sm">{hotel.name}</h4>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{hotel.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hotel.rating && (
                            <div className="flex items-center gap-1">
                              {renderStars(hotel.rating)}
                              <span className="text-xs">({hotel.rating})</span>
                            </div>
                          )}
                          {hotel.grnMatch && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">GRN</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {hotel.lowestRate && (
                          <p className="font-bold text-green-700">From ${hotel.lowestRate}</p>
                        )}
                        <p className="text-xs text-gray-500">{hotel.rooms?.length || 0} room types</p>
                        <ChevronRight className="text-gray-400 mt-1" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render Chat Panel
  const renderChatPanel = () => (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-2.5 ${
                msg.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.type === 'system'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-green-50 text-gray-800 border border-green-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleChatSubmit} className="p-3 border-t shrink-0 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={awaitingInput ? `Enter ${awaitingInput === 'checkin' ? 'check-in' : 'check-out'} date...` : 'Type a message...'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !chatInput.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-gray-100 overflow-hidden">
      {/* Map Section */}
      <div className={`flex-1 flex-col ${mobileView === 'map' ? 'flex' : 'hidden'} md:flex ${desktopChatMode === 'fullscreen' ? 'md:hidden' : ''}`}>
        <div className="flex-1 relative min-h-0">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={zoom}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true
            }}
          >
            {selectedPoi?.location && (
              <Marker
                position={selectedPoi.location}
                icon={{
                  url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: new google.maps.Size(40, 40)
                }}
                title={selectedPoi.name}
              />
            )}

            {hotels.map((hotel, index) => (
              hotel.latitude && hotel.longitude && (
                <Marker
                  key={hotel.placeId || index}
                  position={{ lat: hotel.latitude, lng: hotel.longitude }}
                  onClick={() => setSelectedHotel(hotel)}
                  icon={{
                    url: hotel.grnMatch
                      ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                      : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(32, 32)
                  }}
                  title={hotel.name}
                />
              )
            ))}

            {selectedHotel && selectedHotel.latitude && selectedHotel.longitude && (
              <InfoWindow
                position={{ lat: selectedHotel.latitude, lng: selectedHotel.longitude }}
                onCloseClick={() => setSelectedHotel(null)}
              >
                <div className="max-w-xs overflow-hidden">
                  {/* Hotel Photo - Google Places UI Kit Style */}
                  {selectedHotel.photoUrl && (
                    <div className="relative -mx-2 -mt-2 mb-2">
                      <img
                        src={selectedHotel.photoUrl}
                        alt={selectedHotel.name}
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <h3 className="font-bold text-base text-white drop-shadow">{selectedHotel.name}</h3>
                      </div>
                    </div>
                  )}
                  {!selectedHotel.photoUrl && (
                    <h3 className="font-bold text-base">{selectedHotel.name}</h3>
                  )}
                  <div className="p-1">
                    <p className="text-gray-600 text-xs">{selectedHotel.address}</p>
                    {selectedHotel.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {renderStars(selectedHotel.rating)}
                        <span className="text-xs text-gray-600">({selectedHotel.rating})</span>
                      </div>
                    )}
                    {selectedHotel.lowestRate && (
                      <p className="mt-1 font-medium text-green-700">From ${selectedHotel.lowestRate}/night</p>
                    )}
                    {selectedHotel.grnMatch && (
                      <div className="mt-2 p-1.5 bg-green-50 rounded text-xs">
                        <span className="text-green-700 font-medium">GRN: {selectedHotel.grnMatch.grn_hotel_id}</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setExpandedHotel(selectedHotel);
                        setMobileView('list');
                      }}
                      className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      View {selectedHotel.rooms?.length || 0} Room Options
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {hotels.length > 0 && (
            <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-full shadow-md text-sm font-medium">
              {hotels.length} hotels
            </div>
          )}

          {selectedPoi && (
            <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-full shadow-md text-sm font-medium flex items-center gap-2 max-w-[200px]">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{selectedPoi.name}</span>
              <button onClick={clearPoi} className="hover:bg-blue-700 rounded-full p-0.5 shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="absolute bottom-20 md:bottom-4 left-3 right-3 md:left-4 md:right-4 z-10">
            <div className="bg-white rounded-xl shadow-lg p-3">
              <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" size={20} />
                  <input
                    type="text"
                    placeholder="Search for a Point of Interest..."
                    className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                    value={poiSearch}
                    onChange={(e) => setPoiSearch(e.target.value)}
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 animate-spin" size={20} />
                  )}
                </div>
              </Autocomplete>
            </div>
          </div>
        </div>

        {/* Desktop Hotel List */}
        {hotels.length > 0 && (
          <div className="hidden md:block bg-white border-t shadow-lg max-h-48 overflow-y-auto shrink-0">
            <div className="p-2 bg-gray-50 border-b sticky top-0 text-sm flex justify-between items-center">
              <span className="font-medium">{hotels.length} Hotels</span>
              <span className="text-gray-500 text-xs">{formatDate(filters.checkInDate)} - {formatDate(filters.checkOutDate)}</span>
            </div>
            <div className="divide-y">
              {hotels.map((hotel, index) => (
                <div
                  key={hotel.placeId || index}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setExpandedHotel(hotel);
                    setDesktopActiveTab('filters');
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Hotel className={hotel.grnMatch ? 'text-green-600' : 'text-red-500'} size={18} />
                    <div>
                      <h4 className="font-medium text-sm">{hotel.name}</h4>
                      <p className="text-xs text-gray-500">{hotel.rooms?.length || 0} room types</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hotel.lowestRate && (
                      <span className="font-medium text-green-700">${hotel.lowestRate}</span>
                    )}
                    {hotel.grnMatch && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">GRN</span>
                    )}
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Filters View */}
      <div className={`${mobileView === 'filters' ? 'flex' : 'hidden'} md:hidden fixed inset-0 top-0 bottom-14 bg-white flex-col`}>
        <div className="p-4 border-b bg-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-blue-600" />
            Booking Filters
          </h2>
        </div>
        {renderFiltersPanel()}
      </div>

      {/* Mobile: List View */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:hidden fixed inset-0 top-0 bottom-14 bg-white flex-col`}>
        <div className="p-4 border-b bg-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <List size={20} className="text-blue-600" />
            Hotels & Rooms
          </h2>
        </div>
        {renderListPanel()}
      </div>

      {/* Mobile: Chat View */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:hidden fixed inset-0 top-0 bottom-14 bg-white flex-col`}>
        <div className="p-4 border-b bg-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle size={20} className="text-blue-600" />
            Chat
          </h2>
        </div>
        {renderChatPanel()}
      </div>

      {/* Desktop: Sidebar */}
      <div className={`hidden md:flex bg-white md:border-l shadow-lg flex-col ${getDesktopChatClasses()}`}>
        <div className="flex border-b shrink-0 bg-white">
          <button
            className={`flex-1 py-3 px-2 font-medium flex items-center justify-center gap-1 text-sm ${
              desktopActiveTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => { setDesktopActiveTab('chat'); setExpandedHotel(null); }}
          >
            <MessageCircle size={16} />
            Chat
          </button>
          <button
            className={`flex-1 py-3 px-2 font-medium flex items-center justify-center gap-1 text-sm ${
              desktopActiveTab === 'filters' && !expandedHotel ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => { setDesktopActiveTab('filters'); setExpandedHotel(null); }}
          >
            <Filter size={16} />
            Filters
          </button>
          {hotels.length > 0 && (
            <button
              className={`flex-1 py-3 px-2 font-medium flex items-center justify-center gap-1 text-sm ${
                expandedHotel ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setExpandedHotel(hotels[0])}
            >
              <List size={16} />
              Rooms
            </button>
          )}
          <button
            className="flex items-center justify-center px-3 text-gray-500 hover:text-blue-600 hover:bg-gray-50 border-l"
            onClick={cycleDesktopChatMode}
            title={getChatModeTitle()}
          >
            {getChatModeIcon()}
          </button>
        </div>

        {expandedHotel ? renderListPanel() : (desktopActiveTab === 'chat' ? renderChatPanel() : renderFiltersPanel())}
      </div>

      {/* Mobile Footer Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t shadow-lg z-[60]">
        <div className="flex h-full">
          <button
            onClick={() => setMobileView('map')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              mobileView === 'map' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Map size={20} />
            <span className="text-xs font-medium">Map</span>
          </button>
          <button
            onClick={() => setMobileView('filters')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              mobileView === 'filters' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <SlidersHorizontal size={20} />
            <span className="text-xs font-medium">Filters</span>
          </button>
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${
              mobileView === 'list' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <List size={20} />
            <span className="text-xs font-medium">List</span>
            {hotels.length > 0 && (
              <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {hotels.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView('chat')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              mobileView === 'chat' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-xs font-medium">Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
