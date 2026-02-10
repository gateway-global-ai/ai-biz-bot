import React, { useState, useRef, useEffect } from 'react';
import { Chat } from "@google/genai";
import { Send, Bot, X } from 'lucide-react';
import { ChatMessage } from '../types';

interface Props {
  chatSession: Chat | null;
  isOpen: boolean;
  welcomeMessage?: string;
  onClose: () => void;
}

const ChatWidget: React.FC<Props> = ({ chatSession, isOpen, welcomeMessage, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset messages when session changes or a new welcome message is provided
  useEffect(() => {
    if (welcomeMessage) {
      setMessages([{ role: 'model', text: welcomeMessage }]);
    } else {
      setMessages([{ role: 'model', text: 'Hi there! I can help you with flights, hotels, or itineraries. Ask me anything!' }]);
    }
  }, [chatSession, welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatSession.sendMessage({ message: userMsg });
      const text = response.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white border border-slate-100 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 z-50">
      
      {/* DARK BLUE HEADER: The professional anchor */}
      <div className="bg-[#1E3A8A] p-4 flex justify-between items-center text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold tracking-tight">Travel Assistant</h3>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
          <X size={20} />
        </button>
      </div>
      
      {/* CLEAN WHITE CHAT BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm transition-all ${
              msg.role === 'user' 
                ? 'bg-[#E91E63] text-white rounded-br-none shadow-sm' 
                : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
      </div>

      {/* INPUT AREA: Minimalist & Focused */}
      <div className="p-3 bg-white border-t border-slate-100">
        <div className="flex gap-2 bg-slate-50 rounded-full border border-slate-200 p-1.5 focus-within:ring-2 focus-within:ring-[#E91E63]/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about flights or hotels..."
            className="flex-1 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-[#E91E63] text-white rounded-full hover:bg-[#C2185B] disabled:opacity-50 transition-all shadow-md shadow-[#E91E63]/20"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
