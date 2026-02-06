import { useState, useEffect, useRef } from 'react';
import { 
  Phone, Building2, Users, Globe, ShieldCheck, 
  ArrowLeft, CheckCircle2, MessageSquare, 
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight,
  Headphones, Calendar, TrendingUp, Store, ShoppingCart, Server,
  Search, MapPin, Star, ExternalLink, Loader2, ArrowRight, Sparkles
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    placePicker.setAttribute('placeholder', 'Search for your business (e.g. Boardwalk Suites Lafayette)');
    placePicker.setAttribute('data-testid', 'input-place-search');
    placePicker.style.cssText = 'width:100%;--gmpx-color-surface:transparent;--gmpx-color-on-surface:#e2e8f0;--gmpx-color-on-surface-variant:#64748b;--gmpx-color-primary:#818cf8;--gmpx-font-family-base:inherit;--gmpx-font-size-base:1.1rem;';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setIsSubmitted(true), 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Gateway<span className="text-slate-500">Global</span> Business
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> AI Website Generator
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-6 overflow-hidden">
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
                <div className="pl-2 text-slate-500">
                  <Search className="w-5 h-5" />
                </div>
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
            Your Customers Can Now Call Your AI Assistant. <br/>
            <span className="text-white font-medium">24/7 AI Receptionist starting at $99/mo.</span>
          </p>
        </div>
      </section>

      {/* Selected Business Preview Card */}
      {selectedPlace && (
        <section className="px-6 pb-12 -mt-2">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-slate-900/80 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-5">
                  {/* Business Photo */}
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
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="button-generate-site">
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

      {/* Use Cases */}
      <section className="py-16 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: "Small Business", quote: "AI receptionist for $99 vs human for $3000/mo.", color: "text-emerald-400" },
              { icon: ShoppingCart, title: "E-Commerce", quote: "Handle order status questions via SMS 24/7.", color: "text-blue-400" },
              { icon: Calendar, title: "Healthcare", quote: "HIPAA-compliant appointment scheduling.", color: "text-violet-400" },
              { icon: Headphones, title: "Call Centers", quote: "Reduce hold times by 80% with AI triage.", color: "text-amber-400" }
            ].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <item.icon className={`w-8 h-8 mb-4 ${item.color}`} />
                  <div className="font-bold text-white mb-2">{item.title}</div>
                  <p className="text-sm text-slate-400 italic">"{item.quote}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
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
    </div>
  );
}
