import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Brain, RotateCcw, Target, Users, Shield, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DISC_WORD_SETS, DISC_STYLE_DESCRIPTIONS, type DiscScores } from '@shared/schema';

type AssessmentMode = 'human' | 'agent';

const DISC_COLORS = {
  D: '#ec4899',
  I: '#facc15',
  S: '#10b981',
  C: '#3b82f6',
};

export default function DiscAssessment() {
  const [mode, setMode] = useState<AssessmentMode | null>(null);
  const [currentSet, setCurrentSet] = useState(0);
  const [rankings, setRankings] = useState<number[][]>(
    Array(24).fill(null).map(() => [0, 0, 0, 0])
  );
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<{
    scores: DiscScores;
    percentages: DiscScores;
    primaryStyle: string;
    secondaryStyle: string;
  } | null>(null);

  const currentWordSet = DISC_WORD_SETS[currentSet];

  const handleWordClick = (wordIndex: number) => {
    if (selectedOrder.includes(wordIndex)) {
      setSelectedOrder(selectedOrder.filter(i => i !== wordIndex));
    } else if (selectedOrder.length < 4) {
      setSelectedOrder([...selectedOrder, wordIndex]);
    }
  };

  const confirmRanking = () => {
    if (selectedOrder.length !== 4) return;
    
    const newRankings = [...rankings];
    newRankings[currentSet] = selectedOrder.map((_, idx) => 4 - idx);
    const reordered = [0, 0, 0, 0];
    selectedOrder.forEach((wordIdx, orderIdx) => {
      reordered[wordIdx] = 4 - orderIdx;
    });
    newRankings[currentSet] = reordered;
    setRankings(newRankings);
    
    if (currentSet < 23) {
      setCurrentSet(currentSet + 1);
      setSelectedOrder([]);
    } else {
      calculateResult(newRankings);
    }
  };

  const calculateResult = async (finalRankings: number[][]) => {
    try {
      const response = await fetch('/api/disc/calculate-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: finalRankings }),
      });
      const data = await response.json();
      setResult(data);
      setIsComplete(true);
    } catch (error) {
      console.error('Error calculating DISC:', error);
    }
  };

  const resetAssessment = () => {
    setCurrentSet(0);
    setRankings(Array(24).fill(null).map(() => [0, 0, 0, 0]));
    setSelectedOrder([]);
    setIsComplete(false);
    setResult(null);
    setMode(null);
  };

  const goBack = () => {
    if (currentSet > 0) {
      setCurrentSet(currentSet - 1);
      setSelectedOrder([]);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-yellow-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
            DISC Personality Assessment
          </h1>
          <p className="text-slate-400 mb-8">
            Discover your behavioral style. This assessment analyzes four dimensions: 
            Dominance, Influence, Steadiness, and Conscientiousness.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setMode('human')}
              className="p-8 bg-slate-900 border-2 border-slate-700 rounded-2xl hover:border-indigo-500 transition-all group"
              data-testid="button-mode-human"
            >
              <Users className="w-12 h-12 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">I'm a Human</h3>
              <p className="text-sm text-slate-400">Take the visual assessment to discover your DISC profile</p>
            </button>
            
            <button
              onClick={() => setMode('agent')}
              className="p-8 bg-slate-900 border-2 border-slate-700 rounded-2xl hover:border-emerald-500 transition-all group"
              data-testid="button-mode-agent"
            >
              <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">I'm an AI Agent</h3>
              <p className="text-sm text-slate-400">Get API documentation to integrate DISC assessment</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'agent') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setMode(null)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">DISC Assessment API</h1>
              <p className="text-slate-400">For Telegram, Discord, and other bot integrations</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-400" /> Get Questions
              </h2>
              <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <p className="text-emerald-400">GET /api/disc/questions</p>
                <p className="text-slate-500 mt-2"># Returns all 24 word sets</p>
                <p className="text-slate-500"># Each set has 4 words: [D, I, S, C]</p>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" /> Submit Rankings (Simple Format)
              </h2>
              <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <p className="text-emerald-400">POST /api/disc/calculate-simple</p>
                <p className="text-slate-500 mt-2"># Body:</p>
                <pre className="text-yellow-400 mt-1">{`{
  "responses": [
    [4, 3, 2, 1],  // Set 1: D=4, I=3, S=2, C=1
    [1, 4, 3, 2],  // Set 2: D=1, I=4, S=3, C=2
    // ... 24 total arrays
  ]
}`}</pre>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Response Format
              </h2>
              <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-cyan-400">{`{
  "scores": {
    "dominance": 65,
    "influence": 48,
    "steadiness": 72,
    "conscientiousness": 55
  },
  "percentages": {
    "dominance": 68,
    "influence": 50,
    "steadiness": 75,
    "conscientiousness": 57
  },
  "primaryStyle": "S",
  "secondaryStyle": "D",
  "styleDescriptions": {
    "D": "Direct, results-oriented, assertive",
    "I": "Social, enthusiastic, persuasive",
    "S": "Patient, cooperative, reliable",
    "C": "Analytical, precise, systematic"
  }
}`}</pre>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-2">Bot Integration Flow</h2>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Fetch questions from <code className="text-pink-400">/api/disc/questions</code></li>
                <li>Present each set to user (4 words each)</li>
                <li>User ranks words 1-4 (4 = most like them)</li>
                <li>Collect all 24 rankings as arrays</li>
                <li>POST to <code className="text-pink-400">/api/disc/calculate-simple</code></li>
                <li>Display results with primary/secondary style</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete && result) {
    const chartData = [
      { name: 'D', value: result.percentages.dominance, color: DISC_COLORS.D },
      { name: 'I', value: result.percentages.influence, color: DISC_COLORS.I },
      { name: 'S', value: result.percentages.steadiness, color: DISC_COLORS.S },
      { name: 'C', value: result.percentages.conscientiousness, color: DISC_COLORS.C },
    ];

    const radarData = [
      { trait: 'Dominance', value: result.percentages.dominance },
      { trait: 'Influence', value: result.percentages.influence },
      { trait: 'Steadiness', value: result.percentages.steadiness },
      { trait: 'Conscientiousness', value: result.percentages.conscientiousness },
    ];

    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Your DISC Profile</h1>
            <p className="text-slate-400">Assessment complete! Here's your personality breakdown.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Profile Breakdown</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" width={30} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Radar View</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="trait" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b' }} />
                    <Radar
                      name="DISC"
                      dataKey="value"
                      stroke="#818cf8"
                      fill="#818cf8"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Primary Style</p>
                <p className="text-4xl font-bold" style={{ color: DISC_COLORS[result.primaryStyle as keyof typeof DISC_COLORS] }}>
                  {result.primaryStyle}
                </p>
              </div>
              <div className="text-center p-4 bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Secondary Style</p>
                <p className="text-4xl font-bold" style={{ color: DISC_COLORS[result.secondaryStyle as keyof typeof DISC_COLORS] }}>
                  {result.secondaryStyle}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(DISC_STYLE_DESCRIPTIONS).map(([key, desc]) => (
                <div 
                  key={key}
                  className={`p-3 rounded-lg border ${
                    result.primaryStyle === key 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : result.secondaryStyle === key
                      ? 'border-slate-600 bg-slate-800'
                      : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: DISC_COLORS[key as keyof typeof DISC_COLORS] }}
                    >
                      {key}
                    </span>
                    <div>
                      <p className="font-medium">{key === 'D' ? 'Dominance' : key === 'I' ? 'Influence' : key === 'S' ? 'Steadiness' : 'Conscientiousness'}</p>
                      <p className="text-sm text-slate-400">{desc}</p>
                    </div>
                    <span className="ml-auto font-mono text-lg">
                      {result.percentages[key === 'D' ? 'dominance' : key === 'I' ? 'influence' : key === 'S' ? 'steadiness' : 'conscientiousness']}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={resetAssessment}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium flex items-center gap-2 mx-auto transition-colors"
              data-testid="button-retake"
            >
              <RotateCcw className="w-4 h-4" /> Take Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">Question {currentSet + 1} of 24</span>
            <span className="text-sm text-indigo-400 font-mono">{Math.round(((currentSet + 1) / 24) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 via-yellow-500 via-green-500 to-blue-500 transition-all duration-300"
              style={{ width: `${((currentSet + 1) / 24) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-bold mb-2 text-center">Rank these words</h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            Click in order from most like you to least like you
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {currentWordSet.words.map((word, index) => {
              const orderPosition = selectedOrder.indexOf(index);
              const isSelected = orderPosition !== -1;
              
              return (
                <button
                  key={index}
                  onClick={() => handleWordClick(index)}
                  className={`p-6 rounded-xl border-2 text-lg font-medium transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                  data-testid={`button-word-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{word}</span>
                    {isSelected && (
                      <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                        {orderPosition + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {selectedOrder.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your ranking:</p>
              <div className="flex gap-2">
                {selectedOrder.map((wordIndex, i) => (
                  <span key={i} className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-sm">
                    {4 - i}. {currentWordSet.words[wordIndex]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between gap-4">
          <button
            onClick={goBack}
            disabled={currentSet === 0}
            className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <button
            onClick={confirmRanking}
            disabled={selectedOrder.length !== 4}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-2 transition-all"
            data-testid="button-next"
          >
            {currentSet === 23 ? 'Complete' : 'Next'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
