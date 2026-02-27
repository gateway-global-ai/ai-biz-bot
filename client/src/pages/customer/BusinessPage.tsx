import { useState, useEffect, useRef, useCallback } from 'react';
import gatewayLogo from '@assets/gatewaylogo_header_left_1770354860467.png';
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

import gatewaySquareLogo from "@assets/gatewayglobalai_logo_square.png";

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
          className="absolute w-16 h-16 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
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

export default function BusinessPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    useCase: 'customer-support',
    volume: '<100'
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
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
  const [previewTimer, setPreviewTimer] = useState(30); // 30-second gate before phone capture
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

  // Determine which business context to use
  const currentBusiness = selectedPlace ? {
    id: selectedPlace.place_id || 'platform_landing',
    placeId: selectedPlace.place_id || '',
    name: selectedPlace.name,
    address: selectedPlace.formatted_address || '',
    hours: selectedPlace.opening_hours?.weekday_text?.join(', '),
    services: selectedPlace.types,
    primaryColor: '#6366f1'
  } : {
    ...platformIdentity,
    id: 'platform_landing'
  };

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

      autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;

        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'rating',
                   'userRatingCount', 'nationalPhoneNumber', 'websiteURI', 'photos', 'regularOpeningHours'],
        });

        if (!place.displayName) return;

        const placeId = place.id ?? undefined;
        let geometry: { lat: number; lng: number } | undefined;
        if (place.location) {
          geometry = { lat: place.location.lat(), lng: place.location.lng() };
        }

        const placeData: SelectedPlace = {
          name: place.displayName || '',
          formatted_address: place.formattedAddress || '',
          rating: place.rating ?? undefined,
          user_ratings_total: place.userRatingCount ?? undefined,
          formatted_phone_number: place.nationalPhoneNumber ?? undefined,
          website: place.websiteURI ?? undefined,
          types: place.types || [],
          place_id: placeId,
          photos: place.photos || [],
          opening_hours: place.regularOpeningHours ?? undefined,
          reviews: [],
          geometry,
        };
        setSelectedPlace(placeData);
        setMapsError(null);

        if (placeId) {
          try {
            const detailsRes = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
            const details = await detailsRes.json();
            setSelectedPlace(prev => prev ? {
              ...prev,
              reviews: details.reviews?.length > 0 ? details.reviews : prev.reviews,
              user_ratings_total: details.user_ratings_total || prev.user_ratings_total,
              rating: details.rating || prev.rating,
              price_level: details.price_level,
              business_status: details.business_status,
              url: details.url,
              vicinity: details.vicinity,
              utc_offset: details.utc_offset,
              international_phone_number: details.international_phone_number,
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
            } : prev);
          } catch (err) {
            console.error('[Places] Failed to fetch details:', err);
          }
        }
      });

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
    setPreviewTimer(30); // 30-second gate
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setIsSubmitted(true), 800);
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
    <div className="min-h-screen bg-sky-50 text-foreground">
      <nav className="sticky top-0 z-50 bg-white/20 backdrop-blur-xl border-b border-white/10 shadow-sm px-6 py-1.5 flex items-center justify-between gap-4 overflow-visible">
        <img src={gatewaySquareLogo} alt="Gateway Global AI" className="h-14 w-auto relative z-10" style={{ filter: 'drop-shadow(0 2px 8px rgba(19,70,160,0.15))' }} />
        <div className="flex items-center gap-2 justify-end">
          <ShareButton
            shareTitle="Gateway Global AI - AI-Powered Business Websites"
            shareText="Gateway Global AI creates professional AI-powered websites for businesses with voice concierge and chat support."
            variant="light"
            testIdPrefix="main-share"
          />
          {isCustomerAuth ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 text-xs"
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
              className="text-slate-600 text-xs"
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
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="max-w-lg w-full">
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
      <section className="relative min-h-[100vh] min-h-[100svh] flex flex-col px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
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
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground text-center" data-testid="text-hero-heading">
              Free Custom Websites<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 text-3xl md:text-[48px]">
                AI Voice and Chat Enabled
              </span>
            </h1>
            <div className="max-w-2xl w-full" data-testid="container-place-search">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
                <div className="relative bg-white rounded-2xl border border-border p-2 flex items-center gap-2 shadow-lg">
                  <div ref={pickerContainerRef} className="flex-1 min-w-0" />
                  {!mapsKey && (
                    <div className="pr-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
              {mapsError && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-1" data-testid="text-maps-error">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  {mapsError}
                </p>
              )}
              {!mapsError && <p className="text-xs text-slate-600 mt-3 text-center">Powered by Google Places</p>}
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl text-center leading-relaxed font-light">
              Fully Developed Web Site In 1 Hour!<br/>
              <span className="text-foreground font-medium">No Credit Card Required.</span>
            </p>
          </div>
        </div>
        <div className="pb-8 md:pb-12" />

        {/* Business Preview Overlay — appears on top of hero when a place is selected */}
        {selectedPlace && stage === 'landing' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="max-w-lg w-full">
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    {selectedPlace.photos && selectedPlace.photos.length > 0 && typeof selectedPlace.photos[0]?.getURI === 'function' ? (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-800">
                        <img
                          src={selectedPlace.photos[0].getURI({ maxWidth: 400 })}
                          alt={selectedPlace.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : selectedPlace.photos && selectedPlace.photos.length > 0 && typeof selectedPlace.photos[0]?.getUrl === 'function' ? (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-800">
                        <img
                          src={selectedPlace.photos[0].getUrl({ maxWidth: 400 })}
                          alt={selectedPlace.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-lg bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-slate-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-white" data-testid="text-place-name">{selectedPlace.name}</h3>
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{selectedPlace.formatted_address}</span>
                          </p>
                        </div>
                        {selectedPlace.rating && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-white font-bold">{selectedPlace.rating}</span>
                            {selectedPlace.user_ratings_total && (
                              <span className="text-slate-500 text-sm">({selectedPlace.user_ratings_total.toLocaleString()})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedPlace.formatted_phone_number && (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                            <Phone className="w-3 h-3 mr-1" /> {selectedPlace.formatted_phone_number}
                          </Badge>
                        )}
                        {selectedPlace.types?.slice(0, 3).map(t => (
                          <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-300 text-xs capitalize">
                            {t.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-3">
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600" 
                        data-testid="button-generate-site"
                        onClick={handleGenerateWebsite}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Yes, This Is My Business
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-slate-700 text-slate-300" 
                        onClick={() => setSelectedPlace(null)} 
                        data-testid="button-clear-selection"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Website Preview — renders the full website-builder template */}
        {(stage === 'preview' || stage === 'full-access') && selectedPlace && (
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50">
            <WebsitePreview place={selectedPlace} onBack={() => { setStage('landing'); setSelectedPlace(null); }} />
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
      {/* Enterprise Form */}
      <section className="py-16 px-6 bg-slate-900/20 border-y border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Request Enterprise Access</h2>
            <p className="text-slate-400">
              Our enterprise team will review your requirements and set up a dedicated AI phone system tailored to your business needs.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Custom pricing
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Dedicated support
              </div>
            </div>
          </div>

          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl">
            <CardContent className="p-8">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={formState.name}
                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                    data-testid="input-biz-name"
                  />
                  <Input
                    type="email"
                    placeholder="Work Email"
                    value={formState.email}
                    onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                    data-testid="input-biz-email"
                  />
                  <Input
                    type="text"
                    placeholder="Company Name"
                    value={formState.company}
                    onChange={(e) => setFormState(prev => ({ ...prev, company: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                    data-testid="input-biz-company"
                  />
                  <Select 
                    value={formState.useCase} 
                    onValueChange={(value) => setFormState(prev => ({ ...prev, useCase: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700" data-testid="select-usecase">
                      <SelectValue placeholder="Select Use Case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer-support">Customer Support</SelectItem>
                      <SelectItem value="sales">Sales Calls</SelectItem>
                      <SelectItem value="scheduling">Appointment Scheduling</SelectItem>
                      <SelectItem value="general">General Inquiries</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={formState.volume} 
                    onValueChange={(value) => setFormState(prev => ({ ...prev, volume: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700" data-testid="select-volume">
                      <SelectValue placeholder="Number of Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Location</SelectItem>
                      <SelectItem value="2-5">2 - 5 Locations</SelectItem>
                      <SelectItem value="6-20">6 - 20 Locations</SelectItem>
                      <SelectItem value=">20">20+ Locations</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    data-testid="button-biz-submit"
                  >
                    Request Access <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Request Received</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Our enterprise team will review your requirements. Expect an email at <span className="text-white font-mono">{formState.email}</span> within 24 hours.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
          toast({ title: 'Welcome back!', description: `Signed in as ${data.user.name || 'Business Owner'}` });
          window.location.href = "/my-account";
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
        onOpenSettings={() => {
          console.log('[BusinessPage] Open voice settings');
          // TODO: Open settings modal
        }}
        zIndex={60}
      />
    </div>
  );
}
