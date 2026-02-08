import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Send, Bot, User, Loader2, Volume2, MessageCircle,
  Coffee, Briefcase, FlaskConical, GraduationCap, Phone,
  Globe, Users, Zap, BarChart3,
} from 'lucide-react';
import type { Agent } from '@shared/schema';

import avatar1 from '@assets/freepik__melissa-model-as-a-superhuman-metal-android-smooth__8_1770156432895.png';
import avatar2 from '@assets/freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941.png';
import avatar3 from '@assets/freepik__generate-9-different-angles-of-this-image-back-vie__8_1770156725733.png';
import avatar4 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735.png';
import avatar5 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736.png';

const AVATAR_MAP: Record<string, string> = { avatar1, avatar2, avatar3, avatar4, avatar5 };

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_COMMANDS = [
  { label: 'Site Stats', prompt: 'Give me a summary of all generated websites - how many sites, total visitors, total messages, and which sites have the most activity.', icon: Globe },
  { label: 'Lead Report', prompt: 'Show me a lead conversion report. How many total leads do we have, how many have been contacted, how many converted, and what is our conversion rate?', icon: BarChart3 },
  { label: 'Customer Overview', prompt: 'Give me an overview of our customer base. How many customers do we have, what statuses are they in, and who are the most recent ones?', icon: Users },
  { label: 'Pipeline Status', prompt: 'What is the current status of our VoiceLeadMachine pipeline? How many campaigns have been run, how many calls made, and what are the results?', icon: Zap },
];

export default function CommandChat() {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const activeAgents = agents.filter(a => a.status === 'active');

  useEffect(() => {
    if (activeAgents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(activeAgents[0].id);
    }
  }, [activeAgents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const avatarSrc = selectedAgent ? (AVATAR_MAP[selectedAgent.avatarId || 'avatar1'] || avatar1) : avatar1;

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/admin/command-chat', {
        agentId: selectedAgentId,
        message,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || 'I had trouble responding. Please try again.',
        timestamp: new Date(),
      }]);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || chatMutation.isPending || !selectedAgentId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    chatMutation.mutate(messageText);
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    setMessages([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [, setLocation] = useLocation();
  const navigateToTool = (tool: string) => {
    if (selectedAgentId) {
      setLocation(`/agent/${selectedAgentId}/${tool}`);
    }
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-800 bg-slate-900/80 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-indigo-400" />
              <div>
                <h1 className="text-lg font-bold text-white" data-testid="text-command-chat-title">Command Chat</h1>
                <p className="text-xs text-slate-400">Control your agents and manage business operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedAgentId} onValueChange={handleAgentChange}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white" data-testid="select-command-agent">
                  <SelectValue placeholder="Select Agent" />
                </SelectTrigger>
                <SelectContent>
                  {activeAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => navigateToTool('vibe')} title="The Vibe" data-testid="button-goto-vibe">
                    <Coffee className="w-4 h-4 text-purple-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigateToTool('office')} title="The Office" data-testid="button-goto-office">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigateToTool('lab')} title="The Lab" data-testid="button-goto-lab">
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigateToTool('classroom')} title="The Classroom" data-testid="button-goto-classroom">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigateToTool('telephony')} title="Telephony" data-testid="button-goto-telephony">
                    <Phone className="w-4 h-4 text-cyan-400" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && selectedAgent && (
            <div className="text-center py-8" data-testid="empty-command-state">
              <img
                src={avatarSrc}
                alt={selectedAgent.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-indigo-500/30 mx-auto mb-4"
              />
              <h2 className="text-xl font-bold text-white mb-1" data-testid="text-agent-greeting">
                {selectedAgent.name} is ready
              </h2>
              <p className="text-slate-400 text-sm mb-2">
                Ask about your business, manage sites & leads, or run operations
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-6">
                <Volume2 className="w-3 h-3" />
                <span>{selectedAgent.voiceName}</span>
                <span className="mx-1">|</span>
                <span className="text-pink-400">D:{selectedAgent.dominance}</span>
                <span className="text-yellow-400">I:{selectedAgent.influence}</span>
                <span className="text-green-400">S:{selectedAgent.steadiness}</span>
                <span className="text-blue-400">C:{selectedAgent.conscientiousness}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {QUICK_COMMANDS.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <Card
                      key={cmd.label}
                      className="bg-slate-800/50 border-slate-700 cursor-pointer hover-elevate"
                      onClick={() => handleSend(cmd.prompt)}
                      data-testid={`button-quick-${cmd.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardContent className="p-3 text-center">
                        <Icon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                        <p className="text-xs text-white font-medium">{cmd.label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {messages.length === 0 && !selectedAgent && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Active Agents</h2>
              <p className="text-slate-400">Create an agent from the Agent Dashboard first, then come back to command it.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-row-${index}`}
            >
              {message.role === 'assistant' && selectedAgent && (
                <img
                  src={avatarSrc}
                  alt={selectedAgent.name}
                  className="w-8 h-8 rounded-full object-cover border border-indigo-500/50 flex-shrink-0"
                />
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}
                data-testid={`bubble-${message.role}-${index}`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3" data-testid="typing-indicator">
              {selectedAgent && (
                <img
                  src={avatarSrc}
                  alt={selectedAgent.name}
                  className="w-8 h-8 rounded-full object-cover border border-indigo-500/50"
                />
              )}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/80 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={selectedAgent ? `Command ${selectedAgent.name}...` : 'Select an agent first...'}
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={chatMutation.isPending || !selectedAgentId}
            data-testid="input-command-message"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending || !selectedAgentId}
            className="bg-indigo-600 hover:bg-indigo-500"
            data-testid="button-send-command"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
