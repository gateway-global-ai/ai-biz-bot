
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { GroundingChip } from './GroundingChip';
import { Bot, User, Loader2 } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
  onAddToCanvas: (content: string) => void;
  onBook: (title: string, uri: string) => void;
  onSetAnchor: (title: string, uri: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onAddToCanvas, onBook, onSetAnchor }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] gap-3 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isModel ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
        }`}>
            {isModel ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} w-full max-w-full`}>
            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed max-w-full ${
                isModel 
                ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none' 
                : 'bg-indigo-600 text-white rounded-tr-none'
            }`}>
                {message.isLoading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Thinking...</span>
                    </div>
                ) : (
                    <div className={`markdown-body ${isModel ? '' : 'text-white'}`}>
                        <ReactMarkdown 
                            components={{
                                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className={`underline ${isModel ? 'text-blue-600 hover:text-blue-800' : 'text-white/90 hover:text-white'}`} />,
                                ul: ({node, ...props}) => <ul {...props} className="list-disc list-outside ml-4 my-2" />,
                                ol: ({node, ...props}) => <ol {...props} className="list-decimal list-outside ml-4 my-2" />,
                                p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                                strong: ({node, ...props}) => <strong {...props} className="font-bold" />
                            }}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* Grounding Chips (Maps Data) */}
            {isModel && message.groundingMetadata?.groundingChunks && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {message.groundingMetadata.groundingChunks.map((chunk, idx) => (
                        <GroundingChip 
                            key={idx} 
                            chunk={chunk} 
                            onAddToCanvas={onAddToCanvas} 
                            onBook={onBook}
                            onSetAnchor={onSetAnchor}
                        />
                    ))}
                </div>
            )}
            
            <span className="text-xs text-slate-400 mt-1 px-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
      </div>
    </div>
  );
};
