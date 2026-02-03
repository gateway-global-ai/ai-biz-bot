import { useState, useRef } from 'react';
import { Play, Pause, Volume2, Loader2, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SCENARIOS = [
  { id: 'intro', label: 'Introduction', prompt: 'a friendly introduction and offering to help with questions' },
  { id: 'support', label: 'Customer Support', prompt: 'helping a customer who is frustrated with a product issue' },
  { id: 'sales', label: 'Sales Pitch', prompt: 'presenting the benefits of upgrading to a premium plan' },
  { id: 'scheduling', label: 'Appointment Scheduling', prompt: 'helping schedule an appointment while being efficient with time' },
  { id: 'followup', label: 'Follow-up Call', prompt: 'following up on a previous conversation to check in on progress' },
];

const VOICES = [
  { id: 'Kore', name: 'Kore', description: 'Warm and professional' },
  { id: 'Puck', name: 'Puck', description: 'Friendly and upbeat' },
  { id: 'Charon', name: 'Charon', description: 'Deep and authoritative' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Calm and reassuring' },
  { id: 'Aoede', name: 'Aoede', description: 'Clear and articulate' },
  { id: 'Leda', name: 'Leda', description: 'Soft and gentle' },
];

export default function MockConversation() {
  const [agentName, setAgentName] = useState('NEXUS');
  const [scenario, setScenario] = useState('intro');
  const [voice, setVoice] = useState('Kore');
  const [discProfile, setDiscProfile] = useState({
    dominance: 50,
    influence: 70,
    steadiness: 60,
    conscientiousness: 55,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationText, setConversationText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setConversationText(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);

    try {
      const selectedScenario = SCENARIOS.find(s => s.id === scenario);
      
      const response = await fetch('/api/conversation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          discProfile,
          scenario: selectedScenario?.prompt,
          voice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate conversation');
      }

      const data = await response.json();
      setConversationText(data.text);

      if (data.audio?.data) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio.data), c => c.charCodeAt(0))],
          { type: data.audio.mimeType || 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const updateDisc = (key: keyof typeof discProfile, value: number[]) => {
    setDiscProfile(prev => ({ ...prev, [key]: value[0] }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="w-10 h-10 text-indigo-400" />
            <h1 className="text-3xl font-bold">Mock Conversation</h1>
          </div>
          <p className="text-slate-400">Generate AI-powered conversations with Gemini TTS</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  className="bg-slate-800 border-slate-600"
                  data-testid="input-agent-name"
                />
              </div>

              <div>
                <Label>Scenario</Label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Voice</Label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-voice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - {v.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">DISC Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-pink-400">Dominance</span>
                  <span>{discProfile.dominance}%</span>
                </div>
                <Slider
                  value={[discProfile.dominance]}
                  onValueChange={(v) => updateDisc('dominance', v)}
                  max={100}
                  className="[&>span]:bg-pink-500"
                  data-testid="slider-dominance"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-yellow-400">Influence</span>
                  <span>{discProfile.influence}%</span>
                </div>
                <Slider
                  value={[discProfile.influence]}
                  onValueChange={(v) => updateDisc('influence', v)}
                  max={100}
                  className="[&>span]:bg-yellow-500"
                  data-testid="slider-influence"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-400">Steadiness</span>
                  <span>{discProfile.steadiness}%</span>
                </div>
                <Slider
                  value={[discProfile.steadiness]}
                  onValueChange={(v) => updateDisc('steadiness', v)}
                  max={100}
                  className="[&>span]:bg-emerald-500"
                  data-testid="slider-steadiness"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-blue-400">Conscientiousness</span>
                  <span>{discProfile.conscientiousness}%</span>
                </div>
                <Slider
                  value={[discProfile.conscientiousness]}
                  onValueChange={(v) => updateDisc('conscientiousness', v)}
                  max={100}
                  className="[&>span]:bg-blue-500"
                  data-testid="slider-conscientiousness"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 border-slate-700 mb-6">
          <CardContent className="p-6">
            <div className="flex justify-center mb-6">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                data-testid="button-generate"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Generate Conversation
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="text-red-400 text-center mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                {error}
              </div>
            )}

            {conversationText && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold">{agentName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-indigo-400 mb-1">{agentName}</p>
                      <p className="text-slate-300">{conversationText}</p>
                    </div>
                  </div>
                </div>

                {audioRef.current && (
                  <div className="flex justify-center">
                    <Button
                      onClick={togglePlay}
                      variant="outline"
                      size="lg"
                      className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                      data-testid="button-play"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Pause Audio
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-5 h-5 mr-2" />
                          Play Audio
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
