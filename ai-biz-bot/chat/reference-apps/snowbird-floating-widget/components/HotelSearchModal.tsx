
import React, { useEffect, useState } from 'react';
import { X, Star, MapPin, Loader2, CheckCircle, Sparkles, Wifi, Coffee, Dumbbell, Waves, Info, ChevronDown, Car, Wine, Snowflake } from 'lucide-react';
import { searchHotelsNearby } from '../services/liteApiService';
import { HotelOffer } from '../types';

interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number, lng: number } | null;
  locationName: string;
  targetDate: string;
  onBookHotel?: (hotel: HotelOffer) => void;
}

const HotelSearchModal: React.FC<HotelSearchModalProps> = ({ isOpen, onClose, location, locationName, targetDate, onBookHotel }) => {
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [bookedHotelId, setBookedHotelId] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelOffer | null>(null);

  useEffect(() => {
    if (isOpen && location) {
      setLoading(true);
      setBookedHotelId(null);
      setSelectedHotel(null);
      searchHotelsNearby(location.lat, location.lng)
        .then(data => {
          setHotels(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, location]);

  const handleBook = (hotel: HotelOffer, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Simulate booking process
    setBookedHotelId(hotel.hotelId);
    if (onBookHotel) {
        onBookHotel(hotel);
    }
    setTimeout(() => {
      // Alert removed to let the map animation take focus visually
      onClose();
    }, 1000);
  };

  const getAmenityIcon = (amenity: string) => {
    const text = amenity.toLowerCase();
    if (text.includes('wifi')) return <Wifi className="w-3 h-3" />;
    if (text.includes('break')) return <Coffee className="w-3 h-3" />;
    if (text.includes('fit') || text.includes('gym')) return <Dumbbell className="w-3 h-3" />;
    if (text.includes('pool') || text.includes('spa') || text.includes('wellness')) return <Waves className="w-3 h-3" />;
    if (text.includes('shuttle') || text.includes('transfer') || text.includes('park')) return <Car className="w-3 h-3" />;
    if (text.includes('bar') || text.includes('drink') || text.includes('lounge')) return <Wine className="w-3 h-3" />;
    if (text.includes('ski') || text.includes('snow') || text.includes('storage')) return <Snowflake className="w-3 h-3" />;
    return <CheckCircle className="w-3 h-3" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 z-20 transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Hotels near {locationName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Showing availability for {targetDate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100 dark:bg-slate-950 relative z-0 transition-colors">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p>Searching best rates via LiteAPI...</p>
            </div>
          ) : (
            hotels.map((hotel) => (
              <div 
                key={hotel.hotelId} 
                onClick={() => setSelectedHotel(hotel)}
                className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col sm:flex-row hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg transition-all"
              >
                {/* Image */}
                <div className="w-full sm:w-40 h-32 sm:h-auto bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                  <img 
                    src={hotel.thumbnailUrl} 
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {(e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'}}
                  />
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/20 group-hover:bg-transparent transition-colors"></div>
                </div>
                
                {/* Info */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{hotel.name}</h3>
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded text-xs font-bold border border-yellow-200 dark:border-transparent">
                        <Star className="w-3 h-3 fill-current" />
                        {hotel.starRating}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{hotel.address || "Excellent location near the venue"}</p>
                    
                    {/* Mini Amenities Preview */}
                    <div className="flex gap-2 mt-2">
                        {hotel.amenities.slice(0,3).map((am, idx) => (
                            <span key={idx} className="text-[10px] text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200 dark:border-transparent">
                                {getAmenityIcon(am)} {am}
                            </span>
                        ))}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-end">
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500">Avg/night</p>
                       <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                         {hotel.currency} {hotel.price}
                       </p>
                    </div>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHotel(hotel);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium underline underline-offset-2"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {!loading && hotels.length === 0 && (
             <div className="text-center py-10 text-slate-500">
               No hotels found in this area.
             </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center z-20 transition-colors">
           <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             Powered by Nuitee Lite API
           </p>
        </div>

        {/* SLIDING OVERLAY */}
        <div 
            className={`
                absolute inset-x-0 bottom-0 top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-in-out flex flex-col
                ${selectedHotel ? 'translate-y-0' : 'translate-y-full'}
            `}
        >
            {selectedHotel && (
                <>
                    {/* Drag Handle / Header */}
                    <div className="flex-none p-4 flex items-center justify-between bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-800/80 dark:to-slate-900/80 border-b border-slate-200 dark:border-slate-700">
                        <div>
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedHotel.name}</h3>
                             <p className="text-xs text-slate-500 dark:text-slate-400">{selectedHotel.address}</p>
                        </div>
                        <button 
                            onClick={() => setSelectedHotel(null)}
                            className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Details */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* Image Banner */}
                        <div className="w-full h-48 rounded-lg overflow-hidden relative shadow-lg group">
                             <img 
                                src={selectedHotel.thumbnailUrl} 
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                                alt={selectedHotel.name}
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                             <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur text-slate-900 dark:text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                {selectedHotel.starRating} Stars
                             </div>
                        </div>

                        {/* AI Summary Section */}
                        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-500/10 dark:via-purple-500/5 dark:to-blue-500/10 border border-indigo-200 dark:border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden shadow-sm dark:shadow-inner">
                             <div className="absolute -top-6 -right-6 p-4 opacity-20">
                                 <Sparkles className="w-32 h-32 text-indigo-400 blur-sm" />
                             </div>
                             <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2 mb-3 relative z-10">
                                <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                AI Experience Summary
                             </h4>
                             <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed relative z-10 font-medium tracking-wide">
                                "{selectedHotel.aiSummary}"
                             </p>
                        </div>

                        {/* Amenities Grid */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Top Amenities</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedHotel.amenities.map((am, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-800/80 p-3 rounded-lg flex items-center gap-3 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-blue-600 dark:text-blue-400 shadow-sm">
                                            {getAmenityIcon(am)}
                                        </div>
                                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{am}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex-none p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center pb-8 md:pb-4 backdrop-blur-md transition-colors">
                         <div>
                             <p className="text-xs text-slate-500">Total for 1 Night</p>
                             <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedHotel.currency} {selectedHotel.price}</p>
                         </div>
                         <button 
                            onClick={(e) => handleBook(selectedHotel, e as any)}
                            disabled={bookedHotelId === selectedHotel.hotelId}
                            className={`
                                px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-95 flex items-center gap-2
                                ${bookedHotelId === selectedHotel.hotelId 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25'}
                            `}
                        >
                            {bookedHotelId === selectedHotel.hotelId ? (
                                <>
                                <CheckCircle className="w-5 h-5" />
                                Confirmed
                                </>
                            ) : (
                                'Book This Room'
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>

      </div>
    </div>
  );
};

export default HotelSearchModal;
