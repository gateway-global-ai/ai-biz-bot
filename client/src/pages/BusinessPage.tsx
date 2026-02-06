import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, Building2, Users, Globe, ShieldCheck, 
  ArrowLeft, CheckCircle2, MessageSquare, 
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight,
  Headphones, Calendar, TrendingUp, Store, ShoppingCart, Server,
  Search, MapPin, Star, ExternalLink, Loader2, ArrowRight, Sparkles,
  Clock, Bot, Wand2, X, Eye, Send, User, KeyRound, LogIn, LogOut
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type Sentiment = 'calm' | 'engaged' | 'helpful';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'READY' },
  engaged: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'LISTENING' },
  helpful: { primary: 'rgba(139, 92, 246, 0.8)', glow: 'rgba(139, 92, 246, 0.4)', label: 'SPEAKING' },
};

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
    <div className="relative w-32 h-32 flex items-center justify-center mx-auto">
      <div 
        className="absolute inset-0 border border-dashed rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(59, 130, 246, 0.3)`, 
          animationDuration: '20s'
        }}
      />
      <div 
        className="absolute inset-2 border border-dotted rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(99, 102, 241, 0.25)`, 
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
  website?: string;
  types?: string[];
  photos?: any[];
  opening_hours?: { weekday_text?: string[]; isOpen?: () => boolean };
  place_id?: string;
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
  const [libLoaded, setLibLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState<OnboardingStage>('landing');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [previewTimer, setPreviewTimer] = useState(60);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [demoLeadId, setDemoLeadId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [demoCountdown, setDemoCountdown] = useState(3600);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const { user, isAuthenticated, login: authLogin, logout: authLogout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginMaskedPhone, setLoginMaskedPhone] = useState('');

  const formatLoginPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', '/api/auth/send-otp', { phone: phoneNumber });
      return response.json();
    },
    onSuccess: (data) => {
      setLoginMaskedPhone(data.phone);
      setLoginStep('otp');
      toast({ title: 'Code Sent', description: `Verification code sent to ***-***-${data.phone}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to send code', variant: 'destructive' });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-otp', { phone, code });
      return response.json();
    },
    onSuccess: (data) => {
      authLogin(data.token, data.user);
      setShowLoginModal(false);
      setLoginStep('phone');
      setLoginPhone('');
      setLoginOtp('');
      toast({ title: 'Welcome!', description: `Logged in as ${data.user.name || 'Admin'}` });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({ title: 'Verification Failed', description: error.message || 'Invalid or expired code', variant: 'destructive' });
    },
  });

  const handleLoginPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = loginPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({ title: 'Invalid Phone', description: 'Please enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }
    sendOtpMutation.mutate(loginPhone);
  };

  const handleLoginOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtp.length !== 6) {
      toast({ title: 'Invalid Code', description: 'Please enter the 6-digit verification code', variant: 'destructive' });
      return;
    }
    verifyOtpMutation.mutate({ phone: loginPhone, code: loginOtp });
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
    if (!mapsKey) return;
    if (document.querySelector('script[data-gmpx-lib]')) {
      setLibLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js';
    script.setAttribute('data-gmpx-lib', 'true');
    script.onload = () => setLibLoaded(true);
    script.onerror = () => setMapsError('Failed to load Google Maps library.');
    document.head.appendChild(script);

    (window as any).gm_authFailure = () => {
      setMapsError('Google Maps API not activated. Enable "Maps JavaScript API" and "Places API" in Google Cloud Console.');
    };
  }, [mapsKey]);

  useEffect(() => {
    if (!libLoaded || !mapsKey || !pickerContainerRef.current) return;
    const container = pickerContainerRef.current;
    if (container.querySelector('gmpx-api-loader')) return;

    const apiLoader = document.createElement('gmpx-api-loader');
    apiLoader.setAttribute('key', mapsKey);
    apiLoader.setAttribute('solution-channel', 'GMP_GE_mapsandplacesautocomplete_v2');
    container.appendChild(apiLoader);

    const placePicker = document.createElement('gmpx-place-picker') as any;
    placePicker.setAttribute('placeholder', 'What is your business name?');
    placePicker.setAttribute('data-testid', 'input-place-search');
    placePicker.style.cssText = 'width:100%;--gmpx-color-surface:transparent;--gmpx-color-on-surface:#e2e8f0;--gmpx-color-on-surface-variant:#64748b;--gmpx-color-primary:#818cf8;--gmpx-color-outline:transparent;--gmpx-font-family-base:inherit;--gmpx-font-size-base:1.1rem;border:none;outline:none;';

    const removeBorder = () => {
      const shadow = placePicker.shadowRoot;
      if (shadow) {
        const style = document.createElement('style');
        style.textContent = `
          :host { border: none !important; outline: none !important; }
          * { border-color: transparent !important; outline: none !important; }
          .container, .input-container, [class*="container"] { border: none !important; border-color: transparent !important; }
          input { border: none !important; outline: none !important; background: transparent !important; }
        `;
        shadow.appendChild(style);
      } else {
        requestAnimationFrame(removeBorder);
      }
    };
    requestAnimationFrame(removeBorder);

    placePicker.addEventListener('gmpx-placechange', () => {
      const place = placePicker.value;
      if (place && (place.displayName || place.name)) {
        setSelectedPlace({
          name: place.displayName || place.name || '',
          formatted_address: place.formattedAddress || place.formatted_address || '',
          rating: place.rating ?? undefined,
          user_ratings_total: place.userRatingCount ?? place.user_ratings_total ?? undefined,
          formatted_phone_number: place.nationalPhoneNumber ?? place.formatted_phone_number ?? undefined,
          website: place.websiteURI ?? place.website ?? undefined,
          types: place.types || [],
          place_id: place.id ?? place.place_id ?? undefined,
          photos: place.photos || [],
          opening_hours: place.regularOpeningHours ?? place.opening_hours ?? undefined,
        });
        setMapsError(null);
      }
    });

    container.appendChild(placePicker);
  }, [libLoaded, mapsKey]);

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

  useEffect(() => {
    if (stage !== 'preview') return;
    setPreviewTimer(60);
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
    setDemoCountdown(3600);
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
    setStage('sending-link');

    try {
      const res = await fetch('/api/demo/create', {
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
        setDemoLeadId(data.leadId);
        setMagicLinkSent(true);
        setStage('training');
      } else {
        setPhoneError(data.error || 'Something went wrong. Please try again.');
        setStage('phone-gate');
      }
    } catch {
      setPhoneError('Connection error. Please try again.');
      setStage('phone-gate');
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Gateway<span className="text-slate-500">Global</span> AI
          </span>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> AI Website Generator
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-300" data-testid="button-dashboard">
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => authLogout()} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300"
              onClick={() => { setShowLoginModal(true); setLoginStep('phone'); setLoginPhone(''); setLoginOtp(''); }}
              data-testid="button-admin-login"
            >
              <LogIn className="w-4 h-4 mr-1" />
              Admin
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
                    Enter your phone number and we'll send you a magic link to access your free website anytime.
                  </p>
                </div>
                <div className="max-w-sm mx-auto space-y-4">
                  <div>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                      className="bg-slate-800 border-slate-700 text-center text-lg h-12"
                      data-testid="input-phone-gate"
                      disabled={stage === 'sending-link'}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-400 mt-2" data-testid="text-phone-error">{phoneError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMagicLink}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 h-12 text-base"
                    disabled={stage === 'sending-link'}
                    data-testid="button-send-magic-link"
                  >
                    {stage === 'sending-link' ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-5 h-5 mr-2" /> Send Magic Link</>
                    )}
                  </Button>
                  <p className="text-xs text-slate-600">
                    We'll text you a link. No passwords, no apps, no credit card.
                  </p>
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
                    We'll have everything ready for you within 1 hour.
                  </p>
                </div>
                {magicLinkSent && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Magic link sent to your phone</span>
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

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="mb-4">
            <VoiceVisualizer />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6" data-testid="text-hero-heading">
            Free Custom Websites<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              AI Voice and Chat Enabled
            </span>
          </h1>

          {/* Google Places Autocomplete - Extended Component Library */}
          <div className="max-w-2xl mx-auto" data-testid="container-place-search">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
              <div className="relative bg-slate-900 rounded-xl border-0 p-2 flex items-center gap-2">
                <div ref={pickerContainerRef} className="flex-1 min-w-0" />
                {!libLoaded && mapsKey && (
                  <div className="pr-3">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>
            {mapsError && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1" data-testid="text-maps-error">
                <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                {mapsError}
              </p>
            )}
            {!mapsError && <p className="text-xs text-slate-600 mt-2">Powered by Google Places</p>}
          </div>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Fully Developed Web Site In 1 Hour!<br/>
            <span className="text-white font-medium">No Credit Card Required.</span>
          </p>
        </div>
      </section>

      {/* Selected Business Preview Card */}
      {selectedPlace && stage === 'landing' && (
        <section className="px-6 pb-12 -mt-2">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-slate-900/80 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                  {selectedPlace.photos && selectedPlace.photos.length > 0 && typeof selectedPlace.photos[0]?.getURI === 'function' ? (
                    <div className="w-full md:w-40 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                      <img
                        src={selectedPlace.photos[0].getURI({ maxWidth: 400 })}
                        alt={selectedPlace.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : selectedPlace.photos && selectedPlace.photos.length > 0 && typeof selectedPlace.photos[0]?.getUrl === 'function' ? (
                    <div className="w-full md:w-40 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                      <img
                        src={selectedPlace.photos[0].getUrl({ maxWidth: 400 })}
                        alt={selectedPlace.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-40 h-28 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-10 h-10 text-slate-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
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

                    <div className="flex flex-wrap gap-2 pt-1">
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

                    <div className="flex flex-wrap gap-3 pt-3">
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600" 
                        data-testid="button-generate-site"
                        onClick={handleGenerateWebsite}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Website
                      </Button>
                      <Button variant="outline" className="border-slate-700 text-slate-300" data-testid="button-get-number">
                        <Phone className="w-4 h-4 mr-2" />
                        Get AI Phone Number
                      </Button>
                      {selectedPlace.website && (
                        <Button variant="ghost" className="text-slate-400" asChild>
                          <a href={selectedPlace.website} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Current Site
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Website Preview (shown after generation) */}
      {(stage === 'preview' || stage === 'full-access' || stage === 'phone-gate' || stage === 'sending-link' || stage === 'training' || stage === 'demo-ready' || stage === 'name-gate') && selectedPlace && (
        <section className="px-6 pb-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-4">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Website Generated
              </Badge>
              <h2 className="text-3xl font-bold text-white mb-2">{selectedPlace.name}</h2>
              <p className="text-slate-400">{selectedPlace.formatted_address}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-md flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">AI Voice Concierge</h3>
                  <p className="text-sm text-slate-400">24/7 phone support for your customers</p>
                  {stage === 'full-access' && (
                    <Badge variant="secondary" className="mt-3 bg-emerald-500/10 text-emerald-400 text-xs">Active</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-md flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">AI Chat Widget</h3>
                  <p className="text-sm text-slate-400">Smart chat trained on your business</p>
                  {stage === 'full-access' && (
                    <Badge variant="secondary" className="mt-3 bg-emerald-500/10 text-emerald-400 text-xs">Active</Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-violet-500/10 rounded-md flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Custom Website</h3>
                  <p className="text-sm text-slate-400">Professional site with your brand</p>
                  {stage === 'full-access' && (
                    <Badge variant="secondary" className="mt-3 bg-emerald-500/10 text-emerald-400 text-xs">Live</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {stage === 'full-access' && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {ownerName ? `Welcome, ${ownerName}!` : 'Welcome!'} Your demo is fully unlocked.
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  Check your phone for the magic link to access your website anytime. 
                  Your AI agents are ready to serve your customers.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

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
      <section className="py-16 px-6 bg-slate-900/30 border-y border-slate-900">
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

          <Card className="bg-slate-900/50 border-slate-800">
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
                      <SelectValue placeholder="Expected Call Volume" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<100">&lt; 100 calls/month</SelectItem>
                      <SelectItem value="100-500">100 - 500 calls/month</SelectItem>
                      <SelectItem value="500-2000">500 - 2,000 calls/month</SelectItem>
                      <SelectItem value=">2000">&gt; 2,000 calls/month</SelectItem>
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

      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>&copy; 2025 Gateway Global AI. Enterprise Division.</p>
      </footer>

      {showLoginModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-md w-full max-w-sm p-6 space-y-5 relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 text-slate-400"
              onClick={() => setShowLoginModal(false)}
              data-testid="button-close-login"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Login</h3>
              <p className="text-sm text-slate-400">
                {loginStep === 'phone'
                  ? 'Enter your phone number to receive a verification code'
                  : `Enter the 6-digit code sent to ***-***-${loginMaskedPhone}`}
              </p>
            </div>

            {loginStep === 'phone' ? (
              <form onSubmit={handleLoginPhoneSubmit} className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    data-testid="input-admin-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(formatLoginPhone(e.target.value))}
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    disabled={sendOtpMutation.isPending}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={sendOtpMutation.isPending}
                  data-testid="button-admin-send-code"
                >
                  {sendOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLoginOtpSubmit} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                  <Input
                    data-testid="input-admin-otp"
                    type="text"
                    placeholder="123456"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-center text-xl tracking-widest"
                    disabled={verifyOtpMutation.isPending}
                    maxLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={verifyOtpMutation.isPending}
                  data-testid="button-admin-verify"
                >
                  {verifyOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    'Verify & Login'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400"
                  onClick={() => { setLoginStep('phone'); setLoginOtp(''); }}
                  disabled={verifyOtpMutation.isPending}
                  data-testid="button-admin-back"
                >
                  Use a different number
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
