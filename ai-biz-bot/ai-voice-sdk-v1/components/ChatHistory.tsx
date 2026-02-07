import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { User, Bot, Clock } from 'lucide-react';

interface ChatHistoryProps {
  messages: ChatMessage[];
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600 italic p-8 text-center bg-black/20 rounded-2xl border border-gray-800">
        <Bot size={48} className="mb-4 opacity-20" />
        <p>Your conversation transcription will appear here in real-time.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar p-2">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        return (
          <div 
            key={i} 
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex items-center gap-2 mb-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`p-1 rounded-md ${isUser ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                 {isUser ? <User size={12} /> : <Bot size={12} />}
               </div>
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 {isUser ? 'You' : 'Gemini'}
               </span>
               <span className="text-[10px] text-gray-600 flex items-center gap-1 font-mono">
                 <Clock size={10} />
                 {msg.timestamp}
               </span>
            </div>
            
            <div className={`
              max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
              ${isUser 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'}
              ${msg.isStreaming ? 'opacity-90 ring-1 ring-white/10' : 'opacity-100'}
            `}>
              {msg.text}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current ml-1 animate-pulse align-middle" />
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatHistory;