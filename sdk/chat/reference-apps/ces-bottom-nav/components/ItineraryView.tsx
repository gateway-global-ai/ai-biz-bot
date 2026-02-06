
import React, { useState } from 'react';
import { INITIAL_ITINERARY } from '../constants';
import { GlassCard } from './GlassCard';
import { fetchPlaceDetailsByName, getPhotoUrl, GooglePlaceDetails } from '../googlePlacesService';
import { 
  Plane, 
  Hotel, 
  Utensils, 
  Mic2, 
  PartyPopper, 
  IdCard, 
  Presentation,
  MapPin,
  Clock,
  Star,
  X,
  Navigation,
  Info,
  ChevronRight,
  Phone,
  Globe,
  Share2,
  Loader2,
  AlertCircle
} from 'lucide-react';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'flight': return <Plane className="w-6 h-6" />;
    case 'hotel': return <Hotel className="w-6 h-6" />;
    case 'food': return <Utensils className="w-6 h-6" />;
    case 'session': return <Mic2 className="w-6 h-6" />;
    case 'party': return <PartyPopper className="w-6 h-6" />;
    case 'badge': return <IdCard className="w-6 h-6" />;
    case 'exhibit': return <Presentation className="w-6 h-6" />;
    default: return <MapPin className="w-6 h-6" />;
  }
};

export const ItineraryView: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = INITIAL_ITINERARY.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, typeof INITIAL_ITINERARY>);

  const handleCardClick = async (location: string, type: string) => {
    // Only attempt fetch for items with a definitive location name
    if (location.toLowerCase().includes('terminal') || location.toLowerCase().includes('transfer') || !location) {
      console.log('Skipping generic or non-POI location');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const details = await fetchPlaceDetailsByName(location);
      if (details) {
        setSelectedPlace(details);
      } else {
        setError(`Could not find details for "${location}"`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) {
      setError("Communication failure with mapping service.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-700">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="relative">
          <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-xl px-6 py-3 border-y border-white/5 shadow-lg">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">
              {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
          </div>

          <div className="px-6 mt-8 flex flex-col gap-6">
            {items.map((item, idx) => (
              <div key={item.id} className="relative flex gap-8">
                {/* Tesla Line Design */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-2xl shrink-0 backdrop-blur-md`}>
                    {getTypeIcon(item.type)}
                  </div>
                  {idx < items.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-white/20 via-white/10 to-transparent my-3" />
                  )}
                </div>

                <div className="flex-1 pb-10">
                  <GlassCard 
                    className="hover:bg-white/10 cursor-pointer active:scale-[0.98] border-white/10 group relative !p-7 shadow-xl"
                    onClick={() => handleCardClick(item.location, item.type)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-black uppercase tracking-widest whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {item.time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-400 font-bold mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed font-medium opacity-90">
                      {item.description}
                    </p>
                    <div className="absolute bottom-6 right-6 text-white/10 group-hover:text-blue-500 transition-all transform group-hover:translate-x-1">
                      <ChevronRight size={20} />
                    </div>
                  </GlassCard>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Feedback Toast */}
      {error && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-red-900/40 backdrop-blur-xl border border-red-500/50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{error}</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
           <GlassCard className="flex flex-col items-center gap-4 py-10 px-12">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm font-black uppercase tracking-widest text-blue-400">Querying Crystal Hub...</p>
           </GlassCard>
        </div>
      )}

      {/* Google Places Profile Overlay */}
      {selectedPlace && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPlace(null)} />
          
          <div className="relative w-full max-w-lg glass-panel rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-white/10 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto">
            {/* Hero Section */}
            <div className="relative h-80 overflow-hidden bg-gray-900">
              {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                <img 
                  src={getPhotoUrl(selectedPlace.photos[0].name)} 
                  alt={selectedPlace.displayName.text} 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-900/20">
                  <MapPin size={64} className="text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              
              <button 
                onClick={() => setSelectedPlace(null)}
                className="absolute top-8 right-8 p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 text-white hover:bg-white/20 transition-all z-20 active:scale-90"
              >
                <X size={24} />
              </button>

              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-blue-600/90 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg text-white">Google Places Verified</span>
                  {selectedPlace.regularOpeningHours && (
                    <span className={`px-3 py-1 ${selectedPlace.regularOpeningHours.openNow ? 'bg-green-500/90' : 'bg-red-500/90'} text-[10px] font-black uppercase tracking-[0.2em] rounded-lg text-white`}>
                      {selectedPlace.regularOpeningHours.openNow ? 'Open Now' : 'Closed'}
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-xl">{selectedPlace.displayName.text}</h2>
                <div className="flex items-center gap-3">
                  {selectedPlace.rating && (
                    <>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} className={i < Math.floor(selectedPlace.rating!) ? "text-yellow-400 fill-yellow-400" : "text-gray-700"} />
                        ))}
                      </div>
                      <span className="text-sm font-black text-yellow-400">{selectedPlace.rating}</span>
                      <span className="text-sm text-white/40 font-bold">({selectedPlace.userRatingCount?.toLocaleString()} Reviews)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-10 space-y-10 bg-black/60">
              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-4">
                <ActionButton icon={<Navigation size={22}/>} label="Navigate" active />
                <ActionButton 
                  icon={<Phone size={22}/>} 
                  label="Connect" 
                  onClick={() => selectedPlace.nationalPhoneNumber && window.open(`tel:${selectedPlace.nationalPhoneNumber}`)}
                  disabled={!selectedPlace.nationalPhoneNumber}
                />
                <ActionButton 
                  icon={<Globe size={22}/>} 
                  label="Website" 
                  onClick={() => selectedPlace.websiteUri && window.open(selectedPlace.websiteUri)}
                  disabled={!selectedPlace.websiteUri}
                />
                <ActionButton icon={<Share2 size={22}/>} label="Share" />
              </div>

              {/* Meta Info */}
              <div className="space-y-6 border-y border-white/5 py-10">
                <div className="flex items-start gap-5">
                   <MapPin className="text-blue-500 mt-1 shrink-0" size={20} />
                   <div className="flex-1">
                      <p className="text-base text-gray-200 font-semibold leading-snug">{selectedPlace.formattedAddress}</p>
                   </div>
                </div>
                {selectedPlace.nationalPhoneNumber && (
                  <div className="flex items-center gap-5">
                    <Phone className="text-blue-500 shrink-0" size={20} />
                    <p className="text-base text-gray-200 font-semibold">{selectedPlace.nationalPhoneNumber}</p>
                  </div>
                )}
                <div className="flex items-center gap-5">
                   <Info className="text-blue-500 shrink-0" size={20} />
                   <p className="text-base text-gray-200 font-semibold uppercase tracking-wider">
                     {selectedPlace.types?.[0]?.replace('_', ' ') || 'Establishment'}
                   </p>
                </div>
              </div>

              {/* Summary */}
              {selectedPlace.editorialSummary && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Business Intel</h3>
                  <p className="text-base text-gray-400 leading-relaxed font-medium italic">
                    "{selectedPlace.editorialSummary.text}"
                  </p>
                </div>
              )}
              
              {/* Main Action */}
              <button 
                className="w-full bg-blue-600 py-6 rounded-3xl flex items-center justify-center gap-4 font-black shadow-2xl shadow-blue-600/40 active:scale-95 transition-all text-sm uppercase tracking-[0.25em] text-white mt-4"
                onClick={() => alert(`Launching Crystal Navigation to ${selectedPlace.displayName.text}`)}
              >
                <Navigation size={22} />
                Begin Guidance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; disabled?: boolean }> = ({ icon, label, active, onClick, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-3 group transition-opacity ${disabled ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
      active 
      ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-600/30 text-white' 
      : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-white/10 group-active:scale-90 hover:text-white'
    }`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{label}</span>
  </button>
);
