import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Sparkles, MessageSquare, Clock, ArrowRight, Target, Users, Shield, Search, Mic, type LucideIcon } from 'lucide-react';
import headerLogo from '@assets/Pidea_logo_header_(7)_1770381083770.png';
import { apiRequest } from '@/lib/queryClient';

type Step = 'input' | 'personality' | 'submitting' | 'success';

interface PersonalityOption {
  id: string;
  name: string;
  description: string;
  icon: 'target' | 'users' | 'shield' | 'search';
  disc: { dominance: number; influence: number; steadiness: number; conscientiousness: number };
}

const ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  users: Users,
  shield: Shield,
  search: Search,
};

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'achiever',
    name: 'The Achiever',
    description: 'Direct, results-focused, gets things done fast',
    icon: 'target',
    disc: { dominance: 80, influence: 40, steadiness: 30, conscientiousness: 50 },
  },
  {
    id: 'collaborator',
    name: 'The Collaborator',
    description: 'Friendly, enthusiastic, keeps you engaged',
    icon: 'users',
    disc: { dominance: 40, influence: 80, steadiness: 50, conscientiousness: 30 },
  },
  {
    id: 'supporter',
    name: 'The Supporter',
    description: 'Patient, reliable, thorough updates',
    icon: 'shield',
    disc: { dominance: 30, influence: 50, steadiness: 80, conscientiousness: 40 },
  },
  {
    id: 'analyst',
    name: 'The Analyst',
    description: 'Precise, detailed, quality-focused',
    icon: 'search',
    disc: { dominance: 40, influence: 30, steadiness: 50, conscientiousness: 80 },
  },
];

export default function MvpLanding() {
  const [step, setStep] = useState<Step>('input');
  const [task, setTask] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityOption | null>(null);
  const [agentName, setAgentName] = useState('');

  const submitTask = useMutation({
    mutationFn: async (data: { task: string; phone: string; name: string; personality: PersonalityOption; agentName: string }) => {
      const response = await apiRequest('POST', '/api/tasks/submit', data);
      return response.json();
    },
    onSuccess: () => {
      setStep('success');
    },
  });

  const handleContinue = () => {
    if (task.trim() && phone.trim() && name.trim()) {
      setStep('personality');
    }
  };

  const handleSubmit = () => {
    if (selectedPersonality && agentName.trim()) {
      setStep('submitting');
      submitTask.mutate({
        task,
        phone,
        name,
        personality: selectedPersonality,
        agentName,
      });
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <div className="min-h-screen bg-surface-white text-text-primary">
      <nav className="relative z-20 border-b border-slate-100 bg-surface-white/80 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <img src={headerLogo} alt="Gateway Global AI Biz Bot" className="h-16 object-contain" data-testid="img-header-logo" />
          <div className="flex items-center gap-3">
            <Link href="/kimi-audio">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-brand-pink hover:bg-brand-pink/5" data-testid="link-voice-ai">
                <Mic className="w-4 h-4 mr-2" />
                Voice AI
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-slate-200 text-text-primary hover:bg-slate-50" data-testid="link-admin-login">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary">
            Gateway Global AI
          </h1>
          <p className="text-xl text-text-secondary max-w-lg mx-auto">
            Give your AI a task. It'll finish it in 24 hours. No app needed.
          </p>
        </div>

        {/* Step 1: Task + Phone Input */}
        {step === 'input' && (
          <Card className="card-clean">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Your Name
                  </label>
                  <Input
                    data-testid="input-name"
                    placeholder="What should we call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-surface-muted border-slate-200 text-text-primary placeholder:text-text-secondary/50 h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    What do you need done?
                  </label>
                  <Textarea
                    data-testid="input-task"
                    placeholder="e.g., Research the best CRM tools for small businesses..."
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    className="bg-surface-muted border-slate-200 text-text-primary placeholder:text-text-secondary/50 min-h-[120px] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Phone Number (for SMS updates)
                  </label>
                  <Input
                    data-testid="input-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="bg-surface-muted border-slate-200 text-text-primary placeholder:text-text-secondary/50 h-12"
                  />
                </div>
              </div>

              <Button
                data-testid="button-continue"
                onClick={handleContinue}
                disabled={!task.trim() || !phone.trim() || !name.trim()}
                className="btn-primary w-full h-12 text-lg"
              >
                Choose Your AI's Personality
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Personality Selection */}
        {step === 'personality' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-2">Name Your AI Agent</h2>
              <Input
                data-testid="input-agent-name"
                placeholder="e.g., Alex, Jordan, Sam..."
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="max-w-xs mx-auto bg-surface-muted border-slate-200 text-text-primary placeholder:text-text-secondary/50 h-12 text-center text-lg"
              />
            </div>

            <h2 className="text-2xl font-bold text-text-primary text-center">Choose Their Personality</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSONALITY_OPTIONS.map((p) => (
                <Card
                  key={p.id}
                  data-testid={`card-personality-${p.id}`}
                  className={`cursor-pointer transition-all border border-slate-100 ${
                    selectedPersonality?.id === p.id
                      ? 'bg-brand-pink/5 border-brand-pink ring-1 ring-brand-pink'
                      : 'bg-surface-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedPersonality(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const IconComponent = ICON_MAP[p.icon];
                        return <IconComponent className={`h-8 w-8 flex-shrink-0 ${selectedPersonality?.id === p.id ? 'text-brand-pink' : 'text-slate-400'}`} />;
                      })()}
                      <div>
                        <h3 className={`font-semibold ${selectedPersonality?.id === p.id ? 'text-brand-pink' : 'text-text-primary'}`}>{p.name}</h3>
                        <p className="text-sm text-text-secondary">{p.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                data-testid="button-back"
                variant="outline"
                onClick={() => setStep('input')}
                className="flex-1 h-12 border-slate-200 text-text-secondary hover:bg-slate-50"
              >
                Back
              </Button>
              <Button
                data-testid="button-submit"
                onClick={handleSubmit}
                disabled={!selectedPersonality || !agentName.trim()}
                className="btn-primary flex-1 h-12 text-lg"
              >
                Start My 24-Hour Trial
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === 'submitting' && (
          <Card className="card-clean">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto text-brand-pink animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">Setting Up Your AI...</h2>
              <p className="text-text-secondary">
                {agentName} is getting ready to work on your task
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <Card className="card-clean">
            <CardContent className="p-8 text-center space-y-6">
              <div className="relative">
                <CheckCircle2 className="h-20 w-20 mx-auto text-emerald-500" />
                <div className="absolute inset-0 h-20 w-20 mx-auto bg-emerald-500/10 rounded-full blur-xl" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">You're All Set!</h2>
                <p className="text-text-secondary mb-4">
                  {agentName} is starting on your task right now.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 text-left space-y-4 border border-slate-100">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand-pink" />
                  What happens next:
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <Clock className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-text-secondary">
                      <span className="text-text-primary font-medium">Within 60 seconds:</span> {agentName} will text you confirming they got your task
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-text-secondary">
                      <span className="text-text-primary font-medium">Every few hours:</span> Progress updates via SMS
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-text-secondary">
                      <span className="text-text-primary font-medium">Within 24 hours:</span> Task completed with full results
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-text-secondary">
                Check your phone at <span className="text-text-primary font-medium">{phone}</span> for updates
              </p>

              <div className="flex justify-center">
                <Link href="/kimi-audio">
                  <Button
                    data-testid="button-try-voice"
                    className="btn-primary"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Try Voice AI
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        {step === 'input' && (
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-brand-pink/5 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-brand-pink" />
              </div>
              <h3 className="font-medium text-text-primary text-sm">SMS Updates</h3>
              <p className="text-xs text-text-secondary mt-1">No app needed</p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-medium text-text-primary text-sm">24-Hour Trial</h3>
              <p className="text-xs text-text-secondary mt-1">Completely free</p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-medium text-text-primary text-sm">Task Completed</h3>
              <p className="text-xs text-text-secondary mt-1">Results delivered</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
