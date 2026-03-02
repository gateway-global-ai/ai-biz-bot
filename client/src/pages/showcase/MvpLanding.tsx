import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, MessageSquare, Clock, ArrowRight, Target, Users, Shield, Search, Mic, Phone, Compass, type LucideIcon } from 'lucide-react';
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
  const [callCoordinates, setCallCoordinates] = useState<string | null>(null);

  const submitTask = useMutation({
    mutationFn: async (data: { task: string; phone: string; name: string; personality: PersonalityOption; agentName: string }) => {
      const response = await apiRequest('POST', '/api/tasks/submit', data);
      return response.json();
    },
    onSuccess: (data) => {
      setCallCoordinates(data.callCoordinates ?? null);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <nav className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <img src={headerLogo} alt="Gateway Global AI Biz Bot" className="h-16 object-contain" data-testid="img-header-logo" />
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="link-voice-ai">
                <Mic className="w-4 h-4 mr-2" />
                Voice AI
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" data-testid="link-admin-login">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Gateway Global AI
          </h1>
          <p className="text-xl text-purple-200/80 max-w-lg mx-auto">
            Give your AI a task. It'll finish it in 24 hours. No app needed.
          </p>
        </div>

        {/* Step 1: Task + Phone Input */}
        {step === 'input' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Your Name
                  </label>
                  <Input
                    data-testid="input-name"
                    placeholder="What should we call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    What do you need done?
                  </label>
                  <Textarea
                    data-testid="input-task"
                    placeholder="e.g., Research the best CRM tools for small businesses..."
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[120px] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Phone Number (for SMS updates)
                  </label>
                  <Input
                    data-testid="input-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                  />
                </div>
              </div>

              <Button
                data-testid="button-continue"
                onClick={handleContinue}
                disabled={!task.trim() || !phone.trim() || !name.trim()}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-semibold"
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
              <h2 className="text-2xl font-bold text-white mb-2">Name Your AI Agent</h2>
              <Input
                data-testid="input-agent-name"
                placeholder="e.g., Alex, Jordan, Sam..."
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="max-w-xs mx-auto bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-center text-lg"
              />
            </div>

            <h2 className="text-2xl font-bold text-white text-center">Choose Their Personality</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSONALITY_OPTIONS.map((p) => (
                <Card
                  key={p.id}
                  data-testid={`card-personality-${p.id}`}
                  className={`cursor-pointer transition-all ${
                    selectedPersonality?.id === p.id
                      ? 'bg-purple-600/40 border-purple-400 ring-2 ring-purple-400'
                      : 'bg-white/10 border-white/20 hover-elevate'
                  }`}
                  onClick={() => setSelectedPersonality(p)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const IconComponent = ICON_MAP[p.icon];
                        return <IconComponent className="h-8 w-8 text-purple-400 flex-shrink-0" />;
                      })()}
                      <div>
                        <h3 className="font-semibold text-white">{p.name}</h3>
                        <p className="text-sm text-purple-200/70">{p.description}</p>
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
                className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                data-testid="button-submit"
                onClick={handleSubmit}
                disabled={!selectedPersonality || !agentName.trim()}
                className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-semibold"
              >
                Start My 24-Hour Trial
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === 'submitting' && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto text-purple-400 animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Setting Up Your AI...</h2>
              <p className="text-purple-200/70">
                {agentName} is getting ready to work on your task
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: UNLOCKED — Navigator Success */}
        {step === 'success' && (
          <AnimatePresence>
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', damping: 18 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 overflow-hidden">
                <CardContent className="p-8 text-center space-y-6">
                  {/* Navigator visual — animated compass with glow rings */}
                  <div className="relative flex items-center justify-center">
                    {/* Outer glow ring */}
                    <motion.div
                      className="absolute w-40 h-40 rounded-full border-2 border-purple-400/30"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Mid glow ring */}
                    <motion.div
                      className="absolute w-28 h-28 rounded-full border-2 border-blue-400/40"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                    />
                    {/* Compass icon */}
                    <motion.div
                      className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/50"
                      initial={{ rotate: -45, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200 }}
                    >
                      <Compass className="h-10 w-10 text-white" />
                    </motion.div>
                  </div>

                  {/* UNLOCKED badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-1"
                  >
                    <p className="text-xs font-bold tracking-[0.3em] text-purple-400 uppercase">Navigator</p>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">UNLOCKED</h2>
                    <p className="text-purple-200/80 text-sm">
                      {agentName} is online and already working on your task.
                    </p>
                  </motion.div>

                  {/* Call Coordinates */}
                  {callCoordinates && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 }}
                      className="bg-black/40 rounded-xl p-5 text-left border border-purple-500/30"
                      data-testid="call-coordinates-panel"
                    >
                      <p className="text-xs font-bold tracking-[0.2em] text-purple-400 uppercase mb-3 flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Your Call Coordinates
                      </p>
                      <p className="text-2xl font-mono font-bold text-white tracking-widest mb-1">
                        {callCoordinates}
                      </p>
                      <p className="text-xs text-purple-200/60">
                        Call or text this number anytime to speak with {agentName} live.
                      </p>
                    </motion.div>
                  )}

                  {/* What happens next */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="bg-black/30 rounded-xl p-5 text-left space-y-3"
                  >
                    <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-purple-400" />
                      What happens next:
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-3">
                        <Clock className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-purple-200/80">
                          <span className="text-white font-medium">Right now:</span> {agentName} just texted you your Call Coordinates at <span className="text-white font-medium">{phone}</span>
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Clock className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-purple-200/80">
                          <span className="text-white font-medium">Every few hours:</span> Progress updates via SMS
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-purple-200/80">
                          <span className="text-white font-medium">Within 24 hours:</span> Task completed with full results
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex justify-center"
                  >
                    <Link href="/">
                      <Button
                        data-testid="button-try-voice"
                        className="bg-purple-600 hover:bg-purple-500 text-white"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Try Voice AI
                      </Button>
                    </Link>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Features */}
        {step === 'input' && (
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-medium text-white text-sm">SMS Updates</h3>
              <p className="text-xs text-purple-200/60 mt-1">No app needed</p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium text-white text-sm">24-Hour Trial</h3>
              <p className="text-xs text-purple-200/60 mt-1">Completely free</p>
            </div>
            <div>
              <div className="h-12 w-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-medium text-white text-sm">Task Completed</h3>
              <p className="text-xs text-purple-200/60 mt-1">Results delivered</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
