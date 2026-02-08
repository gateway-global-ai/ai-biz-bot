
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { chatWithConcierge } from '../geminiService';
import { ChatMessage } from '../types';
import { Send, Bot, User, Loader2, ExternalLink } from 'lucide-react';

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Welcome to Las Vegas! I am your CES 2026 Concierge. How can I assist with your schedule or venue navigation today?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await chatWithConcierge(input, history);
    
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: response.text,
      timestamp: Date.now(),
      grounding: response.grounding
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
      <div className="px-6 mb-4">
        <p className="text-gray-400 text-sm font-medium">Crystal-link active: Intelligent assistance online</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-4 pb-12">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10 border border-white/20'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <GlassCard className={`!p-4 ${msg.role === 'user' ? 'bg-blue-600/20' : 'bg-white/5'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </GlassCard>
                
                {msg.grounding && msg.grounding.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {msg.grounding.map((chunk, idx) => {
                      if (chunk.web) {
                        return (
                          <a 
                            key={idx}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-blue-400 hover:bg-white/10 transition-colors"
                          >
                            <ExternalLink size={10} />
                            <span className="truncate max-w-[150px]">{chunk.web.title || 'Source'}</span>
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start px-6">
            <div className="flex gap-3 items-center text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium">Concierge is computing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/10 sticky bottom-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your concierge anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600 shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
