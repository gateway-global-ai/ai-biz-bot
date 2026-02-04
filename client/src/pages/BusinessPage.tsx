import { useState, useEffect } from 'react';
import { 
  Phone, Building2, Users, Globe, ShieldCheck, 
  ArrowLeft, CheckCircle2, MessageSquare, 
  Briefcase, Zap, PhoneCall, CreditCard, ChevronRight,
  Headphones, Calendar, TrendingUp, Store, ShoppingCart, Server
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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

export default function BusinessPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    useCase: 'customer-support',
    volume: '<100'
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setIsSubmitted(true), 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
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
          <Phone className="w-3 h-3" /> Enterprise Solutions
        </div>
      </nav>

      <section className="relative pt-16 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="mb-4">
            <VoiceVisualizer />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Never Miss Another Call
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
            Give Your AI Agent a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              Real Phone Number
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Your Customers Can Now Call Your AI Assistant. <br/>
            <span className="text-white font-medium">24/7 AI Receptionist starting at $99/mo.</span>
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Store, title: "Small Business", quote: "AI receptionist for $99 vs human for $3000/mo.", color: "text-emerald-400" },
              { icon: ShoppingCart, title: "E-Commerce", quote: "Handle order status questions via SMS 24/7.", color: "text-blue-400" },
              { icon: Calendar, title: "Healthcare", quote: "HIPAA-compliant appointment scheduling.", color: "text-violet-400" },
              { icon: Headphones, title: "Call Centers", quote: "Reduce hold times by 80% with AI triage.", color: "text-amber-400" }
            ].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
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

      <section className="py-16 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Request Enterprise Access</h2>
            <p className="text-slate-400">
              Our enterprise team will review your requirements and set up a dedicated AI phone system tailored to your business needs.
            </p>
            <div className="flex items-center gap-4">
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
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
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
        <p>&copy; 2024 Gateway Global AI. Enterprise Division.</p>
      </footer>
    </div>
  );
}
