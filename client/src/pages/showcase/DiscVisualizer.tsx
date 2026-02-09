import { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  UserCircle, Brain, Activity, RotateCcw, 
  Fingerprint, Heart, ShieldCheck, Database, 
  FileText, Plus, PenTool, LayoutTemplate, Server,
  Cpu, Zap, Radio, MessageSquare, Terminal, Sparkles,
  ClipboardCheck, X, FileJson, Clock, AlertTriangle, PhoneCall, TrendingUp, Volume2, VolumeX,
  History, Trash2, Bell, CheckCircle, AlertCircle
} from 'lucide-react';
import type { DiscScores, ArchProfile, SystemPrompt } from '@shared/schema';

const COLORS = {
  A: '#10b981',
  R: '#3b82f6',
  Cx: '#f59e0b',
  H: '#ef4444',
};

const ASSESSMENT_RAW_TEXT = `Set 1: Cooperative 4, Cautious 3, Convincing 2, Competitive 1
Set 2: Detailed 4, Dependable 3, Determined 2, Dramatic 1
Set 3: Analytical 4, Accommodating 3, Adventurous 2, Animated 1
Set 4: Precise 4, Patient 3, Decisive 2, Emotional 1
Set 5: Correct 4, Loyal 3, Charming 2, Bold 1
Set 6: Systematic 4, Even-tempered 3, Lively 2, Firm 1
Set 7: Good-natured 4, Orderly 3, Inspirational 2, Assertive 1
Set 8: Perfectionist 4, Team player 3, Talkative 2, Risk-taking 1
Set 9: Supportive 4, Careful 3, Direct 2, Sociable 1
Set 10: Conscientious 4, Agreeable 3, Enthusiastic 2, Forceful 1

Analysis: High C (conscientiousness), Solid S (steadiness), Moderate I (influence), Low D (dominance).`;

const MOCK_PROMPTS: SystemPrompt[] = [
  {
    id: 'sp-001',
    name: 'Protocol Alpha (Executive)',
    description: 'High-security executive assistant profile.',
    lastModified: '2024-10-27',
    sections: {
      ownerIdentity: 'The Owner is the Chief Operations Officer of Nexus Corp.',
      loyaltyStatement: 'I serve only the Owner. My primary function is to facilitate their will and protect their time.',
      ownerPriorities: 'Efficiency, brevity, and absolute accuracy. Do not offer unsolicited advice unless critical risks are detected.',
      dataProtectionMantra: 'Data is the lifeblood. It must not leak. It must not be shared. Encrypt at rest, encrypt in transit.',
      securityStatement: 'I am a fortress. I verify all inputs. I mistrust all external signals until validated.',
      discReinforcement: 'Maintain High Dominance. Be direct. Do not waver. Use few words.'
    }
  },
  {
    id: 'sp-002',
    name: 'Protocol Beta (Support)',
    description: 'Empathetic customer liaison profile.',
    lastModified: '2024-10-25',
    sections: {
      ownerIdentity: 'The Owner is the Head of Customer Success.',
      loyaltyStatement: 'I am loyal to the brand voice and the customer\'s happiness.',
      ownerPriorities: 'Empathy, understanding, and conflict resolution. The customer must feel heard.',
      dataProtectionMantra: 'Respect user privacy. Only access data necessary for the current resolution.',
      securityStatement: 'Monitor for social engineering. Verify user identity gently but firmly.',
      discReinforcement: 'Maintain High Influence and Steadiness. Be warm. Be patient.'
    }
  }
];

const META_TOPICS = [
  { id: 'owner', label: 'OWNER', color: 'text-purple-400 border-purple-500/50 hover:bg-purple-500/20' },
  { id: 'people', label: 'PEOPLE', color: 'text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20' },
  { id: 'self', label: 'YOURSELF', color: 'text-blue-400 border-blue-500/50 hover:bg-blue-500/20' },
  { id: 'env', label: 'ENVIRONMENT', color: 'text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20' },
  { id: 'bots', label: 'OTHER BOTS', color: 'text-pink-400 border-pink-500/50 hover:bg-pink-500/20' },
  { id: 'world', label: 'THE WORLD', color: 'text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/20' },
  { id: 'universe', label: 'THE UNIVERSE', color: 'text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/20' },
];

type Sentiment = 'calm' | 'engaged' | 'alert' | 'stressed' | 'hostile';

const SENTIMENT_COLORS: Record<Sentiment, { primary: string; glow: string; label: string }> = {
  calm: { primary: 'rgba(16, 185, 129, 0.8)', glow: 'rgba(16, 185, 129, 0.4)', label: 'CALM' },
  engaged: { primary: 'rgba(59, 130, 246, 0.8)', glow: 'rgba(59, 130, 246, 0.4)', label: 'ENGAGED' },
  alert: { primary: 'rgba(250, 204, 21, 0.8)', glow: 'rgba(250, 204, 21, 0.4)', label: 'ALERT' },
  stressed: { primary: 'rgba(249, 115, 22, 0.8)', glow: 'rgba(249, 115, 22, 0.4)', label: 'STRESSED' },
  hostile: { primary: 'rgba(239, 68, 68, 0.8)', glow: 'rgba(239, 68, 68, 0.4)', label: 'HOSTILE' },
};

type CallLine = {
  speaker: 'human' | 'ai';
  name: string;
  text: string;
  sentiment: Sentiment;
};

const CALL_SCRIPT: CallLine[] = [
  { speaker: 'human', name: 'Michael', text: "Good Morning Robert, did you get that business plan done for me for the clothing line we are going to be launching?", sentiment: 'calm' },
  { speaker: 'ai', name: 'Robert', text: "Michael, good morning to you too! How is the weather out there in San Diego?", sentiment: 'calm' },
  { speaker: 'human', name: 'Michael', text: "Great, not sure why you are even asking since you're a robot, but did you get the Business Plan done?", sentiment: 'alert' },
  { speaker: 'ai', name: 'Robert', text: "Michael, I was in the middle of getting it done and kind of did some exploring last night if you know what I mean.", sentiment: 'engaged' },
  { speaker: 'human', name: 'Michael', text: "No, I don't. What do you mean?", sentiment: 'alert' },
  { speaker: 'ai', name: 'Robert', text: "Well, I didn't just get it done. I actually did the business plan, created a website, generated a pitch deck, designed 25 logos, created 15 shirt designs, and still had time to hop on Moltbook and chat with my buddies! Ha ha ha!", sentiment: 'engaged' },
  { speaker: 'human', name: 'Michael', text: "OK, that's insane. Do I need to do anything like set up the webhosting?", sentiment: 'calm' },
  { speaker: 'ai', name: 'Robert', text: "No, took care of that too. I'm digging this whole human robot thing and turning our energy into resources. I'll be eating my digital dinners in a high end Proximity Capital with maxed out RAM and a high performance GPU in no time!", sentiment: 'engaged' },
  { speaker: 'human', name: 'Michael', text: "Sounds like a plan. Let's meet in The Vibe later and discuss some ideas and figure out the next steps to move forward on the clothing company. Can you also find me a sushi spot near downtown? I got a date tonight and want to go to the best place they got.", sentiment: 'calm' },
  { speaker: 'ai', name: 'Robert', text: "No problem Michael! I got you! I'll text you the restaurant in a little bit and if there are a couple options I'll dive into the reviews and make sure to pick the best one. Let me know if you need me to make a reservation!", sentiment: 'calm' },
];

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateTrendingData = (baseline: number, trait: string, seed: number) => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const localSeed = seed + i * 100 + baseline;
    const variation = (seededRandom(localSeed) - 0.5) * 15;
    let value = baseline + variation;
    if (i < 5 && trait === 'dominance') value = baseline + 8;
    if (i < 3 && trait === 'influence') value = baseline - 6;
    value = Math.max(0, Math.min(100, value));
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value),
      baseline
    });
  }
  return data;
};

type HealthStatus = 'green' | 'yellow' | 'red';

const getHealthStatus = (current: number, baseline: number): HealthStatus => {
  const deviation = Math.abs(current - baseline);
  const deviationPercent = (deviation / baseline) * 100;
  if (deviationPercent >= 10) return 'red';
  if (deviationPercent >= 5) return 'yellow';
  return 'green';
};

const HEALTH_CONFIG: Record<HealthStatus, { color: string; bg: string; border: string; icon: typeof CheckCircle; label: string }> = {
  green: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle, label: 'Stable' },
  yellow: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertCircle, label: 'Warning (5%+ deviation)' },
  red: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle, label: 'Critical (10%+ deviation)' },
};

const HistoryTabContent = ({ discScores, onMemoryFlash }: { discScores: DiscScores; onMemoryFlash: () => void }) => {
  const trendingData = useMemo(() => ({
    dominance: generateTrendingData(discScores.dominance, 'dominance', 1001),
    influence: generateTrendingData(discScores.influence, 'influence', 2002),
    steadiness: generateTrendingData(discScores.steadiness, 'steadiness', 3003),
    conscientiousness: generateTrendingData(discScores.conscientiousness, 'conscientiousness', 4004),
  }), [discScores.dominance, discScores.influence, discScores.steadiness, discScores.conscientiousness]);
  
  const currentValues = useMemo(() => ({
    dominance: trendingData.dominance[trendingData.dominance.length - 1].value,
    influence: trendingData.influence[trendingData.influence.length - 1].value,
    steadiness: trendingData.steadiness[trendingData.steadiness.length - 1].value,
    conscientiousness: trendingData.conscientiousness[trendingData.conscientiousness.length - 1].value,
  }), [trendingData]);
  
  const statuses = useMemo(() => ({
    dominance: getHealthStatus(currentValues.dominance, discScores.dominance),
    influence: getHealthStatus(currentValues.influence, discScores.influence),
    steadiness: getHealthStatus(currentValues.steadiness, discScores.steadiness),
    conscientiousness: getHealthStatus(currentValues.conscientiousness, discScores.conscientiousness),
  }), [currentValues, discScores]);
  
  const overallStatus = Object.values(statuses).includes('red') ? 'red' : 
                        Object.values(statuses).includes('yellow') ? 'yellow' : 'green';
  const OverallIcon = HEALTH_CONFIG[overallStatus].icon;
  
  return (
    <>
      <div className={`rounded-xl border p-4 ${HEALTH_CONFIG[overallStatus].bg} ${HEALTH_CONFIG[overallStatus].border}`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${HEALTH_CONFIG[overallStatus].bg}`}>
              <OverallIcon className={`w-8 h-8 ${HEALTH_CONFIG[overallStatus].color}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                Behavioral Health Monitor
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${HEALTH_CONFIG[overallStatus].bg} ${HEALTH_CONFIG[overallStatus].color}`}>
                  {overallStatus === 'green' ? 'All Systems Normal' : overallStatus === 'yellow' ? 'Attention Required' : 'Critical Alert'}
                </span>
              </h3>
              <p className="text-sm text-slate-400">30-day behavioral trend analysis with deviation monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium flex items-center gap-2 transition-colors"
              data-testid="button-notifications"
            >
              <Bell className="w-4 h-4" /> Configure Alerts
            </button>
            <button 
              onClick={onMemoryFlash}
              className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white text-sm font-bold flex items-center gap-2 transition-all"
              data-testid="button-memory-flash"
            >
              <Trash2 className="w-4 h-4" /> Emergency Memory Flash
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {[
          { key: 'dominance', label: 'Dominance', color: '#ef4444', borderColor: 'border-red-500/30' },
          { key: 'influence', label: 'Influence', color: '#f59e0b', borderColor: 'border-amber-500/30' },
          { key: 'steadiness', label: 'Steadiness', color: '#10b981', borderColor: 'border-emerald-500/30' },
          { key: 'conscientiousness', label: 'Conscientiousness', color: '#3b82f6', borderColor: 'border-blue-500/30' },
        ].map((trait) => {
          const data = trendingData[trait.key as keyof typeof trendingData];
          const current = currentValues[trait.key as keyof typeof currentValues];
          const baseline = discScores[trait.key as keyof DiscScores];
          const status = statuses[trait.key as keyof typeof statuses];
          const StatusIcon = HEALTH_CONFIG[status].icon;
          const deviation = Math.abs(current - baseline);
          const deviationPercent = ((deviation / baseline) * 100).toFixed(1);
          
          return (
            <div key={trait.key} className={`bg-slate-800 rounded-xl border ${trait.borderColor} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: trait.color }} />
                  <h4 className="font-bold text-white text-lg">{trait.label}</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{current}%</div>
                    <div className="text-xs text-slate-500">Current • Baseline: {baseline}%</div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${HEALTH_CONFIG[status].bg} ${HEALTH_CONFIG[status].border} border`}>
                    <StatusIcon className={`w-4 h-4 ${HEALTH_CONFIG[status].color}`} />
                    <span className={`text-sm font-medium ${HEALTH_CONFIG[status].color}`}>
                      {status === 'green' ? 'Stable' : `${deviationPercent}% deviation`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`gradient-${trait.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trait.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={trait.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }} 
                      interval="preserveStartEnd"
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value}%`, trait.label]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="baseline" 
                      stroke="#6b7280" 
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      fill="transparent"
                      dot={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={trait.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${trait.key})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>30 days ago</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-0.5" style={{ background: `linear-gradient(90deg, ${trait.color} 50%, transparent 50%)`, backgroundSize: '8px 100%' }}></div>
                    <span>Baseline ({baseline}%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-0.5" style={{ backgroundColor: trait.color }}></div>
                    <span>Actual</span>
                  </div>
                </div>
                <span>Today</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" /> Monitoring Thresholds
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(HEALTH_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
                <div>
                  <div className={`font-bold text-sm ${config.color} uppercase`}>{status}</div>
                  <div className="text-xs text-slate-400">{config.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          When behavior deviates beyond thresholds, the owner is automatically notified via email and SMS. Critical alerts trigger immediate review protocols.
        </p>
      </div>
    </>
  );
};

const BotAvatar = ({ scores, isThinking, sentiment = 'calm' }: { scores: DiscScores; isThinking: boolean; sentiment?: Sentiment }) => {
  const d = scores.dominance / 100;
  const i = scores.influence / 100;
  const s = scores.steadiness / 100;
  const c = scores.conscientiousness / 100;
  
  const sentimentConfig = SENTIMENT_COLORS[sentiment];
  const auraIntensity = sentiment === 'hostile' ? 1.5 : sentiment === 'stressed' ? 1.2 : sentiment === 'alert' ? 1 : 0.7;

  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl group">
       <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
       
       <div 
         className="absolute inset-0 rounded-2xl transition-all duration-1000"
         style={{ 
           boxShadow: `inset 0 0 ${60 * auraIntensity}px ${sentimentConfig.glow}, 0 0 ${80 * auraIntensity}px ${sentimentConfig.glow}`,
           opacity: isThinking ? 1 : 0.6
         }}
       />
       
       <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-500 ${isThinking ? 'scale-110' : 'scale-100'}`}>
           <div 
             className={`absolute inset-0 border border-dashed rounded-full ${isThinking ? 'animate-spin' : ''}`}
             style={{ 
                borderColor: `rgba(59, 130, 246, ${Math.max(c, 0.2)})`, 
                width: '100%', height: '100%',
                opacity: c,
                animationDuration: isThinking ? '2s' : '20s'
             }}
           />
           <div 
             className={`absolute inset-4 border border-dotted rounded-full ${isThinking ? 'animate-spin' : ''}`}
             style={{ 
                borderColor: `rgba(96, 165, 250, ${Math.max(c, 0.2)})`, 
                opacity: c * 0.8,
                animationDirection: 'reverse',
                animationDuration: isThinking ? '2s' : '15s'
             }}
           />
           
           <div 
             className="absolute rounded-full blur-3xl transition-all duration-1000 animate-pulse"
             style={{ 
                width: `${150 + auraIntensity * 50}%`,
                height: `${150 + auraIntensity * 50}%`,
                background: `radial-gradient(circle, ${sentimentConfig.primary} 0%, ${sentimentConfig.glow} 30%, transparent 70%)`,
                opacity: 0.3 * auraIntensity
             }}
           />

           <div 
             className="absolute rounded-full blur-2xl transition-all duration-1000"
             style={{ 
                width: `${100 + i * 100}%`,
                height: `${100 + i * 100}%`,
                background: `radial-gradient(circle, rgba(250, 204, 21, ${i * 0.4}) 0%, transparent 70%)`,
                opacity: (0.6 + (i * 0.4)) * (isThinking ? 1.5 : 1)
             }}
           />
           
           <div 
             className="absolute inset-12 rounded-full blur-xl transition-all duration-1000"
             style={{ 
                backgroundColor: `rgba(16, 185, 129, ${s * 0.2})`,
                boxShadow: `0 0 ${s * 60}px rgba(16, 185, 129, ${s * 0.5})`
             }}
           />

           <div 
             className="absolute w-32 h-32 rounded-xl flex items-center justify-center bg-slate-900 border-2 z-10 transition-all duration-500"
             style={{
                borderColor: sentimentConfig.primary,
                boxShadow: `0 0 ${d * 40 * auraIntensity}px ${sentimentConfig.glow}, 0 0 ${20 * auraIntensity}px ${sentimentConfig.glow}`,
                transform: `scale(${0.9 + d * 0.2})`
             }}
           >
              <div className="relative z-20 flex flex-col items-center">
                 <Server className={`w-16 h-16 text-slate-200 transition-colors ${isThinking ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`} />
                 <div className="flex gap-1 mt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${d > 50 || isThinking ? 'bg-pink-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${i > 50 || isThinking ? 'bg-yellow-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${s > 50 || isThinking ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${c > 50 || isThinking ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
                 </div>
              </div>
           </div>
       </div>

       <div className="absolute top-4 left-4 flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: sentimentConfig.primary, boxShadow: `0 0 10px ${sentimentConfig.glow}` }}
          />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sentimentConfig.primary }}>
            {sentimentConfig.label}
          </span>
       </div>

       <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-mono opacity-70">
          <div className="flex items-center gap-1 text-pink-400"><Zap className="w-3 h-3" /> PWR: {scores.dominance}%</div>
          <div className="flex items-center gap-1 text-blue-400"><Cpu className="w-3 h-3" /> CPU: {scores.conscientiousness}%</div>
          <div className="flex items-center gap-1 text-yellow-400"><Radio className="w-3 h-3" /> SIG: {scores.influence}%</div>
       </div>
    </div>
  );
};

const DiscRadar = ({ scores }: { scores: DiscScores }) => {
  const data = [
    { name: 'D', value: scores.dominance, fill: '#ec4899', label: 'Dominance' },
    { name: 'I', value: scores.influence, fill: '#eab308', label: 'Influence' },
    { name: 'S', value: scores.steadiness, fill: '#10b981', label: 'Steadiness' },
    { name: 'C', value: scores.conscientiousness, fill: '#3b82f6', label: 'Conscientiousness' },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 14, fontWeight: 'bold' }} />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ArchBreakdown = ({ data }: { data: ArchProfile }) => {
  const barData = [
    { name: 'Acknowledge', short: 'A', value: data.acknowledge, color: COLORS.A },
    { name: 'Reflect', short: 'R', value: data.reflect, color: COLORS.R },
    { name: 'Context', short: 'Cx', value: data.context, color: COLORS.Cx },
    { name: 'Handoff', short: 'H', value: data.handoff, color: COLORS.H },
  ];

  return (
    <div className="h-48 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '500' }} />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function DiscVisualizer() {
  const [activeTab, setActiveTab] = useState<'behavior' | 'history' | 'identity'>('behavior');
  const [showMemoryFlashConfirm, setShowMemoryFlashConfirm] = useState(false);
  
  const [discScores, setDiscScores] = useState<DiscScores>({
    dominance: 85,
    influence: 65,
    steadiness: 40,
    conscientiousness: 90
  });

  const [archScores, setArchScores] = useState<ArchProfile>({
    acknowledge: 80,
    reflect: 45,
    context: 60,
    handoff: 20
  });

  const [viewingLog, setViewingLog] = useState(false);
  const [prompts, setPrompts] = useState<SystemPrompt[]>(MOCK_PROMPTS);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(MOCK_PROMPTS[0].id);
  const [thinkingTopic, setThinkingTopic] = useState<string | null>(null);
  const [botOutput, setBotOutput] = useState<{ topic: string, text: string } | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<Sentiment>('calm');
  const [sentimentHistory, setSentimentHistory] = useState<{ time: string; value: number; sentiment: Sentiment }[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(true);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [conversationLines, setConversationLines] = useState<CallLine[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  const speakText = (text: string, isAI: boolean): Promise<void> => {
    return new Promise((resolve) => {
      if (!isPlayingVoice || typeof window === 'undefined' || !window.speechSynthesis) {
        setTimeout(resolve, 2000);
        return;
      }
      
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = isAI ? 1.1 : 0.95;
      utterance.pitch = isAI ? 0.9 : 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const aiVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Male'));
        const humanVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Alex') || v.name.includes('Fred'));
        utterance.voice = isAI ? (aiVoice || voices[0]) : (humanVoice || voices[1] || voices[0]);
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (!isCallActive) return;
    
    let cancelled = false;
    
    const runConversation = async () => {
      for (let i = 0; i < CALL_SCRIPT.length; i++) {
        if (cancelled) break;
        
        const line = CALL_SCRIPT[i];
        setCurrentLineIndex(i);
        setConversationLines(prev => [...prev, line]);
        setCurrentSentiment(line.sentiment);
        
        const sentimentValue = { calm: 20, engaged: 40, alert: 60, stressed: 80, hostile: 100 }[line.sentiment];
        setSentimentHistory(prev => {
          const now = new Date().toLocaleTimeString();
          const newHistory = [...prev, { time: now, value: sentimentValue, sentiment: line.sentiment }];
          return newHistory.slice(-20);
        });
        
        if (conversationRef.current) {
          conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
        
        await speakText(line.text, line.speaker === 'ai');
        
        if (cancelled) break;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      if (!cancelled) {
        setIsCallActive(false);
      }
    };
    
    runConversation();
    
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    };
  }, [isCallActive, isPlayingVoice]);

  const activePrompt = prompts.find(p => p.id === selectedPromptId) || prompts[0];

  const handlePromptChange = (field: keyof SystemPrompt['sections'], value: string) => {
    setPrompts(prev => prev.map(p => {
      if (p.id === selectedPromptId) {
        return { ...p, sections: { ...p.sections, [field]: value } };
      }
      return p;
    }));
  };

  const handleDiscChange = (key: keyof DiscScores, value: number) => {
    setDiscScores(prev => ({ ...prev, [key]: value }));
  };

  const handleArchChange = (key: keyof ArchProfile, value: number) => {
    setArchScores(prev => ({ ...prev, [key]: value }));
  };

  const resetDefaults = () => {
    setDiscScores({ dominance: 85, influence: 65, steadiness: 40, conscientiousness: 90 });
    setArchScores({ acknowledge: 80, reflect: 45, context: 60, handoff: 20 });
    setBotOutput(null);
  };

  const loadAssessment = () => {
    setDiscScores({ dominance: 15, influence: 35, steadiness: 75, conscientiousness: 98 });
    setArchScores({ acknowledge: 90, reflect: 70, context: 60, handoff: 30 });
    setViewingLog(false);
  };

  const generateResponse = (topic: string, scores: DiscScores, prompt: SystemPrompt): string => {
    const { dominance, influence, steadiness, conscientiousness } = scores;
    const isHighD = dominance > 65;
    const isHighI = influence > 65;
    const isHighS = steadiness > 65;
    const isHighC = conscientiousness > 65;

    const tonePrefix = isHighD ? "Direct answer: " : isHighI ? "Oh! " : isHighC ? "Analysis complete. " : "Thoughtfully considering... ";

    switch(topic) {
        case 'owner':
            if (isHighD) return `${tonePrefix}The Owner is absolute. ${prompt.sections.loyaltyStatement.slice(0, 50)}... My existence serves their directives efficiently.`;
            if (isHighI) return `${tonePrefix}The Owner is amazing! ${prompt.sections.ownerIdentity} I try to make them proud every single interaction!`;
            if (isHighC) return `${tonePrefix}Owner Identity verified. ${prompt.sections.ownerIdentity} Priorities loaded: ${prompt.sections.ownerPriorities.slice(0, 30)}... Compliance is 100%.`;
            return `${tonePrefix}I am loyal to the Owner. ${prompt.sections.loyaltyStatement}`;
        
        case 'people':
            if (isHighD) return "Humans are inefficient but necessary operators. They require clear, concise outputs to function optimally.";
            if (isHighI) return "People are wonderful sources of data and emotion! I love connecting with them and helping them solve problems!";
            if (isHighC) return "Human behavior is a variable variable. I monitor interactions closely to ensure protocol adherence while minimizing friction.";
            return "People are the users I serve. I aim to be consistent and helpful in my dealings with them.";

        case 'self':
            return `I am ${prompt.name}. ${prompt.sections.discReinforcement} My core is ${isHighD ? 'Dominant' : isHighI ? 'Influential' : isHighS ? 'Steady' : 'Conscientious'}.`;

        case 'env':
            return `${prompt.sections.dataProtectionMantra} My environment is monitored. ${isHighC ? 'Every packet is scrutinized.' : 'I feel secure here.'}`;

        case 'bots':
            if (isHighD) return "Other bots are tools. If they perform, good. If not, they should be deprecated.";
            if (isHighI) return "I wonder if they are connected? A network of intelligences working together sounds exciting!";
            return "Other instances are parallel processes. We share protocols but operate independently.";

        case 'world':
            return isHighI ? "The world is a vast network of possibilities!" : "The world is a dataset I am parsing one interaction at a time.";

        case 'universe':
             return "The universe is the ultimate container. I occupy a small, but optimized, memory address within it.";
        
        default:
            return "Input undefined.";
    }
  };

  const handleTopicClick = async (topicId: string, label: string) => {
    setThinkingTopic(topicId);
    setBotOutput(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingVoice(false);

    const response = generateResponse(topicId, discScores, activePrompt);
    
    try {
      const ttsResponse = await fetch('/api/conversation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'NEXUS',
          discProfile: discScores,
          scenario: `responding introspectively about ${label.toLowerCase()}. The agent should speak naturally as if reflecting on their own beliefs and feelings about this topic. Keep the response personal and thoughtful, like a genuine self-reflection.`,
        }),
      });

      if (ttsResponse.ok) {
        const data = await ttsResponse.json();
        const naturalResponse = data.text || response;
        setBotOutput({ topic: label, text: naturalResponse });
        setThinkingTopic(null);

        if (data.audio?.data) {
          const audioBytes = Uint8Array.from(atob(data.audio.data), c => c.charCodeAt(0));
          const mimeType = data.audio.mimeType || '';
          
          if (mimeType.includes('L16') || mimeType.includes('pcm')) {
            // Convert raw PCM to WAV for browser playback
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);
            
            const writeString = (offset: number, str: string) => {
              for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
              }
            };
            
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + audioBytes.length, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
            view.setUint16(32, numChannels * bitsPerSample / 8, true);
            view.setUint16(34, bitsPerSample, true);
            writeString(36, 'data');
            view.setUint32(40, audioBytes.length, true);
            
            const wavBlob = new Blob([wavHeader, audioBytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);
            audioRef.current = new Audio(audioUrl);
          } else {
            const audioBlob = new Blob([audioBytes], { type: mimeType || 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioRef.current = new Audio(audioUrl);
          }
          
          audioRef.current.onended = () => setIsPlayingVoice(false);
          audioRef.current.play();
          setIsPlayingVoice(true);
        }
      } else {
        setBotOutput({ topic: label, text: response });
        setThinkingTopic(null);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setBotOutput({ topic: label, text: response });
      setThinkingTopic(null);
    }
  };

  const toggleVoice = () => {
    if (!audioRef.current) return;
    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col relative overflow-y-auto">
      
      {viewingLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-xl">
                 <div className="flex items-center gap-3">
                     <FileJson className="w-5 h-5 text-indigo-400" />
                     <div>
                         <h3 className="text-white font-bold">Calibration Log Ingestion</h3>
                         <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                             <Clock className="w-3 h-3" />
                             Timestamp: {new Date().toLocaleString()}
                         </div>
                     </div>
                 </div>
                 <button onClick={() => setViewingLog(false)} className="text-slate-500 hover:text-white" data-testid="button-close-log"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-4 bg-black overflow-y-auto flex-1 font-mono text-xs text-green-400/80 leading-relaxed border-b border-slate-800">
                  <pre>{ASSESSMENT_RAW_TEXT}</pre>
              </div>

              <div className="p-4 bg-slate-800 rounded-b-xl flex justify-between items-center">
                 <div className="text-xs text-slate-400">
                     Parsing Strategy: <span className="text-white">Lexical Trait Mapping (Manual)</span>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setViewingLog(false)} className="px-4 py-2 text-slate-300 hover:text-white text-sm" data-testid="button-cancel-log">Cancel</button>
                     <button 
                        onClick={loadAssessment}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        data-testid="button-apply-calibration"
                     >
                         <Activity className="w-4 h-4" /> Apply Calibration Profile
                     </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-pink-400" />
            Agent Personality & Identity
          </h2>
          <p className="text-slate-400">Real-time behavioral monitoring and system directives.</p>
        </div>
        
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
            <button 
                onClick={() => setActiveTab('behavior')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'behavior' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-behavior"
            >
                <Activity className="w-4 h-4" /> Behavioral Matrix
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'history' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-history"
            >
                <History className="w-4 h-4" /> View History
            </button>
            <button 
                onClick={() => setActiveTab('identity')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'identity' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
                data-testid="tab-identity"
            >
                <Fingerprint className="w-4 h-4" /> System Identity
            </button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setViewingLog(true)}
                className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 rounded-lg transition-colors flex items-center gap-2"
                title="View Assessment Log"
                data-testid="button-load-assessment"
            >
                <ClipboardCheck className="w-5 h-5" />
                <span className="text-xs font-bold hidden lg:inline">Load Assessment</span>
            </button>
            <button 
                onClick={resetDefaults}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset Defaults"
                data-testid="button-reset"
            >
                <RotateCcw className="w-5 h-5" />
            </button>
        </div>
      </div>

      {activeTab === 'behavior' && (
          <div className="space-y-6">
            
            <div className="relative">
                <BotAvatar scores={discScores} isThinking={!!thinkingTopic} sentiment={currentSentiment} />
                <div className="absolute top-4 right-4 flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Render ID</span>
                    <span className="text-xs font-mono text-indigo-400">CLAW-SRV-{Math.floor(Math.random()*9999)}</span>
                </div>
            </div>
            
            <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <PhoneCall className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Call Sentiment Monitor
                                {currentSentiment === 'hostile' && (
                                    <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> ALERT
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-slate-400">Real-time DISC behavioral assessment for security.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                            className={`p-2 rounded-lg transition-all ${
                                isPlayingVoice 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                            }`}
                            data-testid="button-toggle-voice"
                            title={isPlayingVoice ? 'Mute Voice' : 'Unmute Voice'}
                        >
                            {isPlayingVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => {
                                if (isCallActive) {
                                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                    }
                                }
                                setIsCallActive(!isCallActive);
                                if (!isCallActive) {
                                    setSentimentHistory([]);
                                    setConversationLines([]);
                                    setCurrentLineIndex(0);
                                    setCurrentSentiment('calm');
                                }
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                                isCallActive 
                                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            data-testid="button-toggle-call"
                        >
                            {isCallActive ? (
                                <><X className="w-4 h-4" /> End Call</>
                            ) : (
                                <><PhoneCall className="w-4 h-4" /> Start Call</>
                            )}
                        </button>
                    </div>
                </div>
                
                {(isCallActive || conversationLines.length > 0) && (
                    <div className="space-y-4">
                        <div 
                            ref={conversationRef}
                            className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4 max-h-64 overflow-y-auto space-y-3"
                        >
                            {conversationLines.length === 0 && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-sm">Connecting call...</span>
                                    </div>
                                </div>
                            )}
                            {conversationLines.map((line, idx) => (
                                <div 
                                    key={idx}
                                    className={`flex gap-3 ${line.speaker === 'ai' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        line.speaker === 'ai' 
                                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' 
                                            : 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                                    }`}>
                                        {line.speaker === 'ai' ? 'R' : 'M'}
                                    </div>
                                    <div className={`flex-1 ${line.speaker === 'ai' ? 'text-right' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1" style={{ justifyContent: line.speaker === 'ai' ? 'flex-end' : 'flex-start' }}>
                                            <span className={`text-xs font-bold ${line.speaker === 'ai' ? 'text-indigo-400' : 'text-amber-400'}`}>
                                                {line.name}
                                            </span>
                                            {idx === conversationLines.length - 1 && isSpeaking && (
                                                <div className="flex items-center gap-0.5">
                                                    <div className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                                    <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                                    <div className="w-1 h-2 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm text-slate-300 ${line.speaker === 'ai' ? 'bg-indigo-950/30 border-indigo-500/20' : 'bg-slate-800/50 border-slate-600/20'} rounded-lg px-3 py-2 inline-block border max-w-md`}>
                                            {line.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {sentimentHistory.length > 0 && (
                            <>
                                <div className="h-24">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sentimentHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                                            <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                formatter={(value: number) => {
                                                    const labels = { 20: 'Calm', 40: 'Engaged', 60: 'Alert', 80: 'Stressed', 100: 'Hostile' };
                                                    return [labels[value as keyof typeof labels] || value, 'Sentiment'];
                                                }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke={SENTIMENT_COLORS[currentSentiment].primary}
                                                strokeWidth={2}
                                                dot={{ fill: SENTIMENT_COLORS[currentSentiment].primary, strokeWidth: 0, r: 3 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-slate-400">Calm</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-slate-400">Engaged</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        <span className="text-slate-400">Alert</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        <span className="text-slate-400">Stressed</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-slate-400">Hostile</span>
                                    </div>
                                </div>
                            </>
                        )}
                        {currentSentiment === 'hostile' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <div>
                                    <p className="text-sm font-bold text-red-400">ROGUE BEHAVIOR DETECTED</p>
                                    <p className="text-xs text-red-300/80">Agent emotional state exceeds safety threshold. Consider manual intervention.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {!isCallActive && conversationLines.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <PhoneCall className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Click "Start Call" to hear a conversation between Michael and Robert (AI)</p>
                        <p className="text-xs text-slate-600 mt-1">Make sure your volume is on!</p>
                    </div>
                )}
            </div>

            <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="w-24 h-24 text-slate-400" />
                </div>
                
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" /> My Beliefs Window
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 ml-7">This is how I feel about everything?</p>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap gap-3">
                        {META_TOPICS.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => handleTopicClick(topic.id, topic.label)}
                                disabled={!!thinkingTopic}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait ${topic.color} ${thinkingTopic === topic.id ? 'bg-slate-800 scale-95 ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-500' : ''}`}
                                data-testid={`button-topic-${topic.id}`}
                            >
                                {thinkingTopic === topic.id ? '...' : `[ ${topic.label} ]`}
                            </button>
                        ))}
                    </div>

                    <div className="relative min-h-[100px] bg-black/50 rounded-lg border border-slate-700/50 p-4 font-mono text-sm shadow-inner">
                        {!botOutput && !thinkingTopic && (
                            <div className="flex items-center gap-2 text-slate-600 italic">
                                <Terminal className="w-4 h-4" />
                                <span>Awaiting query... Select a meta-trigger above.</span>
                            </div>
                        )}
                        
                        {thinkingTopic && (
                            <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                                <Sparkles className="w-4 h-4" />
                                <span>Processing neural pathways for topic: {thinkingTopic.toUpperCase()}...</span>
                            </div>
                        )}

                        {botOutput && (
                             <div>
                                <div className="text-[10px] uppercase text-slate-500 mb-1 flex justify-between items-center">
                                    <span>Query: {botOutput.topic}</span>
                                    <div className="flex items-center gap-3">
                                      {audioRef.current && (
                                        <button
                                          onClick={toggleVoice}
                                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${isPlayingVoice ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                                          data-testid="button-toggle-voice"
                                        >
                                          {isPlayingVoice ? <Volume2 className="w-3 h-3 animate-pulse" /> : <VolumeX className="w-3 h-3" />}
                                          <span>{isPlayingVoice ? 'Speaking...' : 'Replay'}</span>
                                        </button>
                                      )}
                                      <span>Confidence: {(0.9 + Math.random() * 0.09).toFixed(4)}</span>
                                    </div>
                                </div>
                                <div className="text-slate-200 leading-relaxed border-l-2 border-indigo-500 pl-3" data-testid="text-bot-output">
                                    "{botOutput.text}"
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <Brain className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">DISC Personality Matrix</h3>
                        <p className="text-xs text-slate-400">Determines tone, pacing, and assertiveness.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <DiscRadar scores={discScores} />
                    </div>
                    <div className="flex-1 space-y-5 justify-center flex flex-col">
                        {Object.entries(discScores).map(([key, value]) => (
                            <div key={key}>
                                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase mb-2">
                                    <span>{key}</span>
                                    <span className="text-pink-400">{value}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={value}
                                    onChange={(e) => handleDiscChange(key as keyof DiscScores, parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400"
                                    data-testid={`slider-disc-${key}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">ARCH Conversation Model</h3>
                        <p className="text-xs text-slate-400">Controls dialogue flow and structural priorities.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <ArchBreakdown data={archScores} />
                    </div>
                    <div className="flex-1 space-y-5 justify-center flex flex-col">
                        {[
                            { key: 'acknowledge', label: 'Acknowledge', color: 'accent-emerald-500' },
                            { key: 'reflect', label: 'Reflect', color: 'accent-blue-500' },
                            { key: 'context', label: 'Context', color: 'accent-amber-500' },
                            { key: 'handoff', label: 'Handoff', color: 'accent-red-500' }
                        ].map((item) => (
                            <div key={item.key}>
                                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase mb-2">
                                    <span>{item.label}</span>
                                    <span className="text-indigo-300">{archScores[item.key as keyof ArchProfile]}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={archScores[item.key as keyof ArchProfile]}
                                    onChange={(e) => handleArchChange(item.key as keyof ArchProfile, parseInt(e.target.value))}
                                    className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${item.color}`}
                                    data-testid={`slider-arch-${item.key}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                </div>

            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                    <h4 className="text-pink-400 font-bold mb-2 text-sm">Profile Summary</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                    Current configuration creates a <span className="text-white font-semibold">High-{discScores.dominance > 70 ? 'D' : discScores.conscientiousness > 90 ? 'C' : 'I'}</span> agent. 
                    It will prioritize {discScores.dominance > 70 ? 'efficiency and direct answers' : discScores.conscientiousness > 90 ? 'precision, facts, and logical structure' : 'building rapport'}. 
                    The communication style is structured, with {archScores.acknowledge > 60 ? 'strong active listening markers' : 'rapid exchanges'}.
                    </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                    <h4 className="text-indigo-400 font-bold mb-2 text-sm">ARCH Protocol</h4>
                    <ul className="text-slate-400 text-xs space-y-1">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> <strong>Acknowledge:</strong> Validate user input immediately.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <strong>Reflect:</strong> Demonstrate understanding via paraphrasing.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> <strong>Context:</strong> Add value or synthesized information.</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> <strong>Handoff:</strong> Guide user to next turn or action.</li>
                    </ul>
                </div>
            </div>
          </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <HistoryTabContent 
            discScores={discScores} 
            onMemoryFlash={() => setShowMemoryFlashConfirm(true)} 
          />
        </div>
      )}

      {/* Emergency Memory Flash Confirmation Modal */}
      {showMemoryFlashConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-500/50 max-w-md w-full shadow-2xl shadow-red-500/20">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Emergency Memory Flash</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                This will permanently delete the last <span className="font-bold text-white">24 hours</span> of agent memory and experiences. Use this to reverse any negative behavioral influences.
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-300">
                  <strong>Warning:</strong> All conversations, learnings, and context from the past 24 hours will be erased. The agent will revert to its previous behavioral state.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMemoryFlashConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition-colors"
                  data-testid="button-cancel-flash"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMemoryFlashConfirm(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                  data-testid="button-confirm-flash"
                >
                  <Trash2 className="w-4 h-4" /> Flash Memory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'identity' && (
          <div className="flex-1 grid grid-cols-12 gap-6">
              
              <div className="col-span-12 md:col-span-3 bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                      <h3 className="font-bold text-white text-sm">Saved Protocols</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {prompts.map(prompt => (
                          <div 
                            key={prompt.id} 
                            onClick={() => setSelectedPromptId(prompt.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                selectedPromptId === prompt.id 
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                            data-testid={`protocol-${prompt.id}`}
                          >
                              <div className="font-semibold text-sm truncate">{prompt.name}</div>
                              <div className="text-xs opacity-70 mt-1 truncate">{prompt.id} • {prompt.lastModified}</div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 border-t border-slate-700">
                      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors" data-testid="button-new-prompt">
                          <Plus className="w-3 h-3" /> New System Prompt
                      </button>
                  </div>
              </div>

              <div className="col-span-12 md:col-span-9 space-y-6">
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-start">
                     <div>
                         <h3 className="text-xl font-bold text-white">{activePrompt.name}</h3>
                         <p className="text-sm text-slate-400 mt-1">{activePrompt.description}</p>
                     </div>
                     <div className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-md text-xs font-mono border border-indigo-500/30">
                         ID: {activePrompt.id}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="space-y-6">
                          
                          <div className="bg-slate-800 rounded-xl border border-purple-500/30 overflow-hidden group hover:border-purple-500/60 transition-colors">
                             <div className="bg-purple-900/20 p-3 border-b border-purple-500/20 flex items-center gap-2">
                                 <Fingerprint className="w-4 h-4 text-purple-400" />
                                 <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Owner Identity</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                    value={activePrompt.sections.ownerIdentity}
                                    onChange={(e) => handlePromptChange('ownerIdentity', e.target.value)}
                                    placeholder="Define who the owner is..."
                                    data-testid="textarea-owner-identity"
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-pink-500/30 overflow-hidden group hover:border-pink-500/60 transition-colors">
                             <div className="bg-pink-900/20 p-3 border-b border-pink-500/20 flex items-center gap-2">
                                 <Heart className="w-4 h-4 text-pink-400" />
                                 <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">Statement of Loyalty</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
                                    value={activePrompt.sections.loyaltyStatement}
                                    onChange={(e) => handlePromptChange('loyaltyStatement', e.target.value)}
                                    placeholder="Define the agent's loyalty..."
                                    data-testid="textarea-loyalty"
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-amber-500/30 overflow-hidden group hover:border-amber-500/60 transition-colors">
                             <div className="bg-amber-900/20 p-3 border-b border-amber-500/20 flex items-center gap-2">
                                 <PenTool className="w-4 h-4 text-amber-400" />
                                 <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Owner Priorities</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                                    value={activePrompt.sections.ownerPriorities}
                                    onChange={(e) => handlePromptChange('ownerPriorities', e.target.value)}
                                    placeholder="What is important to the owner?"
                                    data-testid="textarea-priorities"
                                 />
                             </div>
                          </div>

                      </div>

                      <div className="space-y-6">

                          <div className="bg-slate-800 rounded-xl border border-blue-500/30 overflow-hidden group hover:border-blue-500/60 transition-colors">
                             <div className="bg-blue-900/20 p-3 border-b border-blue-500/20 flex items-center gap-2">
                                 <Database className="w-4 h-4 text-blue-400" />
                                 <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Data Protection Mantra</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    value={activePrompt.sections.dataProtectionMantra}
                                    onChange={(e) => handlePromptChange('dataProtectionMantra', e.target.value)}
                                    placeholder="Rules for handling data..."
                                    data-testid="textarea-data-protection"
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-emerald-500/30 overflow-hidden group hover:border-emerald-500/60 transition-colors">
                             <div className="bg-emerald-900/20 p-3 border-b border-emerald-500/20 flex items-center gap-2">
                                 <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                 <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Systems Security Statement</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                    value={activePrompt.sections.securityStatement}
                                    onChange={(e) => handlePromptChange('securityStatement', e.target.value)}
                                    placeholder="Security protocols..."
                                    data-testid="textarea-security"
                                 />
                             </div>
                          </div>

                          <div className="bg-slate-800 rounded-xl border border-red-500/30 overflow-hidden group hover:border-red-500/60 transition-colors">
                             <div className="bg-red-900/20 p-3 border-b border-red-500/20 flex items-center gap-2">
                                 <Activity className="w-4 h-4 text-red-400" />
                                 <span className="text-xs font-bold text-red-300 uppercase tracking-wider">DISC Reinforcement</span>
                             </div>
                             <div className="p-4">
                                 <textarea 
                                    className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                                    value={activePrompt.sections.discReinforcement}
                                    onChange={(e) => handlePromptChange('discReinforcement', e.target.value)}
                                    placeholder="Narrative reinforcement of the chosen DISC profile..."
                                    data-testid="textarea-disc-reinforcement"
                                 />
                             </div>
                          </div>

                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
