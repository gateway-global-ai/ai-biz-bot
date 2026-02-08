/**
 * ChatHeader — Top ~15% of the chat interface.
 * Business name + mode switcher (Chat | Push To Talk | Realtime Streaming).
 * Radio-style: one mode at a time; history is shared across all three views.
 */

import React from 'react';
import { MessageSquare, Radio, Activity } from 'lucide-react';
import type { ChatInterfaceMode } from '../types';

export interface ChatHeaderProps {
  /** Display name of the business (e.g. from agent identity) */
  businessName: string;
  /** Current mode; only one active at a time */
  mode: ChatInterfaceMode;
  onModeChange: (mode: ChatInterfaceMode) => void;
  /** Optional: disable switcher when session is not connected */
  disabled?: boolean;
  className?: string;
}

const MODES: { value: ChatInterfaceMode; label: string; icon: React.ReactNode }[] = [
  { value: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { value: 'ptt', label: 'Push To Talk', icon: <Radio size={18} /> },
  { value: 'realtime', label: 'Realtime Streaming', icon: <Activity size={18} /> },
];

const ChatHeader: React.FC<ChatHeaderProps> = ({
  businessName,
  mode,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  return (
    <header
      className={`flex flex-col justify-center border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm flex-shrink-0 ${className}`}
      style={{ minHeight: '15%', maxHeight: '15%' }}
    >
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-gray-700 flex items-center justify-center text-emerald-400 font-black text-sm">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-100 truncate max-w-[200px] sm:max-w-none" title={businessName}>
              {businessName || 'Business'}
            </h1>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Voice Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-950 border border-gray-800">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => !disabled && onModeChange(m.value)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                ${mode === m.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/80'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
              `}
              aria-pressed={mode === m.value}
              aria-label={`${m.label} mode`}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
