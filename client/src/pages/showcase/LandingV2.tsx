import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, Clock, MessageSquare, Zap, Lock, Mic } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

type Step = 'input' | 'submitting' | 'success';

interface PersonalityOption {
  id: string;
  name: string;
  description: string;
}

const PERSONALITY_OPTIONS: PersonalityOption[] = [
  { id: 'analyst', name: 'Analyst', description: 'Detailed & precise' },
  { id: 'strategist', name: 'Strategist', description: 'Big-picture & creative' },
];

export default function LandingV2() {
  const [step, setStep] = useState<Step>('input');
  const [task, setTask] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);

  const submitTask = useMutation({
    mutationFn: async (data: { task: string; phone: string; name: string; personality: string }) => {
      const response = await apiRequest('POST', '/api/tasks/submit', {
        ...data,
        agentName: 'AI Assistant',
        personality: {
          id: data.personality,
          name: data.personality === 'analyst' ? 'The Analyst' : 'The Strategist',
          description: data.personality === 'analyst' ? 'Detailed & precise' : 'Big-picture & creative',
          disc: data.personality === 'analyst' 
            ? { dominance: 40, influence: 30, steadiness: 50, conscientiousness: 80 }
            : { dominance: 60, influence: 70, steadiness: 40, conscientiousness: 50 }
        }
      });
      return response.json();
    },
    onSuccess: () => {
      setStep('success');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim() && phone.trim() && name.trim() && selectedPersonality) {
      setStep('submitting');
      submitTask.mutate({ task, phone, name, personality: selectedPersonality });
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const isFormValid = task.trim() && phone.trim() && name.trim() && selectedPersonality;

  return (
    <div className="min-h-screen bg-surface-white text-text-primary flex flex-col">
      <nav className="border-b border-slate-100 bg-surface-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-text-primary font-bold text-lg">Gateway Global AI</span>
          <div className="flex items-center gap-3">
            <Link href="/kimi-audio">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-brand-pink hover:bg-brand-pink/5" data-testid="link-voice-ai-v2">
                <Mic className="w-4 h-4 mr-2" />
                Voice AI
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-slate-200 text-text-primary hover:bg-slate-50" data-testid="link-admin-login-v2">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface-white rounded-2xl p-8 md:p-10 border border-slate-100 shadow-xl shadow-slate-200/20">
            
            {step === 'input' && (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-pink rounded-2xl shadow-lg shadow-brand-pink/20 mb-5">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-text-primary mb-3">Give your AI a task</h1>
                  <p className="text-lg text-text-secondary">
                    It'll finish it in <span className="font-semibold text-brand-pink">24 hours</span>. No app needed.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      What should we call you?
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full px-4 py-3.5 bg-surface-muted border-slate-200 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:ring-2 focus:ring-brand-pink/10 focus:border-brand-pink/30"
                      data-testid="input-name-v2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      What do you need done?
                    </label>
                    <Textarea
                      rows={3}
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      placeholder="e.g., 'Research the best CRM tools for small businesses and summarize the top 3...'"
                      className="w-full px-4 py-3.5 bg-surface-muted border-slate-200 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:ring-2 focus:ring-brand-pink/10 focus:border-brand-pink/30 resize-none"
                      data-testid="input-task-v2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Phone number for SMS updates
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3.5 bg-surface-muted border-slate-200 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:ring-2 focus:ring-brand-pink/10 focus:border-brand-pink/30"
                      data-testid="input-phone-v2"
                    />
                    <p className="mt-2 text-sm text-text-secondary flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                      No app download. We'll text you progress & results.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-3">
                      Choose your AI's working style
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {PERSONALITY_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedPersonality(option.id)}
                          className={`border rounded-xl p-4 text-center transition-all duration-200 ${
                            selectedPersonality === option.id
                              ? 'border-brand-pink bg-brand-pink/5 ring-1 ring-brand-pink'
                              : 'border-slate-100 bg-surface-white hover:bg-slate-50'
                          }`}
                          data-testid={`personality-${option.id}-v2`}
                        >
                          <div className={`font-medium ${selectedPersonality === option.id ? 'text-brand-pink' : 'text-text-primary'}`}>{option.name}</div>
                          <div className="text-xs text-text-secondary mt-1">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!isFormValid}
                    className="btn-primary w-full py-6 text-lg"
                    data-testid="button-submit-task-v2"
                  >
                    Give This Task to My AI
                  </Button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-500">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-text-primary text-sm">24-Hour Trial</h3>
                      <p className="text-xs text-text-secondary">Completely free</p>
                    </div>
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-text-primary text-sm">Task Completed</h3>
                      <p className="text-xs text-text-secondary">Results delivered</p>
                    </div>
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-pink/5 text-brand-pink">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-text-primary text-sm">SMS Updates</h3>
                      <p className="text-xs text-text-secondary">No app needed</p>
                    </div>
                  </div>
                  
                  <p className="text-center mt-8 text-sm text-text-secondary flex items-center justify-center">
                    <Lock className="w-4 h-4 mr-1.5 text-slate-400" />
                    No credit card required • Your first task is on us
                  </p>
                </div>
              </>
            )}

            {step === 'submitting' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-brand-pink animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-text-primary mb-2">Submitting Your Task...</h2>
                <p className="text-text-secondary">Setting up your AI assistant</p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-3">Task Submitted!</h2>
                <p className="text-text-secondary mb-6">Check Your Phone</p>
                
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm">
                  <p className="font-medium">Perfect! We've received your task.</p>
                  <p className="mt-1">
                    You'll get a text confirmation in <span className="font-semibold">60 seconds</span>. 
                    We'll message you with updates and the final result within 24 hours.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setStep('input');
                    setTask('');
                    setPhone('');
                    setName('');
                    setSelectedPersonality(null);
                  }}
                  variant="outline"
                  className="mt-6 border-slate-200 text-text-primary hover:bg-slate-50"
                  data-testid="button-new-task-v2"
                >
                  Submit Another Task
                </Button>
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-text-secondary">
            <Link href="/" className="hover:text-brand-pink transition-colors">
              View original design →
            </Link>
          </p>
        </div>
      </div>
    </div>

            {step === 'submitting' && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitting Your Task...</h2>
                <p className="text-gray-600">Setting up your AI assistant</p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Task Submitted!</h2>
                <p className="text-gray-600 mb-6">Check Your Phone</p>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
                  <p className="font-medium">Perfect! We've received your task.</p>
                  <p className="mt-1">
                    You'll get a text confirmation in <span className="font-semibold">60 seconds</span>. 
                    We'll message you with updates and the final result within 24 hours.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setStep('input');
                    setTask('');
                    setPhone('');
                    setName('');
                    setSelectedPersonality(null);
                  }}
                  variant="outline"
                  className="mt-6 border-gray-200"
                  data-testid="button-new-task-v2"
                >
                  Submit Another Task
                </Button>
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              View original design →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
