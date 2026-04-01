/**
 * @PUBLIC-SURFACE-STABLE
 * @STABILITY_LEVEL: REFERENCE_IMPLEMENTATION
 * @ELEMENTS: Hero Background, Header, Voice AI PTT
 * @DEPENDENCIES: Google Maps JS API (gmp-select), Gemini Streaming Client
 * @NOTE: This is the stable visual and functional reference for the platform.
 * Do not modify the Hero CSS or PTT logic without a full regression test.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import WebsitePreview from '@/components/WebsitePreview';
import { 
  Phone, Building2, Users, Globe, ShieldCheck, 
  ArrowLeft, CheckCircle2, MessageSquare, FileText,
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight, ChevronDown,
  Headphones, Calendar, TrendingUp, Store, ShoppingCart, Server, Cpu,
  Search, MapPin, Star, ExternalLink, Loader2, ArrowRight, Sparkles,
  Clock, Bot, Wand2, X, Eye, Send, User, LogIn, LogOut, KeyRound,
  QrCode, Sticker, Smartphone, Mic, Menu
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useCustomerAuth } from '@/lib/customerAuth';
import { useToast } from '@/hooks/use-toast';
import OtpLoginModal from '@/components/OtpLoginModal';
import ShareButton from '@/components/ShareButton';
import { DemoLaunchCard } from '@/components/DemoLaunchCard';
import { Code2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { ensureApiLoader, loadPlacesLibrary } from '@/utils/googleMapsLoader';

const HERO_BG_URL = "/hero-bg-gateway.png";
const HERO_BG_URL_FALLBACK = "/hero-bg.png";
import affiliateStickerHero from "@assets/affiliate-sticker-hero.png";
import affiliateProgramInfographic from "@assets/affiliate-program-infographic.png";
import affiliate4StepsInfographic from "@assets/affiliate-4-steps-infographic.png";

type VoiceState = 'idle' | 'loading' | 'greeting' | 'greeting_paused' | 'conversation' | 'processing' | 'responding' | 'error';

type OnboardingStage = 
  | 'landing'
  | 'generating'
  | 'preview'
  | 'phone-gate'
  | 'sending-link'
  | 'training'
  | 'demo-ready'
  | 'name-gate'
  | 'full-access';

interface SelectedPlace {
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  types?: string[];
  photos?: any[];
  opening_hours?: { weekday_text?: string[]; isOpen?: () => boolean };
  place_id?: string;
  url?: string;
  reviews?: any[];
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

const TrainingProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full max-w-md mx-auto">
    <div className="flex justify-between text-xs text-slate-400 mb-2">
      <span>Training AI Agents</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const AgentTrainingAnimation = () => {
  const [currentAgent, setCurrentAgent] = useState(0);
  const agentNames = ['Voice Concierge', 'Chat Support', 'Business Analyst', 'Content Writer'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAgent(prev => (prev + 1) % agentNames.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center animate-pulse">
          <Bot className="w-10 h-10 text-blue-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </div>
      </div>
      <p className="text-sm text-slate-400 animate-pulse">
        Training: <span className="text-white font-medium">{agentNames[currentAgent]}</span>
      </p>
    </div>
  );
};

// Reseller & Affiliate Program section — bottom of page: register form + Stripe $99 Affiliate Starter Kit
function AffiliateResellerSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid cell phone number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/affiliate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Checkout failed. Please try again.');
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError('Invalid response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative py-16 px-6 overflow-hidden bg-slate-900/40 border-y border-white/5">
      {/* Background image — cropped/cover for atmosphere */}
      <div className="absolute inset-0 z-0">
        <img
          src={affiliateStickerHero}
          alt=""
          className="w-full h-full object-cover opacity-30"
          aria-hidden
        />
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-2">
          Earn Unlimited Income As An Affiliate!
        </h2>
        <p className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 text-xl md:text-2xl font-semibold text-center mb-10">
          Generate $10,000+ Monthly In Your Local Market!
        </p>

        {/* Earnings infographic */}
        <div className="rounded-sui bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl p-6 md:p-8 mb-10">
          <p className="text-slate-400 text-center text-sm font-medium uppercase tracking-wider mb-6">Your earning potential</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {[
              { businesses: '10', commission: '8%', example: '$80+', label: 'Starter' },
              { businesses: '50', commission: '10%', example: '$500+', label: 'Growing' },
              { businesses: '100', commission: '12%', example: '$1,200+', label: 'Pro' },
              { businesses: '500+', commission: '14–16%', example: '$10,000+', label: 'Elite' },
            ].map(({ businesses, commission, example, label }) => (
              <div key={label} className="flex flex-col items-center rounded-sui bg-slate-800/50 border border-indigo-500/20 px-5 py-4 min-w-[120px]">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
                <span className="text-white font-bold text-lg mt-1">{businesses} businesses</span>
                <span className="text-indigo-400 font-semibold text-sm">{commission} commission</span>
                <span className="text-emerald-400 font-bold text-xl mt-2">{example}/mo</span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-center text-xs mt-4">Based on $99/mo per business. Commission on all recurring revenue.</p>
        </div>

        <div className="max-w-3xl mx-auto mb-10">
          <div className="rounded-sui overflow-hidden border border-indigo-500/20 shadow-xl">
            <img
              src={affiliate4StepsInfographic}
              alt="Affiliate program: 4 easy steps — add business to platform, generate QR code, visit store with flyer, demo AI receptionist, place decal, send invite via SMS. Powered by Clear Voice AI."
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        <div className="rounded-sui bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl p-6 md:p-8 w-full">
          <div className="max-w-md mx-auto">
          <p className="text-white font-semibold mb-2 text-center text-lg md:text-xl">Affiliate Starter Kit — $99</p>
          <p className="text-slate-400 text-sm md:text-base text-center mb-6">
            Includes 100 stickers, marketing literature, and a company polo. Kits usually arrive within 7 days.
          </p>
          <p className="text-white font-semibold mb-3 text-center text-base md:text-lg">
            Register as an affiliate & pay with card
          </p>
          <form onSubmit={handleCheckout} className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
              disabled={submitting}
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
              disabled={submitting}
            />
            <Input
              type="tel"
              placeholder="Cell phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500"
              disabled={submitting}
            />
            {error && <p className="text-amber-400 text-xs md:text-sm">{error}</p>}
            <Button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-sui text-base md:text-lg w-full"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to checkout…</>
              ) : (
                'Register & Pay $99 — Affiliate Starter Kit'
              )}
            </Button>
          </form>
          </div>
        </div>

        <p className="text-center mt-6">
          <Link href="/reseller/apply">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs md:text-sm">
              Apply for reseller access →
            </Button>
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function BusinessPage() {
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState<OnboardingStage>('landing');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [gateStep, setGateStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [previewTimer, setPreviewTimer] = useState(600); // 10 minutes to view preview and complete OTP
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [demoLeadId, setDemoLeadId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [demoCountdown, setDemoCountdown] = useState(3600); // 1 hour (production)
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [tokenError, setTokenError] = useState<string | null>(null);
  // Manual profile (no Google Place): for businesses without a Google listing (e.g. Gateway Global AI, digital-only)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualWebsite, setManualWebsite] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const groundingHintRef = useRef('');
  const [showLocationOptions, setShowLocationOptions] = useState(false);

  useEffect(() => {
    const hint = [locationCity.trim(), locationState.trim()].filter(Boolean).join(', ');
    groundingHintRef.current = hint;
  }, [locationCity, locationState]);

  const { user, isAuthenticated, login: authLogin, logout: authLogout } = useAuth();
  const { user: customerUser, isAuthenticated: isCustomerAuth, login: customerLogin, logout: customerLogout } = useCustomerAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCustomerLoginModal, setShowCustomerLoginModal] = useState(false);

  // --- NEW: ConciergePanel State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLayout, setChatLayout] = useState<'floating' | 'fixed' | 'fullscreen'>('floating');
  const [conciergeOwnerMode, setConciergeOwnerMode] = useState(false);
  const [initialView, setInitialView] = useState<'chat' | 'voice'>('voice');
  // Resolved Business UUID (siteConfigId) for voice sessionContext — from URL or after create
  const [resolvedSiteConfigId, setResolvedSiteConfigId] = useState<string | null>(null);
  const [resolvedSiteSlug, setResolvedSiteSlug] = useState<string | null>(null);

  // Voice configuration - default to Premium (Clear Voice) for demo
  const voiceConfig = VoiceClientFactory.getDefaultConfig('premium');

  // Platform Identity - fallback when no business is selected (digital-only; no Google Place)
  const platformIdentity = {
    placeId: 'platform_landing', // site config id, not a Google Place ID — never sent to Places API
    name: 'Gateway Global AI',
    address: 'AI-Powered Business Platform',
    hours: '24/7 Support Available',
    services: ['AI Concierge', 'Business Automation', 'Voice Agents', 'Website Generation'],
    primaryColor: '#6366f1'
  };

  // Determine which business context to use. Use resolved siteConfigId (Business UUID) when
  // available so voice sessionContext and MCP tools receive the correct site config id.
  const currentBusiness = selectedPlace ? {
    id: resolvedSiteConfigId ?? selectedPlace.place_id ?? 'platform_landing',
    placeId: selectedPlace.place_id || '',
    name: selectedPlace.name,
    address: selectedPlace.formatted_address || '',
    hours: selectedPlace.opening_hours?.weekday_text?.join(', '),
    services: selectedPlace.types,
    primaryColor: '#6366f1'
  } : {
    ...platformIdentity,
    id: resolvedSiteConfigId ?? 'platform_landing'
  };

  // Sync resolvedSiteConfigId from URL so voice gets the Business UUID when present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteConfigId = params.get('siteConfigId');
    if (siteConfigId) setResolvedSiteConfigId(siteConfigId);
  }, []);

  // Desktop-first experience: open AI Biz Bot by default so the interface shell
  // immediately feels alive on larger screens.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024) return;
    if (window.location.pathname === '/' || window.location.pathname === '/business') return;
    setInitialView('chat');
    setChatLayout('floating');
    setIsChatOpen(true);
  }, []);

  // Bypass hook: if URL has ?siteConfigId= and site is provisioned, redirect to agents
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const siteConfigId = params.get('siteConfigId');
    if (!siteConfigId) return;
    fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((config: { workspaceState?: string } | null) => {
        if (config?.workspaceState === 'provisioned') {
          setLocation(`/agents?siteConfigId=${encodeURIComponent(siteConfigId)}`);
        }
      })
      .catch(() => {});
  }, [setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      fetch(`/api/demo/verify/${token}`)
        .then(r => {
          if (!r.ok) {
            if (r.status === 410) {
              setTokenError('This link has expired. Please visit the business page to create a new website.');
            } else {
              setTokenError('This link is no longer valid. Please visit the business page to get started.');
            }
            return null;
          }
          return r.json();
        })
        .then(data => {
          if (!data) return;
          if (data.success && data.lead) {
            setDemoLeadId(data.lead.id);
            if (data.lead.placeData) {
              setSelectedPlace(data.lead.placeData as SelectedPlace);
            } else {
              setSelectedPlace({
                name: data.lead.businessName,
                formatted_address: data.lead.businessAddress || '',
              });
            }
            if (data.lead.name) {
              setOwnerName(data.lead.name);
              setStage('full-access');
            } else if (data.lead.status === 'ready') {
              setStage('full-access');
            } else {
              setStage('training');
              setMagicLinkSent(true);
            }
          }
        })
        .catch(() => {
          setTokenError('Could not verify your link. Please try again.');
        });
    }
  }, []);

  useEffect(() => {
    fetch('/api/config/maps-key')
      .then(r => r.json())
      .then(data => {
        if (data.key) setMapsKey(data.key);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // The EEL is loaded via the npm package (googleMapsLoader utility).
    // No CDN <script> tag needed — custom elements are registered on import.
    if (!mapsKey || !pickerContainerRef.current) return;
    const container = pickerContainerRef.current;

    // Inject the <gmpx-api-loader> singleton (document-level guard in utility).
    ensureApiLoader(mapsKey);

    // Surface API-key auth failures in the component UI.
    (window as any).gm_authFailure = () => {
      setMapsError('Google Maps API not activated. Enable "Maps JavaScript API" and "Places API (New)" in Google Cloud Console.');
    };

    let cancelled = false;

    const setup = async () => {
      const { PlaceAutocompleteElement } = await loadPlacesLibrary();
      if (cancelled) return;

      const autocomplete = new PlaceAutocompleteElement({});
      autocomplete.setAttribute('placeholder', 'What is your business name?');
      autocomplete.setAttribute('data-testid', 'input-place-search');
      autocomplete.style.cssText = 'width:100%;display:block;';

      // Transparent / borderless styling to match the original design
      const applyStyles = () => {
        const shadow = (autocomplete as any).shadowRoot;
        if (shadow) {
          const style = document.createElement('style');
          style.textContent = `
            input { background:transparent!important;color:#e2e8f0!important;font-size:1.1rem!important;
                    font-family:inherit!important;border:none!important;outline:none!important;
                    width:100%!important;padding:4px 0!important; }
            input::placeholder { color:#64748b!important; }
          `;
          shadow.appendChild(style);
        } else {
          requestAnimationFrame(applyStyles);
        }
      };
      requestAnimationFrame(applyStyles);

      // Happy Path: user clicks a dropdown suggestion
      // CRITICAL: No fetchFields — all data fetched securely via server proxy
      autocomplete.addEventListener('gmp-select', async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;

        // Extract place.id directly without client-side API call
        const place = placePrediction.toPlace();
        const placeId: string | undefined = place.id ?? undefined;
        if (!placeId) return;

        setMapsError(null);
        // Show a minimal card immediately so the user isn't waiting in the dark
        setSelectedPlace({
          name: placePrediction.text?.toString() || 'Loading...',
          formatted_address: '',
          place_id: placeId,
          photos: [],
          types: [],
          reviews: [],
        });

        try {
          const detailsRes = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
          if (!detailsRes.ok) throw new Error(`Server returned ${detailsRes.status}`);
          const details = await detailsRes.json();
          setSelectedPlace({
            name: details.name || placePrediction.text?.toString() || '',
            formatted_address: details.formatted_address || '',
            place_id: placeId,
            rating: details.rating || undefined,
            user_ratings_total: details.user_ratings_total || undefined,
            formatted_phone_number: details.formatted_phone_number || undefined,
            international_phone_number: details.international_phone_number || undefined,
            website: details.website || undefined,
            types: details.types || [],
            // Photos: use server photo-proxy URL instead of client-side getURI()
            photos: placeId ? [{ proxyUrl: `/api/places/photo-proxy/${encodeURIComponent(placeId)}?maxWidth=600` }] : [],
            opening_hours: details.opening_hours || undefined,
            reviews: details.reviews || [],
            geometry: details.geometry || undefined,
            price_level: details.price_level,
            business_status: details.business_status,
            url: details.url,
            vicinity: details.vicinity,
            utc_offset: details.utc_offset,
            address_components: details.address_components,
            plus_code: details.plus_code,
            editorial_summary: details.editorial_summary,
            wheelchair_accessible_entrance: details.wheelchair_accessible_entrance,
            delivery: details.delivery,
            dine_in: details.dine_in,
            takeout: details.takeout,
            curbside_pickup: details.curbside_pickup,
            reservable: details.reservable,
            serves_beer: details.serves_beer,
            serves_wine: details.serves_wine,
            serves_breakfast: details.serves_breakfast,
            serves_lunch: details.serves_lunch,
            serves_dinner: details.serves_dinner,
            serves_brunch: details.serves_brunch,
            serves_vegetarian_food: details.serves_vegetarian_food,
          });
        } catch (err) {
          console.error('[Places] Server fetch failed:', err);
          setMapsError('Could not load business details. Please try again.');
          setSelectedPlace(null);
        }
      });

      // Fallback Path: user types and hits Enter without selecting a dropdown item
      const handleFormSubmit = async (e: Event) => {
        e.preventDefault();
        const shadow = (autocomplete as any).shadowRoot;
        const input: HTMLInputElement | null = shadow?.querySelector('input');
        const rawQuery = input?.value?.trim();
        if (!rawQuery) return;

        setMapsError(null);
        setSelectedPlace({
          name: rawQuery,
          formatted_address: 'Searching...',
          place_id: undefined,
          photos: [],
          types: [],
          reviews: [],
        });

        try {
          const locationHint = groundingHintRef.current?.trim();
          const textQuery = locationHint ? `${rawQuery}, ${locationHint}` : rawQuery;
          const searchRes = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: textQuery }),
          });
          if (!searchRes.ok) throw new Error(`Search returned ${searchRes.status}`);
          const searchData = await searchRes.json();
          const first = searchData.results?.[0] || searchData.places?.[0];
          if (!first) {
            setMapsError('No businesses found. Try a different name or location.');
            setSelectedPlace(null);
            return;
          }
          const placeId = first.place_id;
          setSelectedPlace({
            name: first.name || rawQuery,
            formatted_address: first.formatted_address || first.vicinity || '',
            place_id: placeId,
            rating: first.rating || undefined,
            user_ratings_total: first.user_ratings_total || undefined,
            types: first.types || [],
            photos: placeId ? [{ proxyUrl: `/api/places/photo-proxy/${encodeURIComponent(placeId)}?maxWidth=600` }] : [],
            reviews: [],
            geometry: first.geometry || undefined,
          });
        } catch (err) {
          console.error('[Places] Search failed:', err);
          setMapsError('Search failed. Please try again.');
          setSelectedPlace(null);
        }
      };

      // Attach Enter-key submit to the nearest ancestor form (added below)
      const form = container.closest('form');
      if (form) form.addEventListener('submit', handleFormSubmit);

      container.appendChild(autocomplete);
    };

    setup().catch(err => console.error('[BusinessPage] Failed to load Places library:', err));

    return () => { cancelled = true; container.innerHTML = ''; };
  }, [mapsKey]);

  const handleGenerateWebsite = useCallback(() => {
    if (!selectedPlace) return;
    setStage('generating');
    setGeneratingProgress(0);

    const interval = setInterval(() => {
      setGeneratingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStage('preview');
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 200);
  }, [selectedPlace]);

  const handleManualProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) {
      toast({ title: 'Business name required', variant: 'destructive' });
      return;
    }
    setManualSubmitting(true);
    try {
      const createRes = await fetch('/api/site-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          placeData: {
            name,
            formatted_address: manualAddress.trim() || undefined,
            formatted_phone_number: manualPhone.trim() || undefined,
            website: manualWebsite.trim() || undefined,
            types: ['establishment'],
          },
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create profile');
      }
      const siteConfig = await createRes.json();
      toast({ title: 'Profile created', description: 'Your AI team is ready.' });
      setLocation(`/agents?siteConfigId=${encodeURIComponent(siteConfig.id)}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not create profile', variant: 'destructive' });
    } finally {
      setManualSubmitting(false);
    }
  };

  const prevStageRef = useRef<OnboardingStage>(stage);
  useEffect(() => {
    if (prevStageRef.current !== 'phone-gate' && stage === 'phone-gate') {
      setGateStep('phone');
      setPendingLeadId(null);
      setOtpCode('');
      setOtpError('');
    }
    prevStageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (stage !== 'preview') return;
    setPreviewTimer(600); // 10 minutes
    const interval = setInterval(() => {
      setPreviewTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('phone-gate');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'training') return;
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 2 + 0.5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'training') return;
    setDemoCountdown(3600); // 1 hour
    const interval = setInterval(() => {
      setDemoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStage('demo-ready');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // Open the in-page ConciergePanel with a demo business (by slug). Does not navigate away.
  const openDemoInChat = useCallback((slug: string) => {
    fetch(`/api/site-configs/by-slug/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Demo not found');
        return r.json();
      })
      .then((config: { id: string; slug?: string }) => {
        setResolvedSiteConfigId(config.id);
        setResolvedSiteSlug(config.slug ?? slug);
        setInitialView('chat');
        setIsChatOpen(true);
      })
      .catch(() => {
        toast({ title: 'Could not load demo', description: 'Please try again.', variant: 'destructive' });
      });
  }, [toast]);

  const handleSendMagicLink = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter your phone number');
      return;
    }
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    setPhoneError('');
    setSendingCode(true);
    setOtpError('');

    try {
      const res = await fetch('/api/demo/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          businessName: selectedPlace?.name || '',
          businessAddress: selectedPlace?.formatted_address || '',
          placeId: selectedPlace?.place_id || null,
          placeData: selectedPlace || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingLeadId(data.leadId);
        setGateStep('otp');
        toast({ title: 'Code sent', description: `Check your phone for the 6-digit code (***${data.phone || ''}).` });
      } else {
        setPhoneError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setPhoneError('Connection error. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.replace(/\D/g, '');
    if (code.length !== 6 || !pendingLeadId) {
      setOtpError('Please enter the 6-digit code from your phone.');
      return;
    }
    setOtpError('');
    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/demo/verify-and-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: pendingLeadId, phone: phoneNumber, code }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        customerLogin(data.token, data.user);
        setDemoLeadId(pendingLeadId);
        setStage('full-access');
        setPendingLeadId(null);
        setOtpCode('');
        toast({ title: 'Welcome', description: 'Your demo is ready. The AI has been briefed on your business.' });
      } else {
        setOtpError(data.error || 'Invalid or expired code. Please try again or request a new code.');
      }
    } catch {
      setOtpError('Connection error. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDismissTraining = () => {
    setStage('full-access');
  };

  const handleSubmitName = async () => {
    if (!ownerName.trim()) {
      setNameError('Please enter your name to continue');
      return;
    }
    setNameError('');
    if (demoLeadId) {
      try {
        await fetch(`/api/demo/${demoLeadId}/update-name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ownerName }),
        });
      } catch {}
    }
    setStage('full-access');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const showOverlay = stage === 'phone-gate' || stage === 'sending-link' || stage === 'training' || stage === 'demo-ready' || stage === 'name-gate';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
        <img
          src="/powered_by_clear_voice_ai.png"
          alt="Powered by Clear Voice AI"
          className="h-8 w-auto md:h-10 object-contain"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}
        />
      </nav>
      <button
        type="button"
        onClick={() => { setInitialView('voice'); setIsChatOpen(true); }}
        className="fixed bottom-6 right-6 z-50 w-20 h-20 md:w-28 md:h-28 rounded-full shadow-lg shadow-indigo-500/30 bg-transparent hover:bg-indigo-500/10 border border-indigo-400/30 p-1.5 overflow-visible flex-shrink-0"
        data-testid="button-header-chat"
        title="Chat & Voice — AI Biz Bot"
        aria-label="Open chat"
      >
        <img
          src="/gateway-ai-fab.png"
          alt="Gateway Global AI — Chat & Voice"
          className="h-full w-full object-contain"
        />
      </button>
      {stage === 'generating' && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center">
          <div className="max-w-md mx-auto text-center space-y-8 px-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-24 h-24 rounded-full bg-slate-900 border-2 border-blue-500/50 flex items-center justify-center">
                <Wand2 className="w-10 h-10 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-generating-title">
                Building Your Website
              </h2>
              <p className="text-slate-400">
                Creating a custom AI-powered website for <span className="text-white font-medium">{selectedPlace?.name}</span>
              </p>
            </div>
            <div className="w-full">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Generating</span>
                <span>{Math.min(Math.round(generatingProgress), 100)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(generatingProgress, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {['Analyzing business data', 'Designing layout', 'Training AI voice', 'Configuring chat'].map((step, i) => (
                <Badge key={i} variant="secondary" className="bg-slate-800/50 text-slate-400 text-xs">
                  {generatingProgress > (i + 1) * 20 ? (
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                  ) : (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  )}
                  {step}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
      {stage === 'preview' && (
        <div className="fixed top-16 right-4 z-[55] bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-md px-4 py-2 flex items-center gap-3">
          <Eye className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">Preview: <span className="text-white font-mono font-bold">{formatTime(previewTimer)}</span></span>
        </div>
      )}
      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          {/* Same hero background as landing — gradient fallback when images 404 */}
          <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950">
            <img src={HERO_BG_URL} alt="" className="w-full h-full object-cover" aria-hidden onError={(e) => { const el = e.target as HTMLImageElement; if (el.src.endsWith(HERO_BG_URL_FALLBACK)) { el.style.display = 'none'; } else { el.src = HERO_BG_URL_FALLBACK; } }} />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-900/55 to-slate-950/75" aria-hidden />
          </div>
          <div className="relative z-10 max-w-lg w-full">
            {(stage === 'phone-gate' || stage === 'sending-link') && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                  <Phone className="w-10 h-10 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3" data-testid="text-gate-title">
                    Your Website Is Ready
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    {gateStep === 'otp'
                      ? "Enter the 6-digit verification code we sent to your phone."
                      : "Enter your phone number and we'll send you a verification code to access your free website."}
                  </p>
                </div>
                <div className="max-w-sm mx-auto space-y-4">
                  {gateStep === 'phone' ? (
                    <>
                      <div>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                          className="bg-slate-800 border-slate-700 text-center text-lg h-12"
                          data-testid="input-phone-gate"
                          disabled={sendingCode}
                        />
                        {phoneError && (
                          <p className="text-sm text-red-400 mt-2" data-testid="text-phone-error">{phoneError}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleSendMagicLink}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 h-12 text-base"
                        disabled={sendingCode}
                        data-testid="button-send-verification-code"
                      >
                        {sendingCode ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending code...</>
                        ) : (
                          <><Send className="w-5 h-5 mr-2" /> Send verification code</>
                        )}
                      </Button>
                      <p className="text-xs text-slate-600">
                        We'll text you a 6-digit code. No passwords, no apps, no credit card.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={(v) => { setOtpCode(v); setOtpError(''); }}
                          containerClassName="gap-1"
                        >
                          <InputOTPGroup className="bg-slate-800 border border-slate-700 rounded-lg p-2 gap-1">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} className="text-lg text-white border-slate-600" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {otpError && (
                        <p className="text-sm text-red-400" data-testid="text-otp-error">{otpError}</p>
                      )}
                      <Button
                        onClick={handleVerifyOtp}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 h-12 text-base"
                        disabled={verifyingOtp || otpCode.replace(/\D/g, '').length !== 6}
                        data-testid="button-verify-otp"
                      >
                        {verifyingOtp ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                        ) : (
                          <><ShieldCheck className="w-5 h-5 mr-2" /> Verify code</>
                        )}
                      </Button>
                      <p className="text-xs text-slate-600">
                        Code not received? Go back and use "Send verification code" again.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setGateStep('phone'); setOtpCode(''); setOtpError(''); }}
                        className="text-sm text-blue-400 hover:underline"
                      >
                        ← Back to phone number
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {stage === 'training' && (
              <div className="text-center space-y-8">
                <AgentTrainingAnimation />
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3" data-testid="text-training-title">
                    Polishing Up Our Skills
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
                    We're training your team of AI agents to serve you and help you grow your business. 
                    We'll have everything ready for you in seconds.
                  </p>
                </div>
                {magicLinkSent && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verification code sent to your phone</span>
                  </div>
                )}
                <TrainingProgressBar progress={trainingProgress} />
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Full demo ready in {formatTimeHMS(demoCountdown)}</span>
                </div>
                <Button
                  onClick={handleDismissTraining}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 h-12 text-base"
                  data-testid="button-preview-site"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Click To Preview Site
                </Button>
              </div>
            )}

            {(stage === 'demo-ready' || stage === 'name-gate') && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3" data-testid="text-demo-ready-title">
                    Your Demo Is Ready
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Your AI team has been fully trained on <span className="text-white font-medium">{selectedPlace?.name}</span>. 
                    Enter your name to unlock your complete website demo with admin tools.
                  </p>
                </div>
                <div className="max-w-sm mx-auto space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={ownerName}
                      onChange={(e) => { setOwnerName(e.target.value); setNameError(''); }}
                      className="bg-slate-800 border-slate-700 text-center text-lg h-12"
                      data-testid="input-owner-name"
                    />
                    {nameError && (
                      <p className="text-sm text-red-400 mt-2" data-testid="text-name-error">{nameError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmitName}
                    className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 h-12 text-base"
                    data-testid="button-unlock-demo"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    View My Website
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {tokenError && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex items-center justify-center px-6">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-token-error-title">Link Not Valid</h2>
            <p className="text-slate-400">{tokenError}</p>
            <Link href="/business">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="button-go-to-business">
                <ArrowRight className="w-4 h-4 mr-2" />
                Create Your Free Website
              </Button>
            </Link>
          </div>
        </div>
      )}
      <section className="relative min-h-screen overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_BG_URL}
            alt=""
            className="h-full w-full object-cover"
            aria-hidden
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              if (el.src.endsWith(HERO_BG_URL_FALLBACK)) {
                el.style.display = 'none';
              } else {
                el.src = HERO_BG_URL_FALLBACK;
              }
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.28)_0%,rgba(15,23,42,0.52)_38%,rgba(15,23,42,0.74)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_42%)]" />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-20 pt-28">
          <div className="w-full max-w-4xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.42em] text-emerald-300/90">
              Join The Clear Voice Network
            </p>
            <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)] md:text-6xl lg:text-[5rem]">
              AI Maps For Business
            </h1>
            <p className="mt-3 text-lg font-bold uppercase tracking-[0.14em] text-white/95 md:text-2xl">
              Claim Your Free Profile
            </p>

            <div className="mx-auto mt-8 max-w-2xl">
              <form
                className="rounded-[20px] border border-indigo-300/70 bg-white/94 p-2 shadow-[0_0_0_4px_rgba(129,140,248,0.18),0_24px_70px_rgba(15,23,42,0.45)]"
                onSubmit={(e) => e.preventDefault()}
                aria-label="Search for your business"
              >
                <div className="flex min-h-[60px] items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4">
                  <Search className="h-5 w-5 flex-shrink-0 text-slate-400" />
                  <div ref={pickerContainerRef} className="min-h-[2.25rem] min-w-0 flex-1 text-left" />
                  {!mapsKey && (
                    <div className="flex-shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    </div>
                  )}
                </div>
              </form>
              <p className="mt-3 text-[11px] font-medium text-white/70">
                Powered by Google Places
              </p>
              {mapsError && (
                <p className="mt-3 flex items-center justify-center gap-1 text-xs text-amber-300" data-testid="text-maps-error">
                  <ShieldCheck className="h-3 w-3 flex-shrink-0" />
                  {mapsError}
                </p>
              )}
              {showManualForm ? (
                <div className="mt-4 rounded-sui border border-white/10 bg-slate-950/75 p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
                    Create profile without Google listing
                  </p>
                  <form onSubmit={handleManualProfileSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-300">Business name *</label>
                      <Input
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="e.g. Gateway Global AI"
                        className="border-slate-600 bg-slate-900/60 text-white placeholder:text-slate-500 rounded-sui"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">Phone</label>
                        <Input
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          placeholder="+1 234 567 8900"
                          className="border-slate-600 bg-slate-900/60 text-white placeholder:text-slate-500 rounded-sui"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-300">Website</label>
                        <Input
                          value={manualWebsite}
                          onChange={(e) => setManualWebsite(e.target.value)}
                          placeholder="https://..."
                          type="url"
                          className="border-slate-600 bg-slate-900/60 text-white placeholder:text-slate-500 rounded-sui"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={manualSubmitting || !manualName.trim()}
                        className="rounded-sui bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
                        data-testid="button-create-manual-profile"
                      >
                        {manualSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Create my profile
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-sui border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={() => setShowManualForm(false)}
                        disabled={manualSubmitting}
                      >
                        Back to search
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="mt-4 text-xs font-medium text-white/75 underline-offset-4 transition hover:text-white hover:underline"
                >
                  No Google listing? Create your profile manually.
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setInitialView('voice');
                  setIsChatOpen(true);
                }}
                className="group min-w-[150px] rounded-full border border-white/15 bg-slate-950/85 px-5 py-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur-xl transition hover:border-emerald-400/40 hover:bg-slate-900/95"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  <Mic className="h-3.5 w-3.5 text-emerald-300" />
                  Manifesto
                </div>
                <div className="mt-1 pl-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  Voice
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInitialView('chat');
                  setIsChatOpen(true);
                }}
                className="group min-w-[150px] rounded-full border border-white/15 bg-slate-950/85 px-5 py-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.45)] backdrop-blur-xl transition hover:border-indigo-400/50 hover:bg-slate-900/95"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  <Bot className="h-3.5 w-3.5 text-indigo-300" />
                  AI Biz Bot
                </div>
                <div className="mt-1 pl-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  Voice
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-400">
              Communication Stack
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              QR code, router, and AI voice chat in one customer-entry system.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              Every scan can route into the same Clear Voice AI experience. The QR code becomes the
              entry point, the router sends the visitor to the right business context, and voice or
              chat picks up without making the customer download an app or dial a phone tree.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'QR Entry',
                description: 'Put the business on a window, table, flyer, or packaging and launch the same AI experience from a camera scan.',
                icon: QrCode,
              },
              {
                title: 'Router Layer',
                description: 'Resolve the correct business, route, and prompt context before the conversation starts.',
                icon: Server,
              },
              {
                title: 'Voice + Chat',
                description: 'Use Clear Voice AI for push-to-talk voice and AI Biz Bot for chat on the same public surface.',
                icon: Headphones,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-sui border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sui border border-indigo-500/20 bg-indigo-500/10">
                  <Icon className="h-5 w-5 text-indigo-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F172A] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400">
              AI OS
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              The operator layer behind Clear Voice.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              Clear Voice is the public interface. AI OS is the internal operating layer for policy,
              agents, routing, telemetry, and business control. The homepage sells the outcome; the OS
              stays in Mission Control.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Governed Runtime',
                description: 'Route, view, and action boundaries keep the operator system separate from the public marketing surface.',
                icon: Cpu,
              },
              {
                title: 'Agent Control',
                description: 'Voice, chat, and business workflows stay tied to the right business and the right policy context.',
                icon: Bot,
              },
              {
                title: 'Secure Operations',
                description: 'Prompt assembly, runtime controls, and safety policies remain in the governed OS core.',
                icon: ShieldCheck,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-sui border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sui border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-emerald-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-400">
                Franchise Rollout
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                One operating model across many locations.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Franchise groups can standardize QR entry, voice routing, and agent behavior while still
                preserving local business context by location.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                'Launch location pages and QR codes by site without rebuilding the whole stack.',
                'Keep brand, policies, and core routing standardized across the network.',
                'Let each storefront keep its own data, hours, offers, and local voice context.',
              ].map((item) => (
                <div key={item} className="rounded-sui border border-white/10 bg-slate-900/40 p-5 text-sm leading-relaxed text-slate-300 backdrop-blur-xl">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0F172A] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Industry Packs
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Launch pre-shaped AI business flows by vertical.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-400">
              Industry packs bundle the prompts, routing assumptions, launch assets, and objection-handling
              patterns for a specific kind of business so deployment is faster and more repeatable.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Retail', icon: ShoppingCart },
              { title: 'Services', icon: Briefcase },
              { title: 'Appointments', icon: Calendar },
              { title: 'Voice-First Ops', icon: PhoneCall },
            ].map(({ title, icon: Icon }) => (
              <div key={title} className="rounded-sui border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
                <Icon className="h-5 w-5 text-emerald-300" />
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Reusable deployment patterns for routing, knowledge activation, and customer interaction design.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Preview Overlay — sovereign glass: dark header + glass content, rounded-sui */}
      {selectedPlace && stage === 'landing' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="max-w-lg w-full rounded-sui overflow-hidden border border-indigo-500/20 shadow-2xl bg-slate-900/40 backdrop-blur-xl">
              {/* Dark header (matches chat header) */}
              <div className="bg-[#0F172A] px-5 py-3 border-b border-slate-700/80">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Confirm your business</p>
                <h3 className="text-lg font-bold text-white truncate" data-testid="text-place-name">{selectedPlace.name}</h3>
              </div>
              {/* Glass content area — sovereign palette */}
              <div className="p-5 flex flex-col gap-4">
                {selectedPlace.photos && selectedPlace.photos.length > 0 && (selectedPlace.photos[0] as any)?.proxyUrl ? (
                  <div className="w-full h-36 rounded-sui overflow-hidden bg-slate-800/60 border border-indigo-500/20">
                    <img
                      src={(selectedPlace.photos[0] as any).proxyUrl}
                      alt={selectedPlace.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-sui bg-slate-800/60 border border-indigo-500/20 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{selectedPlace.formatted_address}</span>
                  </p>
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-white">{selectedPlace.rating}</span>
                      {selectedPlace.user_ratings_total && (
                        <span className="text-slate-400 text-sm">({selectedPlace.user_ratings_total.toLocaleString()})</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPlace.formatted_phone_number && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-slate-300 text-xs font-medium">
                        <Phone className="w-3 h-3" /> {selectedPlace.formatted_phone_number}
                      </span>
                    )}
                    {selectedPlace.types?.slice(0, 3).map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-indigo-500/20 text-slate-400 text-xs capitalize">
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-700">
                  <Button
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-sui font-semibold"
                    data-testid="button-generate-site"
                    onClick={handleGenerateWebsite}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Yes, This Is My Business
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-indigo-500/40 text-slate-300 hover:text-white hover:bg-indigo-500/20 rounded-sui"
                    onClick={() => setSelectedPlace(null)}
                    data-testid="button-clear-selection"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Website Preview — renders the full website-builder template */}
      {(stage === 'preview' || stage === 'full-access') && selectedPlace && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50">
          <WebsitePreview
            place={selectedPlace}
            onBack={() => { setStage('landing'); setSelectedPlace(null); }}
            siteConfigId={resolvedSiteConfigId ?? undefined}
            heroImageUrl={selectedPlace.place_id ? `/api/places/photo-proxy/${selectedPlace.place_id}?maxWidth=1200` : undefined}
            placeId={selectedPlace.place_id}
            publicSlug={resolvedSiteSlug ?? undefined}
          />
        </div>
      )}

      {/* Target demo: Voice Concierge, Target — gradient fallback when image 404 */}
      <section id="case-studies" className="relative min-h-[380px] flex flex-col items-center justify-center py-16 px-6 overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950">
          <img src="/hero-qr-demo.png" alt="" className="w-full h-full object-cover" aria-hidden onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-slate-950/75" aria-hidden />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white text-center mb-1">Voice Concierge, Target</h2>
          <p className="text-slate-300 text-center max-w-2xl mx-auto mb-6">
            Store-level voice and chat agent trained on Target hours, policies, and help topics. This demo shows how QR codes at a location open the same AI in the visitor&apos;s browser — no app, no phone number. Limitations: demo data only; not connected to live Target systems.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            <DemoLaunchCard slug="voice-ai-assistant" companyName="Target" agentLabel="AI Biz Bot" description="Chat: hours, help, policies. Explains QR benefits and how it works." onOpenInChat={openDemoInChat} variant="target" />
            <DemoLaunchCard slug="voice-ai-assistant" companyName="Target" agentLabel="Voice Concierge" description="Same knowledge over voice. Try push-to-talk in the chat panel." onOpenInChat={openDemoInChat} variant="target" />
          </div>
        </div>
      </section>

      {/* The Joint Chiropractic demo — same hero as pitch deck; gradient fallback when image 404 */}
      <section className="relative min-h-[380px] flex flex-col items-center justify-center py-16 px-6 overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-950">
          <img src="/pitch-decks/the-joint/hero.png" alt="" className="w-full h-full object-cover" aria-hidden onError={(e) => { const el = e.target as HTMLImageElement; if (el.dataset.fallback) { el.style.display = 'none'; } else { el.dataset.fallback = '1'; el.src = '/hero-joint-demo.png'; } }} />
          <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white text-center mb-1">The Joint Chiropractic</h2>
          <p className="text-slate-300 text-center max-w-2xl mx-auto mb-6">
            Demo as the chiropractor: one business, two ways to engage. AI Biz Bot for scheduling, membership, walk-ins; Voice Concierge with the same knowledge. Open in the chat on this page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            <DemoLaunchCard slug="the-joint-chiropractic" companyName="The Joint Chiropractic" agentLabel="AI Biz Bot" description="Chat — scheduling, membership, walk-ins." onOpenInChat={openDemoInChat} />
            <DemoLaunchCard slug="the-joint-chiropractic" companyName="The Joint Chiropractic" agentLabel="Voice Concierge" description="Same knowledge over voice. Push-to-talk in the panel." onOpenInChat={openDemoInChat} />
          </div>
        </div>
      </section>
      {/* Features - commented out for now
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: PhoneCall, title: "Voice AI", desc: "Natural conversations with real-time speech synthesis" },
              { icon: MessageSquare, title: "SMS & MMS", desc: "Automated text messaging with media support" },
              { icon: TrendingUp, title: "Call Analytics", desc: "DISC profiling on every call for security monitoring" },
              { icon: ShieldCheck, title: "Fraud Detection", desc: "Real-time sentiment analysis catches rogue behavior" },
              { icon: Globe, title: "Multi-Language", desc: "Support customers in 50+ languages" },
              { icon: Zap, title: "Instant Setup", desc: "Get a phone number in under 60 seconds" }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-white mb-1">{item.title}</div>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Reseller & Affiliate Program — bottom of page: register + $99 Stripe checkout */}
      <AffiliateResellerSection />

      <section className="border-t border-white/5 bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-sui border border-indigo-500/20 bg-slate-900/40 p-8 text-center backdrop-blur-xl md:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-400">
            Request Info
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            Want a guided walkthrough of the Clear Voice platform?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            Search for your business above to start the live onboarding flow, or contact the team if you
            want a guided demo for a location, franchise network, reseller program, or industry-pack rollout.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact">
              <Button className="rounded-sui bg-indigo-600 px-6 text-white hover:bg-indigo-500">
                Request Information
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setInitialView('voice');
                setIsChatOpen(true);
              }}
              className="rounded-sui border-slate-600 bg-transparent px-6 text-slate-200 hover:bg-slate-800"
            >
              Open Voice Concierge
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center text-sm border-t border-slate-900 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Link href="/sdk">
            <Button variant="ghost" size="sm" className="text-slate-500 text-xs" data-testid="button-developer-section">
              <Code2 className="w-3 h-3 mr-1" />
              Developers
            </Button>
          </Link>
          <Link href="/sdk/google-places">
            <Button variant="ghost" size="sm" className="text-slate-500 text-xs" data-testid="button-google-places-sdk">
              <Globe className="w-3 h-3 mr-1" />
              Google Places SDK
            </Button>
          </Link>
        </div>
        <p className="text-slate-600">&copy; 2025 Gateway Global AI. Enterprise Division.</p>
        {isAuthenticated && (
          <Button variant="ghost" size="sm" className="text-slate-600 text-xs" onClick={() => authLogout()} data-testid="button-logout">
            <LogOut className="w-3 h-3 mr-1" />
            Logout
          </Button>
        )}
      </footer>
      <OtpLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(data) => {
          authLogin(data.token, data.user);
          setShowLoginModal(false);
          toast({ title: 'Welcome!', description: `Logged in as ${data.user.name || 'Admin'}` });
          window.location.href = "/dashboard";
        }}
        sendOtpEndpoint="/api/auth/send-otp"
        verifyOtpEndpoint="/api/auth/verify-otp"
        icon={ShieldCheck}
        title="Admin Login"
        accentColor="blue"
        testIdPrefix="admin"
      />
      <OtpLoginModal
        open={showCustomerLoginModal}
        onClose={() => setShowCustomerLoginModal(false)}
        onSuccess={(data) => {
          customerLogin(data.token, data.user);
          setShowCustomerLoginModal(false);
          toast({ title: 'Welcome!', description: `Signed in as ${data.user.name || 'Business Owner'}` });
        }}
        sendOtpEndpoint="/api/customer/send-otp"
        verifyOtpEndpoint="/api/customer/verify-otp"
        icon={KeyRound}
        title="Sign In"
        phonePrompt="Enter your phone number to sign in or create an account"
        subtitle="No account? One will be created automatically."
        accentColor="purple"
        testIdPrefix="customer"
      />

      {/* PTT ConciergePanel: voice, chat, Command Center (Profile, Governance, Bill, Businesses, Reseller, Configure AI), expand layout */}
      <ConciergePanel
        business={currentBusiness}
        agent={{
          role: selectedPlace ? 'Business Concierge' : 'Platform Sales Agent',
          personality: 'Helpful, professional, and enthusiastic',
          objectives: selectedPlace ? [
            `Represent ${selectedPlace.name} and assist customers`,
            'Answer questions about services, hours, and location',
            'Help customers book appointments or place orders'
          ] : [
            'Help business owners understand our AI-powered website platform',
            'Answer questions about features, pricing, and setup',
            'Guide users through the onboarding process',
            'Demo the Clear Voice technology'
          ],
          constraints: [
            'Be polite and professional',
            'Keep responses concise and actionable',
            selectedPlace ? 'Stay on topic about the business' : 'Focus on the value of AI-powered websites'
          ]
        }}
        voiceConfig={voiceConfig}
        agentName={selectedPlace ? 'Ava' : 'Gateway AI Assistant'}
        isOpen={isChatOpen}
        onClose={() => { setIsChatOpen(false); setConciergeOwnerMode(false); }}
        initialView={initialView}
        layoutMode={chatLayout}
        onCycleLayout={() => {
          const modes: Array<'floating' | 'fixed' | 'fullscreen'> = ['floating', 'fixed', 'fullscreen'];
          const currentIndex = modes.indexOf(chatLayout);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setChatLayout(nextMode);
        }}
        showOwnerControls={false}
        onOpenAdmin={(tab) => {
          const path = tab ? `/app/aibizbot?tab=${tab}${resolvedSiteConfigId ? `&site=${resolvedSiteConfigId}` : ''}` : '/app/aibizbot';
          const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${path}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
        onOpenBizBotChat={() => setConciergeOwnerMode(true)}
        ownerMode={conciergeOwnerMode}
        onExitOwnerMode={() => setConciergeOwnerMode(false)}
        embedViewsInPanel={true}
        onNavigate={(path) => setLocation(path.startsWith('/app') ? path : `/app${path}`)}
        onShareClick={() => {
          const url = typeof window !== 'undefined'
            ? (resolvedSiteSlug ? `${window.location.origin}/biz/${resolvedSiteSlug}` : `${window.location.origin}/business`)
            : '';
          if (url && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(url).then(() => toast({ title: 'Link copied to clipboard' })).catch(() => toast({ title: 'Could not copy link', variant: 'destructive' }));
          } else {
            toast({ title: 'Share', description: url || 'Copy this link to share', variant: 'default' });
          }
        }}
        isAuthenticated={isAuthenticated || isCustomerAuth}
        onHistoryClick={() => setLocation('/app/compliance-gateway')}
        onSmsConsentClick={() => setLocation('/login')}
        publicSlug={resolvedSiteSlug ?? undefined}
        transferUrl={typeof window !== 'undefined' ? `${window.location.origin}/demo` : '/demo'}
        transferTitle={selectedPlace ? 'Open Demo On Phone' : 'Gateway Global AI Demo'}
        transferDescription={selectedPlace
          ? 'Scan to continue this demo flow on your phone.'
          : 'Scan to open the business lookup and chat demo on your phone.'}
        variant="sovereign"
        zIndex={60}
      />
    </div>
  );
}
