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
  ArrowLeft, CheckCircle2, MessageSquare, 
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight,
  Headphones, Calendar, TrendingUp, Store, ShoppingCart, Server,
  Search, MapPin, Star, ExternalLink, Loader2, ArrowRight, Sparkles,
  Clock, Bot, Wand2, X, Eye, Send, User, LogIn, LogOut, KeyRound
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
import { Code2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { ensureApiLoader, loadPlacesLibrary } from '@/utils/googleMapsLoader';

import headerLogo from "@assets/clear_voice_ai_dark_sm.png";
import heroBgGateway from "@assets/hero_bg_gateway2.png";
import howItWorksQr from "@assets/how-it-works-qr.png";
import howItWorksWebsite from "@assets/how-it-works-website.png";
import howItWorksVoice from "@assets/how-it-works-voice.png";
import clearVoiceQrReceptionist from "@assets/clear-voice-qr-receptionist.png";
import affiliateStickerHero from "@assets/affiliate-sticker-hero.png";

type VoiceState = 'idle' | 'loading' | 'greeting' | 'greeting_paused' | 'conversation' | 'processing' | 'responding' | 'error';

type Sentiment = 'calm' | 'engaged' | 'helpful';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: "LET'S TALK" },
  engaged: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'LISTENING' },
  helpful: { primary: 'rgba(139, 92, 246, 0.8)', glow: 'rgba(139, 92, 246, 0.4)', label: 'SPEAKING' },
};

// Simplified VoiceVisualizer - now just a visual element (click handler moved to parent div)
const VoiceVisualizer = () => {
  const [sentiment, setSentiment] = useState<Sentiment>('calm');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const sentimentInterval = setInterval(() => {
      const sentiments: Sentiment[] = ['calm', 'engaged', 'helpful'];
      setSentiment(sentiments[Math.floor(Math.random() * sentiments.length)]);
    }, 2500);
    
    const pulseInterval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100);
    }, 50);
    
    return () => {
      clearInterval(sentimentInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  const sentimentConfig = SENTIMENT_COLORS[sentiment];
  const waveIntensity = Math.sin(pulse / 10) * 0.3 + 0.7;
  
  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ marginTop: '-100px' }}>
      
      <div 
        className="relative w-32 h-32 flex items-center justify-center"
        data-testid="button-voice-visualizer"
      >
        <div 
          className="absolute inset-0 border border-dashed rounded-full animate-spin"
          style={{ 
            borderColor: 'rgba(59, 130, 246, 0.3)', 
            animationDuration: '20s'
          }}
        />
        <div 
          className="absolute inset-2 border border-dotted rounded-full animate-spin"
          style={{ 
            borderColor: 'rgba(99, 102, 241, 0.25)', 
            animationDirection: 'reverse',
            animationDuration: '15s'
          }}
        />
        
        <div 
          className="absolute rounded-full blur-3xl transition-all duration-500 animate-pulse"
          style={{ 
            width: `${120 + waveIntensity * 40}%`,
            height: `${120 + waveIntensity * 40}%`,
            background: `radial-gradient(circle, ${sentimentConfig.primary} 0%, ${sentimentConfig.glow} 30%, transparent 70%)`,
            opacity: 0.5
          }}
        />
        
        <div 
          className="absolute w-16 h-16 rounded-sui flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
          style={{
            borderColor: sentimentConfig.primary,
            boxShadow: `0 0 25px ${sentimentConfig.glow}, 0 0 12px ${sentimentConfig.glow}`,
            transform: `scale(${0.95 + waveIntensity * 0.1})`
          }}
        >
          <div className="relative z-20 flex flex-col items-center">
            <Phone className="w-8 h-8 text-slate-200" />
            <div className="flex gap-0.5 mt-1">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        </div>

        <div className="absolute -bottom-1 left-0 right-0 flex justify-center">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" 
            style={{ color: sentimentConfig.primary, backgroundColor: `${sentimentConfig.glow}` }}>
            {sentimentConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
};

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
          Reseller & Affiliate Program
        </h2>
        <p className="text-slate-400 text-center mb-8 text-base md:text-lg">
          Join the network that places Clear Voice AI in local businesses.
        </p>

        <p className="text-slate-300 text-center max-w-2xl mx-auto mb-6 leading-relaxed text-base md:text-lg">
          We are looking for small business owners and entrepreneurs to join our network of affiliates.
          We are placing 32 million stickers on the windows of small business owners and we need your help.
        </p>

        <ol className="list-decimal list-inside text-slate-300 space-y-2 max-w-xl mx-auto mb-6 text-base md:text-lg">
          <li>Visit local small businesses and meet the business owners and employees.</li>
          <li>Get permission to place the sticker on their window or store front.</li>
          <li>Enter their business name into our QR code generator.</li>
          <li>Enter the customer cell phone number. We can take care of the rest.</li>
        </ol>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { tier: 'Bronze (0–10 businesses)', rate: '8%', note: '$49/mo platform + $50/mo AI Voice' },
            { tier: 'Silver (11–50)', rate: '10%', note: 'On all sales' },
            { tier: 'Gold (51–100)', rate: '12%', note: 'On all sales' },
            { tier: 'Platinum (101–500)', rate: '14%', note: 'On all sales' },
            { tier: 'Diamond (501+)', rate: '16%', note: 'On all sales' },
          ].map(({ tier, rate, note }) => (
            <div key={tier} className="rounded-sui bg-slate-900/50 border border-indigo-500/15 p-4">
              <p className="text-white font-medium text-sm md:text-base">{tier}</p>
              <p className="text-indigo-400 font-bold text-base md:text-lg">{rate}</p>
              <p className="text-slate-500 text-xs md:text-sm">{note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-sui bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl p-6 md:p-8 max-w-md mx-auto">
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
  const [showCreateTeamConfirm, setShowCreateTeamConfirm] = useState(false);
  const [provisioningTeam, setProvisioningTeam] = useState(false);

  const { user, isAuthenticated, login: authLogin, logout: authLogout } = useAuth();
  const { user: customerUser, isAuthenticated: isCustomerAuth, login: customerLogin, logout: customerLogout } = useCustomerAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCustomerLoginModal, setShowCustomerLoginModal] = useState(false);

  // --- NEW: ConciergePanel State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLayout, setChatLayout] = useState<'floating' | 'fixed' | 'fullscreen'>('floating');
  const [initialView, setInitialView] = useState<'chat' | 'voice'>('voice');
  // Resolved Business UUID (siteConfigId) for voice sessionContext — from URL or after create
  const [resolvedSiteConfigId, setResolvedSiteConfigId] = useState<string | null>(null);
  const [resolvedSiteSlug, setResolvedSiteSlug] = useState<string | null>(null);

  // Voice configuration - default to Premium (Clear Voice) for demo
  const voiceConfig = VoiceClientFactory.getDefaultConfig('premium');

  // Platform Identity - fallback context when no business is selected
  const platformIdentity = {
    placeId: 'platform_landing',
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

      const autocomplete = new PlaceAutocompleteElement();
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
          const searchRes = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: rawQuery }),
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

  const handleCreateAiTeamConfirm = async () => {
    if (!selectedPlace || provisioningTeam) return;
    const placeId = selectedPlace.place_id || (selectedPlace as any).placeId;
    const businessName = selectedPlace.name;
    const placeTypes = Array.isArray(selectedPlace.types) ? selectedPlace.types : [];
    if (!businessName) {
      toast({ title: 'Missing business name', variant: 'destructive' });
      return;
    }
    setProvisioningTeam(true);
    try {
      let resolvedPlaceTypes = placeTypes;
      if (placeId) {
        try {
          const resolveRes = await fetch('/api/intelligence/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId }),
          });
          if (resolveRes.ok) {
            const resolveData = await resolveRes.json();
            if (Array.isArray(resolveData.placeTypes) && resolveData.placeTypes.length) {
              resolvedPlaceTypes = resolveData.placeTypes;
            }
          }
        } catch {
          // best-effort only: never block provisioning
        }
      }
      const createRes = await fetch('/api/site-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          placeId: placeId || undefined,
          placeData: selectedPlace,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create site');
      }
      const siteConfig = await createRes.json();
      const siteConfigId = siteConfig.id;
      setResolvedSiteConfigId(siteConfigId);
      if (siteConfig.slug) setResolvedSiteSlug(siteConfig.slug);
      const provisionRes = await fetch('/api/intelligence/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteConfigId,
          placeTypes: resolvedPlaceTypes.length ? resolvedPlaceTypes : ['establishment'],
          businessName,
        }),
      });
      if (!provisionRes.ok) {
        const err = await provisionRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to provision agents');
      }
      setShowCreateTeamConfirm(false);
      toast({ title: 'AI team created', description: 'Your 6 agents are ready.' });
      setLocation(`/agents?siteConfigId=${encodeURIComponent(siteConfigId)}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not create AI team', variant: 'destructive' });
    } finally {
      setProvisioningTeam(false);
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

  // Only show the platform SDK chat widget on landing. When user is in preview/full-access
  // they get a single chat inside WebsitePreview; avoid two chat UIs.
  // REMOVED: Legacy GatewayChat embed script
  // Now using unified ConciergePanel component instead

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
      <nav className="sticky top-0 z-50 bg-transparent border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 overflow-visible">
        <img src={headerLogo} alt="Clear Voice AI" className="h-9 w-auto md:h-14 relative z-10 object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }} />
        <div className="flex items-center gap-2 justify-end">
          <ShareButton
            shareTitle="Gateway Global AI - AI Business Router"
            shareText="AI-powered business websites with voice concierge and chat. Fully developed in about an hour. No credit card required."
            variant="dark"
            testIdPrefix="main-share"
          />
          {isCustomerAuth ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-slate-50/10 text-xs"
              onClick={() => setLocation('/my-account')}
              data-testid="button-my-account"
            >
              <User className="w-4 h-4 mr-1" />
              My Account
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-slate-50/10 text-xs"
              onClick={() => setShowCustomerLoginModal(true)}
              data-testid="button-customer-login"
            >
              <LogIn className="w-4 h-4 mr-1" />
              Sign In
            </Button>
          )}
        </div>
      </nav>
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
          {/* Same hero background as landing — feels like same page, next step */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img src={heroBgGateway} alt="" className="w-full h-full object-cover" aria-hidden />
            <div className="absolute inset-0 bg-slate-950/60" aria-hidden />
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
      {/* Hero Section — exactly one viewport tall so Enterprise starts below the fold */}
      <section className="relative min-h-[100vh] min-h-[100svh] flex flex-col px-6 overflow-hidden bg-slate-900">
        {/* Hero background: gateway building facade (G AI logo, Boardwalk Suites QR) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={heroBgGateway}
            alt=""
            className="w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-slate-950/50" aria-hidden />
        </div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-[1]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none z-[1]" />
        <div className="flex-1 flex items-center relative z-10">
          <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 md:gap-8">
            <div 
              style={{ marginBottom: '10px', cursor: 'pointer' }}
              onClick={() => {
                setInitialView('voice');
                setIsChatOpen(true);
              }}
              title="Click to start voice conversation"
            >
              <VoiceVisualizer />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white text-center" data-testid="text-hero-heading">
              Join The Clear Voice AI Network<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 text-3xl md:text-[48px]">
                Request Your QR Code
              </span>
            </h1>
            <div className="max-w-2xl w-full" data-testid="container-place-search">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <form className="relative bg-slate-50/5 backdrop-blur-xl rounded-2xl border border-white/10 p-2 flex items-center gap-2 shadow-2xl">
                  <div ref={pickerContainerRef} className="flex-1 min-w-0" />
                  {!mapsKey && (
                    <div className="pr-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  )}
                </form>
              </div>
              {mapsError && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-1" data-testid="text-maps-error">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  {mapsError}
                </p>
              )}
              {!mapsError && <p className="text-xs text-slate-400 mt-3 text-center">Powered by Google Places</p>}
            </div>
            <p className="text-lg text-slate-400 max-w-2xl text-center leading-relaxed">
              Gateway Global currently offers AI voice for businesses in the Google Places and Google Maps. We build you a web site, create a receptionist for your business, and you get to experience Clear Voice AI, the industry&apos;s highest quality and lowest cost AI voice streaming solution.
            </p>
          </div>
        </div>
        <div className="pb-8 md:pb-12" />

        {/* Business Preview Overlay — sovereign/chat style: dark header, white content, rounded-sui */}
        {selectedPlace && stage === 'landing' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="max-w-lg w-full rounded-sui overflow-hidden border border-indigo-500/20 shadow-2xl bg-white">
              {/* Dark header (matches chat header) */}
              <div className="bg-[#0F172A] px-5 py-3 border-b border-slate-700/80">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Confirm your business</p>
                <h3 className="text-lg font-bold text-white truncate" data-testid="text-place-name">{selectedPlace.name}</h3>
              </div>
              {/* White content area (matches chat content) */}
              <div className="p-5 flex flex-col gap-4">
                {selectedPlace.photos && selectedPlace.photos.length > 0 && (selectedPlace.photos[0] as any)?.proxyUrl ? (
                  <div className="w-full h-36 rounded-sui overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={(selectedPlace.photos[0] as any).proxyUrl}
                      alt={selectedPlace.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-sui bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                    <span className="truncate">{selectedPlace.formatted_address}</span>
                  </p>
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-slate-900">{selectedPlace.rating}</span>
                      {selectedPlace.user_ratings_total && (
                        <span className="text-slate-500 text-sm">({selectedPlace.user_ratings_total.toLocaleString()})</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPlace.formatted_phone_number && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                        <Phone className="w-3 h-3" /> {selectedPlace.formatted_phone_number}
                      </span>
                    )}
                    {selectedPlace.types?.slice(0, 3).map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs capitalize">
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
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
                    className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-sui"
                    onClick={() => setShowCreateTeamConfirm(true)}
                    data-testid="button-create-ai-team"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    Create my AI team (6 agents)
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-sui"
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

        {/* Confirmation: Create AI team for this business */}
        <Dialog open={showCreateTeamConfirm} onOpenChange={setShowCreateTeamConfirm}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create your AI team</DialogTitle>
            </DialogHeader>
            <p className="text-slate-300">
              Create your AI team for <span className="font-semibold text-white">{selectedPlace?.name}</span>? We&apos;ll set up 6 agents: Concierge, Booking, Lead Qualifier, Retention, Billing, and Gatekeeper.
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setShowCreateTeamConfirm(false)} disabled={provisioningTeam}>
                No
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={handleCreateAiTeamConfirm} disabled={provisioningTeam} data-testid="button-confirm-create-team">
                {provisioningTeam ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Yes'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
      {/* How It Works — QR code → Website flow only */}
      <section className="py-16 px-6 bg-slate-900/20 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-12">
            Businesses display a Clear Voice AI QR code at their location. Customers scan it and land on the business website — then start a voice or chat conversation instantly.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
            <div className="flex flex-col items-center text-center w-full md:max-w-[280px]">
              <div className="w-full rounded-sui overflow-hidden border border-indigo-500/20 bg-slate-900/40 shadow-xl mb-4">
                <img src={howItWorksQr} alt="QR code sign — Boardwalk Suites Lafayette, Receptionist, powered by Clear Voice AI" className="w-full h-auto object-cover" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">1. Scan the QR code</h3>
              <p className="text-slate-400 text-sm">
                At the door, front desk, or table — each location has a QR sign (e.g. &quot;Receptionist&quot; or &quot;Concierge&quot;) powered by Clear Voice AI.
              </p>
            </div>
            <div className="flex-shrink-0 text-indigo-400" aria-hidden>
              <ArrowRight className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <div className="flex flex-col items-center text-center w-full md:max-w-[280px]">
              <div className="w-full rounded-sui overflow-hidden border border-indigo-500/20 bg-slate-900/40 shadow-xl mb-4">
                <img src={howItWorksWebsite} alt="Business website on phone — Voice Concierge and Chat" className="w-full h-auto object-cover" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2. Open the business website</h3>
              <p className="text-slate-400 text-sm">
                Your phone opens the business’s page — hours, location, and a clear way to reach the AI assistant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clear Voice AI — title full width, paragraph full width, then 50/50 split: image | bullets */}
      <section className="py-16 px-6 bg-slate-900/40 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-sui bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl overflow-hidden shadow-2xl p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 uppercase tracking-tight w-full">
              Clear Voice AI will replace telephony for business by 2030
            </h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8 w-full">
              A quiet revolution is forming and it’s happening right in front of you — and you probably didn’t see it yet. Gateway Global AI made a bold promise to the world that its Clear Voice AI technology would replace telephony for business by 2030, and they appear to have good reason to believe that. The Clear Voice PTT interface outperforms and out-engineers traditional phone and the leading models and providers like Eleven Labs, Vapi, ChatGPT, and Gemini Live.
            </p>
            <div className="grid md:grid-cols-2 gap-8 md:gap-10 w-full">
              <div className="rounded-sui overflow-hidden border border-indigo-500/20 w-full">
                <img src={howItWorksVoice} alt="Clear Voice AI interface — Hold to Speak, Voice Concierge" className="w-full h-auto object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="rounded-sui overflow-hidden border border-indigo-500/20 max-w-[280px] mb-4">
                  <img src={clearVoiceQrReceptionist} alt="Scan for Receptionist — Powered by Clear Voice AI" className="w-full h-auto object-cover" />
                </div>
                <h3 className="text-lg font-bold text-white mb-4">Why Clear Voice AI Works</h3>
                <ul className="space-y-3 text-slate-300 text-sm md:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Users scan the QR code and the Clear Voice PTT interface loads instantly — avoiding dial tones, phone trees, and voicemail.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Phones equipped to scan QR codes so they do not need phone numbers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>The Clear Voice interface is connected to Google Places and is an expert trained on the business and the customer’s needs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Clear Voice AI effortlessly handles turn-taking, background noise, and tool calls.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>Clear Voice AI utilizes proprietary DISC and ARCH communication protocols to produce AI agents that outperform 90% of humans on information calls.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reseller & Affiliate Program — bottom of page: register + $99 Stripe checkout */}
      <AffiliateResellerSection />

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
        {isAuthenticated ? (
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-600 text-xs" data-testid="button-admin-dashboard">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-slate-600 text-xs" onClick={() => authLogout()} data-testid="button-logout">
              <LogOut className="w-3 h-3 mr-1" />
              Logout
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 text-xs"
            onClick={() => setShowLoginModal(true)}
            data-testid="button-admin-login"
          >
            <LogIn className="w-3 h-3 mr-1" />
            Admin Login
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

      {/* --- NEW: ConciergePanel Integration --- */}
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
        onClose={() => setIsChatOpen(false)}
        initialView={initialView}
        layoutMode={chatLayout}
        onCycleLayout={() => {
          const modes: Array<'floating' | 'fixed' | 'fullscreen'> = ['floating', 'fixed', 'fullscreen'];
          const currentIndex = modes.indexOf(chatLayout);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setChatLayout(nextMode);
        }}
        onOpenAdmin={() => setLocation('/aibizbot')}
        onOpenBizBotChat={() => setLocation('/chat/owner')}
        variant="sovereign"
        zIndex={60}
      />
    </div>
  );
}
