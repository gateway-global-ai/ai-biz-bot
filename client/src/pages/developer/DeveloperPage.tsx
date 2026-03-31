import { useState, useEffect } from 'react';
import { 
  Terminal, Code, Users, Zap, Gift, Layout, Calendar, 
  ArrowLeft, CheckCircle2, ChevronRight, Github, Globe, 
  Cpu, Rocket, ShieldCheck, Mail, Server, Radio
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

type Sentiment = 'calm' | 'engaged' | 'alert';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'CALM' },
  engaged: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'ENGAGED' },
  alert: { primary: 'rgba(250, 204, 21, 0.8)', glow: 'rgba(250, 204, 21, 0.4)', label: 'ALERT' },
};

const BotAvatarVisualizer = () => {
  const [sentiment, setSentiment] = useState<Sentiment>('calm');
  const [pulse, setPulse] = useState(0);
  
  useEffect(() => {
    const sentimentInterval = setInterval(() => {
      const sentiments: Sentiment[] = ['calm', 'engaged', 'alert'];
      setSentiment(sentiments[Math.floor(Math.random() * sentiments.length)]);
    }, 3000);
    
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
    <div className="relative w-40 h-40 flex items-center justify-center mx-auto">
      <div 
        className="absolute inset-0 border border-dashed rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(139, 92, 246, 0.4)`, 
          animationDuration: '20s'
        }}
      />
      <div 
        className="absolute inset-3 border border-dotted rounded-full animate-spin"
        style={{ 
          borderColor: `rgba(168, 85, 247, 0.3)`, 
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
          opacity: 0.4
        }}
      />
      
      <div 
        className="absolute rounded-full blur-2xl transition-all duration-500"
        style={{ 
          width: `${80 + waveIntensity * 30}%`,
          height: `${80 + waveIntensity * 30}%`,
          background: `radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)`,
          opacity: 0.6
        }}
      />
      
      <div 
        className="absolute w-20 h-20 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
        style={{
          borderColor: sentimentConfig.primary,
          boxShadow: `0 0 30px ${sentimentConfig.glow}, 0 0 15px ${sentimentConfig.glow}`,
          transform: `scale(${0.95 + waveIntensity * 0.1})`
        }}
      >
        <div className="relative z-20 flex flex-col items-center">
          <Server className="w-10 h-10 text-slate-200" />
          <div className="flex gap-1 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>

      <div className="absolute top-1 left-1 flex items-center gap-1">
        <div 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: sentimentConfig.primary, boxShadow: `0 0 6px ${sentimentConfig.glow}` }}
        />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: sentimentConfig.primary }}>
          {sentimentConfig.label}
        </span>
      </div>

      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-2 text-[8px] font-mono opacity-70">
        <span className="text-violet-400 flex items-center gap-0.5"><Zap className="w-2 h-2" /> API</span>
        <span className="text-fuchsia-400 flex items-center gap-0.5"><Radio className="w-2 h-2" /> MCP</span>
        <span className="text-emerald-400 flex items-center gap-0.5"><Cpu className="w-2 h-2" /> DISC</span>
      </div>
    </div>
  );
};

export default function DeveloperPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    github: '',
    idea: '',
    agreed: false
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setIsSubmitted(true), 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-y-auto">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="font-bold text-lg tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-violet-500" />
            Gateway<span className="text-slate-500">Global</span> 
            <span className="text-emerald-500 text-xs uppercase border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">
              Early Access
            </span>
          </span>
        </div>
        <a 
          href="#"
          className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          <Github className="w-4 h-4" />
          GitHub
        </a>
      </nav>

      <section className="relative pt-16 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] opacity-30 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="mb-6">
            <BotAvatarVisualizer />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-violet-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            v0.1.0 Alpha Access
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6">
            Build the Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400">
              AI Agents
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Join 2,437+ developers building on the most powerful agentic infrastructure. 
            Access SDKs, MCP Specs, and direct API tools before public launch.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link href="/dev/ui-kit">
              <Button
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                data-testid="link-ui-kit"
              >
                <Layout className="w-4 h-4 mr-2" />
                Developer UI Kit
              </Button>
            </Link>
            <Link href="/dev/shadcn-io-catalog">
              <Button
                variant="outline"
                className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                data-testid="link-shadcn-io-catalog"
              >
                shadcn.io directory
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-colors group">
              <CardContent className="p-6">
                <div className="text-2xl font-black text-white mb-1 group-hover:text-violet-400 transition-colors">MCP SDK</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">MCP Marketplace</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 hover:border-blue-500/30 transition-colors group">
              <CardContent className="p-6">
                <div className="text-2xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">Telephony SDK</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Voice & SMS API</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-colors group">
              <CardContent className="p-6">
                <div className="text-2xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">DISC API</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Behavioral Engine</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-900/30 border-y border-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Roadmap Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Code, title: 'Core SDK', status: 'Live', color: 'text-emerald-400' },
              { icon: Cpu, title: 'DISC Engine', status: 'Live', color: 'text-emerald-400' },
              { icon: Layout, title: 'MCP Marketplace', status: 'Beta', color: 'text-amber-400' },
              { icon: Rocket, title: 'Enterprise API', status: 'Q2 2026', color: 'text-blue-400' }
            ].map((item, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6 text-center">
                  <item.icon className={`w-8 h-8 mx-auto mb-3 ${item.color}`} />
                  <div className="font-bold text-white mb-1">{item.title}</div>
                  <div className={`text-xs font-bold ${item.color}`}>{item.status}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto">
          <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
            <CardContent className="p-8">
              {!isSubmitted ? (
                <>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">Join the Waitlist</h3>
                    <p className="text-slate-400 text-sm">Be first to build with the next generation of AI agent tools.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={formState.name}
                      onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                      data-testid="input-dev-name"
                    />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={formState.email}
                      onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                      data-testid="input-dev-email"
                    />
                    <Input
                      type="text"
                      placeholder="GitHub Username"
                      value={formState.github}
                      onChange={(e) => setFormState(prev => ({ ...prev, github: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                      data-testid="input-dev-github"
                    />
                    <Textarea
                      placeholder="What do you want to build?"
                      value={formState.idea}
                      onChange={(e) => setFormState(prev => ({ ...prev, idea: e.target.value }))}
                      className="bg-slate-800 border-slate-700 resize-none"
                      rows={3}
                      data-testid="input-dev-idea"
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                      data-testid="button-dev-submit"
                    >
                      Request Early Access <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                  <p className="text-slate-400 max-w-sm mx-auto mb-8">
                    We've reserved your spot. Keep an eye on your inbox for your invite code.
                  </p>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 inline-block text-left">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your Position</p>
                    <p className="text-2xl font-mono text-emerald-400" data-testid="text-position">#4,238</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-slate-900">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          {[
            { q: "When will I get access?", a: "We're inviting developers in batches starting next week. You'll receive an email with next steps." },
            { q: "What's the tech stack?", a: "TypeScript/Node.js for the platform backend, MCP protocol for integrations, and support for multiple AI backends including Gemini and OpenAI." },
            { q: "Can I build commercial products?", a: "Yes! Our platform is designed for enterprise businesses. Early access includes commercial usage rights with a generous free tier." }
          ].map((item, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-violet-500" />
                  {item.q}
                </h3>
                <p className="text-slate-400 text-sm pl-6 leading-relaxed">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>&copy; 2024 Gateway Global AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
