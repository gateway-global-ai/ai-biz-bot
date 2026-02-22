import { useState, useRef, useCallback, useEffect } from 'react';
import ShareButton from '@/components/ShareButton';
import { LiveVoiceClient } from '@/services/liveService';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { ReferralFooter } from '@/components/layout/ReferralFooter';

interface PlaceData {
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  place_id?: string;
  url?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  photos?: any[];
  reviews?: any[];
  types?: string[];
  geometry?: { lat: number; lng: number };
  price_level?: number;
  business_status?: string;
  vicinity?: string;
  utc_offset?: number;
  editorial_summary?: string;
  plus_code?: { global_code?: string; compound_code?: string };
  address_components?: any[];
  wheelchair_accessible_entrance?: boolean;
  delivery?: boolean;
  dine_in?: boolean;
  takeout?: boolean;
  curbside_pickup?: boolean;
  reservable?: boolean;
  serves_beer?: boolean;
  serves_wine?: boolean;
  serves_breakfast?: boolean;
  serves_lunch?: boolean;
  serves_dinner?: boolean;
  serves_brunch?: boolean;
  serves_vegetarian_food?: boolean;
}

interface WebsitePreviewProps {
  place: PlaceData;
  siteConfigId?: string;
  /** AI-generated or custom hero image URL saved in site_configs */
  heroImageUrl?: string | null;
  /** Google Place ID — used to fetch hero from Places photo proxy if no heroImageUrl */
  placeId?: string | null;
  onBack: () => void;
}

function getPhotoUrl(photo: any, maxWidth = 1200): string | null {
  if (!photo) return null;
  // Live Google Maps JS API objects
  if (typeof photo.getURI === 'function') return photo.getURI({ maxWidth });
  if (typeof photo.getUrl === 'function') return photo.getUrl({ maxWidth });
  return null;
}

function generateTagline(place: PlaceData): string {
  const types = place.types || [];
  const city = place.formatted_address?.split(',').slice(-2, -1)[0]?.trim() || '';
  if (types.includes('restaurant') || types.includes('food')) {
    return `Your Favorite Dining Experience${city ? `, Right Here in ${city}` : ''}.`;
  }
  if (types.includes('store') || types.includes('shopping_mall')) {
    return `Quality Products & Service${city ? ` in ${city}` : ''}.`;
  }
  if (types.includes('health') || types.includes('doctor') || types.includes('dentist')) {
    return `Trusted Healthcare${city ? ` in ${city}` : ''}.`;
  }
  return `Serving Our Community${city ? ` in ${city}` : ''} with Excellence.`;
}

function generateDescription(place: PlaceData): string {
  const parts: string[] = [];
  parts.push(`Welcome to ${place.name}.`);
  if (place.rating) {
    parts.push(`Rated ${place.rating} out of 5 by ${place.user_ratings_total?.toLocaleString() || 'our'} customers,`);
    parts.push(`we're committed to providing the best experience.`);
  }
  if (place.formatted_address) {
    parts.push(`Visit us at ${place.formatted_address}.`);
  }
  if (place.formatted_phone_number) {
    parts.push(`Call us at ${place.formatted_phone_number} or use our AI assistant for instant support.`);
  }
  return parts.join(' ');
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function WebsitePreview({ place, siteConfigId, heroImageUrl: heroImageUrlProp, placeId: placeIdProp, onBack }: WebsitePreviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const agentName = 'Ava';
  const agentRole = 'CONCIERGE';
  
  // --- NEW: ConciergePanel State ---
  const [chatLayout, setChatLayout] = useState<'floating' | 'fixed' | 'fullscreen'>('fixed');
  const [initialView, setInitialView] = useState<'chat' | 'voice'>('chat');
  
  // Voice configuration - default to Premium (Clear Voice) for preview
  const voiceConfig = VoiceClientFactory.getDefaultConfig('premium');
  
  const [adminTab, setAdminTab] = useState<'data' | 'reviews' | 'ai'>('data');
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [activeMapTab, setActiveMapTab] = useState<'map' | 'streetview' | 'satellite'>('map');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi there! I'm the AI assistant for ${place.name}. I can help you with hours, services, directions, or anything else. What would you like to know?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceIntensity, setVoiceIntensity] = useState(0);
  const voiceClient = useRef(new LiveVoiceClient());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const voiceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat panel size: floating → fixed sidebar → fullscreen (template-style)
  type ChatLayoutMode = 'floating' | 'fixed' | 'fullscreen';
  const [chatLayoutMode, setChatLayoutMode] = useState<ChatLayoutMode>('floating');
  const cycleChatLayout = useCallback(() => {
    setChatLayoutMode((prev) =>
      prev === 'floating' ? 'fixed' : prev === 'fixed' ? 'fullscreen' : 'floating'
    );
  }, []);

  // PTT (Push-To-Talk) state: hold to record, release to transcribe & send
  const [isPTTRecording, setIsPTTRecording] = useState(false);
  const [isPTTFinalizing, setIsPTTFinalizing] = useState(false);
  const [pttPreviewText, setPttPreviewText] = useState('');
  const pttMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const pttStreamRef = useRef<MediaStream | null>(null);
  const pttChunksRef = useRef<Blob[]>([]);

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', content: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          businessName: place.name,
          businessAddress: place.formatted_address,
          businessPhone: place.formatted_phone_number,
          history: chatMessages.slice(-10),
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I could not process that. Please try again.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatInput, chatLoading, chatMessages, place]);

  useEffect(() => {
    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
      }
      voiceClient.current.disconnect();
    };
  }, []);

  useEffect(() => {
    fetch('/api/config/maps-key')
      .then(res => res.json())
      .then(data => { if (data.key) setMapsApiKey(data.key); })
      .catch(() => {});
  }, []);

  const toggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      setVoiceIntensity(0);
      setPttPreviewText('');
      setIsPTTRecording(false);
      setIsPTTFinalizing(false);
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      voiceClient.current.disconnect();
    } else {
      setIsVoiceMode(true);
      voiceIntervalRef.current = setInterval(() => {
        setVoiceIntensity((v) => (v + (Math.random() * 40 - 15) + 50) % 100);
      }, 150);

      // Connect to Gemini Live Proxy
      const agentConfig = {
        name: agentName,
        role: agentRole,
        discProfile: 'Steadiness (Supportive, Patient)',
        roleType: 'customer'
      };
      
      voiceClient.current.onVolumeChange = (v) => setVoiceIntensity(v * 500);
      voiceClient.current.onTranscriptionUpdate = (text, isFinal) => {
        setPttPreviewText(text);
        if (isFinal && text) {
          setChatMessages(prev => [...prev, { role: 'user', content: text }]);
        }
      };
      voiceClient.current.onMessage = (text) => {
        if (text) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: text }]);
        }
      };
      
      voiceClient.current.connect(place as any, agentConfig, 'Zephyr')
        .catch(err => {
          console.error("Voice connection error:", err);
          setIsVoiceMode(false);
        });
    }
  }, [isVoiceMode, place, agentName, agentRole]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string)?.split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handlePTTStart = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (isPTTRecording || isPTTFinalizing) return;

    setIsPTTRecording(true);
    setPttPreviewText('');
    voiceClient.current.setStreaming(true);
  }, [isPTTRecording, isPTTFinalizing]);

  const handlePTTEnd = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (!isPTTRecording) return;

    setIsPTTRecording(false);
    voiceClient.current.setStreaming(false);
  }, [isPTTRecording]);

  // Priority: AI-generated/custom URL → server photo proxy (by placeId) → live Maps API object → placeholder
  const effectivePlaceId = placeIdProp || place.place_id;
  const heroImage: string | null =
    heroImageUrlProp ||
    (effectivePlaceId ? `/api/places/photo-proxy/${encodeURIComponent(effectivePlaceId)}?maxWidth=1200` : null) ||
    (place.photos && place.photos.length > 0 ? getPhotoUrl(place.photos[0]) : null);

  // Gallery: use proxy for stored photos, live API for live Place objects
  const galleryImages = (place.photos || []).slice(1, 4).map((p, i) => {
    const fromApi = getPhotoUrl(p, 600);
    if (fromApi) return fromApi;
    // For stored photos use place_id with an index offset (best-effort)
    return effectivePlaceId ? null : null;
  }).filter(Boolean) as string[];
  const tagline = generateTagline(place);
  const description = generateDescription(place);
  const mapLink = place.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    : place.geometry
      ? `https://www.google.com/maps/search/?api=1&query=${place.geometry.lat},${place.geometry.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.formatted_address)}`;
  const reviews = place.reviews || [];
  const hours = place.opening_hours?.weekday_text || [];
  const types = (place.types || []).filter(t => !['point_of_interest', 'establishment'].includes(t)).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-3 sm:px-6 py-3 flex justify-between items-center gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0" data-testid="button-preview-back">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="font-bold text-base sm:text-xl tracking-tight text-slate-900 truncate max-w-[140px] sm:max-w-[300px] md:max-w-none" title={place.name}>
            {place.name}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <ShareButton
            shareTitle={`Check out ${place.name}`}
            shareText={`${place.name} - ${place.formatted_address}${place.rating ? ` | Rated ${place.rating}/5` : ''}`}
            variant="light"
            testIdPrefix="preview-share"
          />
          <button
            onClick={() => { setIsChatOpen(true); setIsVoiceMode(false); }}
            className="p-2 sm:px-4 sm:py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
            data-testid="button-preview-concierge"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="hidden sm:inline">Concierge</span>
          </button>
        </div>
      </nav>

      <main>
        <div className="relative h-[85vh] min-h-[600px] w-full bg-slate-900 text-white overflow-hidden rounded-b-[4rem] shadow-2xl group">
          <div className="absolute inset-0 select-none">
            {heroImage ? (
              <img
                src={heroImage}
                alt={place.name}
                className="w-full h-full object-cover transition-transform duration-[2s] ease-out scale-105 group-hover:scale-110 opacity-70"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-slate-900/60 to-slate-900" />
          </div>
          <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center z-10">
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-8 border border-white/20 backdrop-blur-md shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {tagline}
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 text-white drop-shadow-sm leading-tight">
                {place.name}
              </h1>
              <p className="text-lg md:text-xl text-slate-200/90 max-w-2xl mb-12 leading-relaxed font-light">
                {description}
              </p>
            </div>
            <div className="w-full mt-4 flex flex-col items-center">
              <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                <button onClick={() => { setIsChatOpen(true); if (!isVoiceMode) toggleVoiceMode(); }} className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-full font-bold transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] active:scale-95" data-testid="button-preview-voice">
                  <span className="relative z-10 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600">
                      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                      <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 9.364 1.5 1.5 0 01-3 0 6.751 6.751 0 01-6-9.364v-1.5a.75.75 0 01.75-.75z" />
                    </svg>
                    Voice Concierge
                  </span>
                </button>
                <button
                  onClick={() => { setIsChatOpen(true); setIsVoiceMode(false); }}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-semibold transition-all backdrop-blur-sm border border-white/10 hover:border-white/20"
                  data-testid="button-preview-chat"
                >
                  <span>Chat Concierge</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.355 0-2.697-.056-4.024-.166-1.137-.09-1.98-1.057-1.98-2.193v-4.286c0-.897.494-1.685 1.257-2.071m-6.429 1.256c.004-.326.244-.593.57-.615 1.355-.091 2.697-.167 4.024-.167 1.328 0 2.67.076 4.025.167.326.022.566.29.569.615v4.285c-.003.327-.243.594-.57.615-1.355.092-2.697.168-4.024.168-1.04 0-2.052-.046-3.045-.118H7.5v2.25l-2.25-2.25h-.75c-.327-.021-.567-.288-.569-.615V9.767z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 auto-rows-min">
            <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">About Us</h3>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed">{description}</p>
              </div>
              {types.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {types.map((t, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-100 capitalize">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {hours.length > 0 && (
              <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-900/10 text-white flex flex-col">
                <div className="flex items-center gap-3 mb-6 text-white/90">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-bold">Hours</h3>
                </div>
                <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {hours.slice(0, 7).map((hour, i) => (
                    <li key={i} className="flex justify-between text-sm text-slate-300 py-1 border-b border-white/5 last:border-0">
                      <span>{hour.split(': ')[0]}</span>
                      <span className="text-white font-medium">{hour.split(': ')[1] || 'Closed'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {place.rating && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 rounded-[2rem] shadow-xl shadow-orange-500/20 text-white flex flex-col justify-center items-center text-center">
                <h3 className="text-6xl font-black mb-2">{place.rating.toFixed(1)}</h3>
                <div className="flex gap-1 mb-2 text-white">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.round(place.rating!) ? 'fill-current' : 'fill-white/30'}`} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/90 text-sm font-medium">{place.user_ratings_total?.toLocaleString() || '0'} verified reviews</span>
              </div>
            )}

            {galleryImages.length > 0 && (
              <div className="md:col-span-2 row-span-1 h-64 md:h-auto overflow-hidden rounded-[2rem] shadow-lg border border-slate-100 bg-slate-100 relative group">
                <div className={`grid ${galleryImages.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} h-full gap-1`}>
                  <div className="h-full overflow-hidden">
                    <img src={galleryImages[0]} alt="Gallery 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  {galleryImages.length >= 2 && (
                    <div className={`grid ${galleryImages.length >= 3 ? 'grid-rows-2' : 'grid-rows-1'} gap-1 h-full`}>
                      <div className="overflow-hidden h-full">
                        <img src={galleryImages[1]} alt="Gallery 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      </div>
                      {galleryImages[2] && (
                        <div className="overflow-hidden h-full">
                          <img src={galleryImages[2]} alt="Gallery 3" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-slate-900 shadow-lg">
                    See Gallery
                  </div>
                </div>
              </div>
            )}

            {mapsApiKey && (place.place_id || place.geometry) && (
              <div className="md:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden" data-testid="section-location">
                <div className="p-8 pb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Find Us</h3>
                      <p className="text-sm text-slate-500">{place.formatted_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {([
                      { key: 'map' as const, label: 'Map', icon: 'M9 6.75V15m0 0l-3-3m3 3l3-3m-3 3V6.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { key: 'streetview' as const, label: 'Street View', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z' },
                      { key: 'satellite' as const, label: 'Satellite', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
                    ]).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveMapTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeMapTab === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        data-testid={`button-${tab.key}-tab`}
                      >
                        <span className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                          </svg>
                          {tab.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-80 w-full">
                  {activeMapTab === 'map' && (
                    <iframe
                      title={`Map of ${place.name}`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${place.place_id ? `place_id:${place.place_id}` : encodeURIComponent(place.formatted_address)}&zoom=16`}
                      data-testid="iframe-map"
                    />
                  )}
                  {activeMapTab === 'streetview' && (
                    <iframe
                      title={`Street View of ${place.name}`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={place.geometry
                        ? `https://www.google.com/maps/embed/v1/streetview?key=${mapsApiKey}&location=${place.geometry.lat},${place.geometry.lng}&heading=210&pitch=10&fov=90`
                        : `https://www.google.com/maps/embed/v1/streetview?key=${mapsApiKey}&location=${encodeURIComponent(place.formatted_address)}&heading=210&pitch=10&fov=90`
                      }
                      data-testid="iframe-streetview"
                    />
                  )}
                  {activeMapTab === 'satellite' && (
                    <iframe
                      title={`Satellite View of ${place.name}`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/view?key=${mapsApiKey}&center=${place.geometry ? `${place.geometry.lat},${place.geometry.lng}` : encodeURIComponent(place.formatted_address)}&zoom=18&maptype=satellite`}
                      data-testid="iframe-satellite"
                    />
                  )}
                </div>
                <div className="p-4 flex justify-between items-center border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    <a href={mapLink} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline" data-testid="link-directions">Get Directions</a>
                  </div>
                  {place.formatted_phone_number && (
                    <a href={`tel:${place.formatted_phone_number}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors" data-testid="link-call">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      {place.formatted_phone_number}
                    </a>
                  )}
                </div>
              </div>
            )}

            {place.editorial_summary && (
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-[2rem] shadow-xl shadow-indigo-200/30 border border-indigo-100 flex flex-col" data-testid="section-editorial-summary">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Google Summary</h3>
                </div>
                <p className="text-indigo-800/80 text-lg leading-relaxed">{place.editorial_summary}</p>
              </div>
            )}

            {(() => {
              const amenities = [
                { key: 'wheelchair_accessible_entrance' as const, label: 'Wheelchair Accessible', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z' },
                { key: 'delivery' as const, label: 'Delivery', icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
                { key: 'dine_in' as const, label: 'Dine-In', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-12.75C21 2.343 19.657 1 18 1H6C4.343 1 3 2.343 3 3.75' },
                { key: 'takeout' as const, label: 'Takeout', icon: 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' },
                { key: 'curbside_pickup' as const, label: 'Curbside Pickup', icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
                { key: 'reservable' as const, label: 'Reservations', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
                { key: 'serves_beer' as const, label: 'Beer', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
                { key: 'serves_wine' as const, label: 'Wine', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5' },
                { key: 'serves_breakfast' as const, label: 'Breakfast', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-12.75C21 2.343 19.657 1 18 1H6C4.343 1 3 2.343 3 3.75' },
                { key: 'serves_lunch' as const, label: 'Lunch', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-12.75C21 2.343 19.657 1 18 1H6C4.343 1 3 2.343 3 3.75' },
                { key: 'serves_dinner' as const, label: 'Dinner', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-12.75C21 2.343 19.657 1 18 1H6C4.343 1 3 2.343 3 3.75' },
                { key: 'serves_brunch' as const, label: 'Brunch', icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-12.75C21 2.343 19.657 1 18 1H6C4.343 1 3 2.343 3 3.75' },
                { key: 'serves_vegetarian_food' as const, label: 'Vegetarian', icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z' },
              ];
              const activeAmenities = amenities.filter(a => place[a.key] === true);
              if (activeAmenities.length === 0) return null;
              return (
                <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100" data-testid="section-amenities">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Amenities &amp; Services</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {activeAmenities.map(a => (
                      <div key={a.key} className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-sm font-medium border border-violet-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
                        </svg>
                        {a.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {reviews.length > 0 && (
              <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.405 0 4.802.173 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                  What People Say
                </h3>
                <div className="space-y-6 flex-1 overflow-y-auto pr-2 max-h-[300px]">
                  {reviews.slice(0, 5).map((review: any, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="shrink-0">
                        {review.profile_photo_url ? (
                          <img src={review.profile_photo_url} alt={review.author_name} className="w-10 h-10 rounded-full border border-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-bold">
                            {(review.author_name || 'A').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900">{review.author_name}</span>
                          <span className="text-amber-400 flex">
                            {[...Array(5)].map((_, stars) => (
                              <svg key={stars} className={`w-3 h-3 ${stars < Math.round(review.rating) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </span>
                          {review.relative_time_description && (
                            <span className="text-xs text-slate-400">{review.relative_time_description}</span>
                          )}
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          "{review.text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                  <a href={mapLink} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-semibold hover:underline">Read all reviews on Google &rarr;</a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 mb-20 text-center border-t border-slate-200">
          <p className="text-slate-400 text-sm">
            Generated with AI &bull; Data provided by Google Maps &bull; <a href={mapLink} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">View on Maps</a>
          </p>
        </div>
      </main>

      {isAdminOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 bg-slate-900 text-white shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Admin Dashboard</h2>
                  <p className="text-slate-400 text-sm">All available data, features &amp; views</p>
                </div>
                <button onClick={() => setIsAdminOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors" data-testid="button-preview-admin-close">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-4 border-b border-slate-700">
                {([
                  { key: 'data' as const, label: 'Business Data' },
                  { key: 'reviews' as const, label: `Reviews (${reviews.length})` },
                  { key: 'ai' as const, label: 'AI Features' },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAdminTab(tab.key)}
                    className={`pb-3 text-sm font-medium transition-colors ${adminTab === tab.key ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
                    data-testid={`tab-admin-${tab.key}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              {adminTab === 'data' && (
                <div className="space-y-6">
                  {(() => {
                    const priceLevelLabels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];
                    const amenityFields: { key: keyof PlaceData; label: string }[] = [
                      { key: 'wheelchair_accessible_entrance', label: 'Wheelchair Accessible' },
                      { key: 'delivery', label: 'Delivery' },
                      { key: 'dine_in', label: 'Dine-In' },
                      { key: 'takeout', label: 'Takeout' },
                      { key: 'curbside_pickup', label: 'Curbside Pickup' },
                      { key: 'reservable', label: 'Reservable' },
                      { key: 'serves_beer', label: 'Serves Beer' },
                      { key: 'serves_wine', label: 'Serves Wine' },
                      { key: 'serves_breakfast', label: 'Serves Breakfast' },
                      { key: 'serves_lunch', label: 'Serves Lunch' },
                      { key: 'serves_dinner', label: 'Serves Dinner' },
                      { key: 'serves_brunch', label: 'Serves Brunch' },
                      { key: 'serves_vegetarian_food', label: 'Vegetarian Food' },
                    ];
                    const hasAnyAmenity = amenityFields.some(a => place[a.key] !== undefined);

                    return (
                      <>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm font-bold text-emerald-800">Google Places &mdash; Active on Website</span>
                          </div>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-3">Include</th>
                                <th className="p-3">Field</th>
                                <th className="p-3">Value</th>
                                <th className="p-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[
                                { field: 'name', value: place.name, has: true },
                                { field: 'address', value: place.formatted_address, has: true },
                                { field: 'rating', value: place.rating ? `${place.rating} / 5 (${place.user_ratings_total?.toLocaleString() || '0'} reviews)` : undefined, has: !!place.rating },
                                { field: 'phone', value: place.formatted_phone_number, has: !!place.formatted_phone_number },
                                { field: 'website', value: place.website, has: !!place.website },
                                { field: 'opening_hours', value: hours.length > 0 ? `${hours.length} day schedule` : undefined, has: hours.length > 0 },
                                { field: 'reviews', value: reviews.length > 0 ? `${reviews.length} reviews` : undefined, has: reviews.length > 0 },
                                { field: 'photos', value: `${(place.photos || []).length} photos`, has: (place.photos || []).length > 0 },
                                { field: 'map_view', value: 'Google Maps Embed', has: !!(mapsApiKey && (place.place_id || place.geometry)) },
                                { field: 'street_view', value: 'Google Street View Embed', has: !!(mapsApiKey && place.geometry) },
                                { field: 'satellite_view', value: 'Google Satellite View Embed', has: !!(mapsApiKey && (place.place_id || place.geometry)) },
                              ].map(({ field, value, has }) => (
                                <tr key={field} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 w-14">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" defaultChecked className="sr-only peer" />
                                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                                    </label>
                                  </td>
                                  <td className="p-3 font-medium text-slate-700 font-mono text-xs">{field}</td>
                                  <td className="p-3 text-slate-500 text-xs truncate max-w-[200px]">{value || 'N/A'}</td>
                                  <td className="p-3 text-right">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${has ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${has ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                      {has ? 'Live' : 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm font-bold text-blue-800">Google Places &mdash; Additional Fields Available</span>
                          </div>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-3">Field</th>
                                <th className="p-3">Value</th>
                                <th className="p-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[
                                { field: 'place_id', value: place.place_id },
                                { field: 'google_maps_url', value: place.url },
                                { field: 'international_phone', value: place.international_phone_number },
                                { field: 'price_level', value: place.price_level !== undefined ? `${place.price_level} - ${priceLevelLabels[place.price_level] || 'Unknown'}` : undefined },
                                { field: 'business_status', value: place.business_status },
                                { field: 'vicinity', value: place.vicinity },
                                { field: 'editorial_summary', value: place.editorial_summary },
                                { field: 'plus_code', value: place.plus_code?.compound_code || place.plus_code?.global_code },
                                { field: 'utc_offset', value: place.utc_offset !== undefined ? `UTC ${place.utc_offset >= 0 ? '+' : ''}${place.utc_offset / 60}` : undefined },
                                { field: 'geometry', value: place.geometry ? `${place.geometry.lat.toFixed(6)}, ${place.geometry.lng.toFixed(6)}` : undefined },
                                { field: 'types', value: (place.types || []).join(', ') || undefined },
                                { field: 'address_components', value: place.address_components ? `${place.address_components.length} components` : undefined },
                              ].map(({ field, value }) => (
                                <tr key={field} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 font-medium text-slate-700 font-mono text-xs">{field}</td>
                                  <td className="p-3 text-slate-500 text-xs truncate max-w-[240px]">{value || <span className="text-slate-300 italic">not returned</span>}</td>
                                  <td className="p-3 text-right">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-blue-500' : 'bg-slate-300'}`} />
                                      {value ? 'Available' : 'Empty'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {hasAnyAmenity && (
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-violet-500" />
                              <span className="text-sm font-bold text-violet-800">Amenities &amp; Services</span>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-2">
                              {amenityFields.map(({ key, label }) => {
                                const val = place[key];
                                return (
                                  <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${val === true ? 'bg-violet-50 text-violet-800' : val === false ? 'bg-slate-50 text-slate-400' : 'bg-slate-50 text-slate-300 italic'}`}>
                                    {val === true ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600 shrink-0">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                      </svg>
                                    ) : val === false ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300 shrink-0">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                      </svg>
                                    ) : (
                                      <span className="w-4 h-4 flex items-center justify-center shrink-0">&ndash;</span>
                                    )}
                                    {label}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-sm font-bold text-amber-800">Map Views</span>
                          </div>
                          <div className="p-4 space-y-2">
                            {[
                              { label: 'Map View', desc: 'Standard Google Maps embed showing location pin', available: !!(mapsApiKey && (place.place_id || place.geometry)) },
                              { label: 'Street View', desc: 'Ground-level 360-degree panoramic imagery', available: !!(mapsApiKey && place.geometry) },
                              { label: 'Satellite View', desc: 'Aerial satellite imagery of the location', available: !!(mapsApiKey && (place.place_id || place.geometry)) },
                            ].map(view => (
                              <div key={view.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                <div>
                                  <div className="text-sm font-semibold text-slate-700">{view.label}</div>
                                  <div className="text-xs text-slate-400">{view.desc}</div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${view.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${view.available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                  {view.available ? 'Live' : 'Unavailable'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-sky-500" />
                            <span className="text-sm font-bold text-sky-800">Weather &mdash; Google Maps Grounding</span>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                              <div>
                                <div className="text-sm font-semibold text-slate-700">Current Weather</div>
                                <div className="text-xs text-slate-400">Temperature, conditions, humidity via Google Grounding Lite</div>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                AI-Powered
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                              <div>
                                <div className="text-sm font-semibold text-slate-700">Forecast</div>
                                <div className="text-xs text-slate-400">Multi-day weather forecast for business area</div>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                AI-Powered
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-sm flex gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-medium mb-1">Developer Reference</p>
                            <p className="text-blue-600 text-xs">Toggle fields on/off to control website sections. Green = active on site, Blue = available from API, Violet = amenity data. AI agents can use any available field to add website features.</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {adminTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-bold text-amber-800">Google Business Reviews</span>
                      </div>
                      <span className="text-xs text-amber-600 font-medium">{reviews.length} reviews from Google Places API</span>
                    </div>
                    {reviews.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {reviews.map((review: any, idx: number) => (
                          <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                {review.profile_photo_url ? (
                                  <img src={review.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                    {review.author_name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold text-sm text-slate-900">{review.author_name}</span>
                                  <span className="text-amber-400 flex">
                                    {[...Array(5)].map((_, s) => (
                                      <svg key={s} className={`w-3 h-3 ${s < Math.round(review.rating) ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </span>
                                  {review.relative_time_description && (
                                    <span className="text-xs text-slate-400">{review.relative_time_description}</span>
                                  )}
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed">{review.text}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-sm">No reviews available from Google Places API</div>
                    )}
                  </div>
                </div>
              )}

              {adminTab === 'ai' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-sm font-bold text-indigo-800">AI-Powered Features</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {[
                        { title: 'AI Business Summary', desc: 'Auto-generated business description using AI analysis of all Place data, reviews, and category context.', icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z', source: 'Gemini 2.5 + Google Places', status: place.editorial_summary ? 'Available' : 'Can Generate' },
                        { title: 'AI Business Reviews', desc: 'AI-synthesized review analysis: sentiment trends, common praises/complaints, and key takeaways from all reviews.', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z', source: 'Gemini 2.5 + Reviews API', status: reviews.length > 0 ? 'Can Generate' : 'Needs Reviews' },
                        { title: 'AI Area Reviews', desc: 'Neighborhood and area analysis including nearby attractions, walkability, transit access, and local character.', icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z', source: 'Gemini 2.5 + Google Maps Grounding', status: place.geometry ? 'Can Generate' : 'Needs Location' },
                        { title: 'AI Competitor Analysis', desc: 'SWOT analysis comparing the business with nearby competitors in the same category.', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6', source: 'Google Places Aggregate API', status: place.types?.length ? 'Can Generate' : 'Needs Types' },
                        { title: 'Weather Widget', desc: 'Real-time weather conditions and forecast for the business location using Google Maps Grounding.', icon: 'M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z', source: 'Google Maps Grounding Lite', status: place.geometry ? 'Can Generate' : 'Needs Location' },
                        { title: '5 Most Recent Reviews', desc: 'Displays the latest 5 customer reviews sorted by recency with full text and rating.', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', source: 'Google Places Reviews API', status: reviews.length > 0 ? `${Math.min(5, reviews.length)} Available` : 'Needs Reviews' },
                      ].map(feature => (
                        <div key={feature.title} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-sm text-slate-800">{feature.title}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                  feature.status === 'Available' ? 'bg-emerald-50 text-emerald-700' :
                                  feature.status.startsWith('Can') ? 'bg-indigo-50 text-indigo-700' :
                                  feature.status.includes('Available') ? 'bg-emerald-50 text-emerald-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    feature.status === 'Available' ? 'bg-emerald-500' :
                                    feature.status.startsWith('Can') ? 'bg-indigo-500' :
                                    feature.status.includes('Available') ? 'bg-emerald-500' :
                                    'bg-slate-400'
                                  }`} />
                                  {feature.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mb-2">{feature.desc}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Source:</span>
                                <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{feature.source}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {place.editorial_summary && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-bold text-emerald-800">Google Editorial Summary</span>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-slate-600 leading-relaxed">{place.editorial_summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- REPLACED: Old chat UI with new ConciergePanel --- */}
      <ConciergePanel
        business={{
          id: siteConfigId || '',
          placeId: place.place_id || '',
          name: place.name,
          address: place.formatted_address || '',
          hours: place.opening_hours?.weekday_text?.join(', '),
          services: place.types,
          primaryColor: '#3b82f6'
        }}
        agent={{
          role: agentRole,
          personality: 'Helpful, professional, and friendly',
          objectives: [
            `Represent ${place.name} and assist customers`,
            'Answer questions about services, hours, and location',
            'Help customers book appointments or place orders'
          ],
          constraints: [
            'Be polite and professional',
            'Stay on topic about the business',
            'Provide accurate information from business context'
          ]
        }}
        voiceConfig={voiceConfig}
        agentName={agentName}
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setIsChatMenuOpen(false);
        }}
        initialView={initialView}
        layoutMode={chatLayout}
        onCycleLayout={() => {
          const modes: Array<'floating' | 'fixed' | 'fullscreen'> = ['floating', 'fixed', 'fullscreen'];
          const currentIndex = modes.indexOf(chatLayout);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setChatLayout(nextMode);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        zIndex={50}
      />

      {/* OLD CHAT UI REMOVED - Now using ConciergePanel above */}
      {false && isChatOpen && (
        <div
          className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl border border-slate-200 transition-all duration-300 ${
            chatLayoutMode === 'fullscreen'
              ? 'inset-0 w-full h-full rounded-none border-none'
              : chatLayoutMode === 'fixed'
                ? 'top-0 bottom-0 right-0 w-[450px] max-w-[100vw] rounded-none border-l'
                : 'bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] rounded-3xl'
          }`}
        >
          <div className="bg-blue-600 p-4 flex justify-between items-center gap-2 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold shrink-0">AI</div>
              <div>
                <span className="font-semibold block leading-tight">{agentName}</span>
                <span className="text-[10px] opacity-90 uppercase tracking-wider font-bold">{agentRole}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={cycleChatLayout}
                className="hover:bg-blue-500 p-1.5 rounded-full shrink-0 hidden sm:flex items-center justify-center"
                title="Switch view (floating / sidebar / fullscreen)"
                aria-label="Resize chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                </svg>
              </button>
              <button
                onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                className="hover:bg-blue-500 p-1.5 rounded-full shrink-0 flex items-center justify-center"
                title="Menu"
                aria-label="Chat menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <button
                onClick={() => { setIsAdminOpen(true); setIsChatMenuOpen(false); }}
                className="hover:bg-blue-500 p-1.5 rounded-full shrink-0 flex items-center gap-1 text-white/90 hover:text-white text-xs font-medium"
                title="Admin Dashboard"
                data-testid="button-preview-admin-from-chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="hidden sm:inline">Admin</span>
              </button>
              <button onClick={() => { setIsChatOpen(false); setIsChatMenuOpen(false); if (isVoiceMode) toggleVoiceMode(); }} className="hover:bg-blue-500 p-1 rounded-full shrink-0" data-testid="button-preview-chat-close">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {isChatMenuOpen && (
            <div className="absolute inset-0 z-50 bg-slate-50 animate-in slide-in-from-right duration-200 flex flex-col">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg">System Options</h3>
                <button onClick={() => setIsChatMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button onClick={() => { setIsVoiceMode(false); setIsChatMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                  </div>
                  <div><span className="block font-bold text-slate-900 text-sm">Text Concierge</span><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Standard Chat</span></div>
                </button>
                <button onClick={() => { setIsVoiceMode(true); setIsChatMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 bg-slate-900 border border-slate-900 rounded-xl shadow-md hover:bg-slate-800 transition-all text-left">
                  <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  </div>
                  <div><span className="block font-bold text-white text-sm">Voice Concierge</span><span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Push to Talk</span></div>
                </button>
                <button onClick={() => { setIsAdminOpen(true); setIsChatMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-left mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  <span className="font-bold text-xs uppercase tracking-widest">Admin Dashboard</span>
                </button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {isVoiceMode ? (
              <div className="h-full flex flex-col bg-[#0a0f1c] text-white -m-4 rounded-b-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0d1321] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-widest">Voice Engine</h3>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Secure PTT Mode</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleVoiceMode}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest transition-colors border border-white/10"
                  >
                    Text Mode
                  </button>
                </div>
                <div className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto">
                  <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-2xl shrink-0">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span className={`w-2 h-2 rounded-full ${isPTTRecording ? 'bg-red-500 animate-pulse' : isPTTFinalizing ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                        {isPTTRecording ? 'Capturing Signal...' : isPTTFinalizing ? 'Finalizing...' : 'Standby'}
                      </h4>
                      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: isPTTRecording ? '100%' : '20%' }} />
                      </div>
                    </div>
                    <div className="h-20 flex items-center justify-center gap-2">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2.5 bg-gradient-to-t from-blue-700 to-blue-400 rounded-full transition-all duration-75"
                          style={{ height: `${isPTTRecording ? Math.max(12, voiceIntensity * (0.5 + Math.random() * 0.5) + 20) : 6}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 flex flex-col relative min-h-[120px] shadow-lg shrink-0">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Transcription Preview</h4>
                    <div className={`flex-1 text-base leading-relaxed transition-opacity duration-300 ${(isPTTRecording || isPTTFinalizing) ? 'opacity-100' : 'opacity-40'}`}>
                      {(isPTTRecording || isPTTFinalizing) ? (
                        <p className="text-white font-medium italic">
                          "{pttPreviewText || (isPTTFinalizing ? 'Processing signal...' : "I'm listening...")}"
                        </p>
                      ) : (
                        <p className="text-slate-500 text-sm">Hold the button below to capture audio.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-8 pb-10 bg-[#0d1321] border-t border-white/5 shrink-0">
                  <button
                    onMouseDown={handlePTTStart}
                    onMouseUp={handlePTTEnd}
                    onMouseLeave={(e) => { if (isPTTRecording) handlePTTEnd(e); }}
                    onTouchStart={handlePTTStart}
                    onTouchEnd={handlePTTEnd}
                    className={`w-full py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.25em] transition-all flex flex-col items-center justify-center gap-2 shadow-2xl touch-none select-none ${
                      isPTTRecording
                        ? 'bg-red-600 text-white scale-[0.98] shadow-red-900/40 ring-4 ring-red-600/20'
                        : 'bg-white text-slate-900 hover:bg-slate-100 shadow-slate-900/20'
                    }`}
                    data-testid="button-voice-ptt"
                  >
                    {isPTTRecording ? (
                      <>
                        <span className="w-3 h-3 bg-white rounded-full animate-ping" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Hold to Record
                      </>
                    )}
                  </button>
                  <div className="mt-5 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isVoiceMode ? 'bg-green-500' : 'bg-slate-700'}`} />
                      {isVoiceMode ? 'Online' : 'Offline'}
                    </div>
                    <button type="button" onClick={() => { toggleVoiceMode(); setTimeout(() => toggleVoiceMode(), 150); }} className="text-blue-500 hover:text-blue-400 transition-colors">Restart Connection</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm bg-white text-slate-400 shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          {!isVoiceMode && (
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  data-testid="input-preview-chat"
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className="p-2 rounded-full shrink-0 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  data-testid="button-preview-voice-toggle"
                  title="Voice (Hold to Record)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                </button>
                <button 
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()} 
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0" 
                  data-testid="button-preview-chat-send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <ReferralFooter siteConfigId={siteConfigId} />

      {!isChatOpen && !isAdminOpen && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          {/* Voice FAB */}
          <button
            onClick={() => {
              setInitialView('voice');
              setIsChatOpen(true);
            }}
            className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center"
            data-testid="button-preview-voice-fab"
            title="Start voice conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </button>
          
          {/* Chat FAB */}
          <button
            onClick={() => {
              setInitialView('chat');
              setIsChatOpen(true);
            }}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-500 transition-transform hover:scale-105 flex items-center justify-center"
            data-testid="button-preview-chat-fab"
            title="Start text chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
