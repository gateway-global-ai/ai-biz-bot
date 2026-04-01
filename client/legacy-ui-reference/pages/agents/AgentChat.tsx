import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Volume2, Share2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Agent } from '@shared/schema';

import avatar1 from '@assets/freepik__melissa-model-as-a-superhuman-metal-android-smooth__8_1770156432895.png';
import avatar2 from '@assets/freepik__melissa-model-turned-into-a-futuristic-ai-robot-wi__8_1770156535941.png';
import avatar3 from '@assets/freepik__generate-9-different-angles-of-this-image-back-vie__8_1770156725733.png';
import avatar4 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725735.png';
import avatar5 from '@assets/freepik__is-a-model-turned-into-a-futuristic-ai-robot-emily__8_1770156725736.png';

const AVATAR_MAP: Record<string, string> = {
  avatar1,
  avatar2,
  avatar3,
  avatar4,
  avatar5,
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent, isLoading: agentLoading, error: agentError } = useQuery<Agent>({
    queryKey: ['/api/agents', agentId],
    enabled: !!agentId,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        agentId,
        message,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response || data.message || 'I apologize, I had trouble responding.',
        timestamp: new Date(),
      }]);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    chatMutation.mutate(userMessage.content);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/chat/${agentId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Link copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center" data-testid="loading-agent">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!agent || agentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center" data-testid="error-agent-not-found">
        <Card className="bg-slate-900/80 border-slate-700 p-8 text-center">
          <Bot className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2" data-testid="text-error-title">Agent Not Found</h2>
          <p className="text-slate-400" data-testid="text-error-description">This agent doesn't exist or has been removed.</p>
        </Card>
      </div>
    );
  }

  const avatarSrc = AVATAR_MAP[agent.avatarId || 'avatar1'] || avatar1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm p-4" data-testid="chat-header">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={avatarSrc}
              alt={agent.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/50"
              data-testid="img-agent-avatar"
            />
            <div>
              <h1 className="text-lg font-bold text-white" data-testid="text-agent-name">{agent.name}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Volume2 className="w-3 h-3" />
                <span data-testid="text-agent-voice">{agent.voiceName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400" data-testid="badge-status">Online</Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyShareLink}
            data-testid="button-copy-chat-link"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12" data-testid="empty-state">
              <img
                src={avatarSrc}
                alt={agent.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/30 mx-auto mb-4"
                data-testid="img-empty-avatar"
              />
              <h2 className="text-xl font-bold text-white mb-2" data-testid="text-empty-title">Chat with {agent.name}</h2>
              <p className="text-slate-400 max-w-md mx-auto" data-testid="text-empty-description">
                Start a conversation! Ask questions, get advice, or just chat.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-row-${index}`}
            >
              {message.role === 'assistant' && (
                <img
                  src={avatarSrc}
                  alt={agent.name}
                  className="w-8 h-8 rounded-full object-cover border border-purple-500/50 flex-shrink-0"
                  data-testid={`img-message-avatar-${index}`}
                />
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}
                data-testid={`bubble-message-${index}`}
              >
                <p className="whitespace-pre-wrap" data-testid={`text-message-content-${index}`}>{message.content}</p>
                <p className="text-xs opacity-50 mt-1" data-testid={`text-message-timestamp-${index}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0" data-testid={`avatar-user-${index}`}>
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3" data-testid="typing-indicator">
              <img
                src={avatarSrc}
                alt={agent.name}
                className="w-8 h-8 rounded-full object-cover border border-purple-500/50"
                data-testid="img-typing-avatar"
              />
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            disabled={chatMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="bg-purple-600 hover:bg-purple-500"
            data-testid="button-send-message"
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
