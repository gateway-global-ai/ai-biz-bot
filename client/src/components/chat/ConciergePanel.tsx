/**
 * ConciergePanel - Unified Voice/Chat Interface
 * 
 * The "Driver" component for the dual-engine voice system.
 * Handles PTT logic differences between "Standard" (Record & Upload) and "Clear Voice" (Stream) automatically.
 * 
 * Key Features:
 * - Supports both streaming (Clear Voice Premium) and transactional (Standard PTT) modes
 * - Reusable across Landing Page and Preview Page
 * - Flexible layout modes: floating, fixed, fullscreen
 * - Integrated voice visualizer and chat history
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Maximize2, Minimize2, Mic, Send, MoreVertical, 
  Settings, MapPin, RefreshCw 
} from 'lucide-react';
import { VoiceClientFactory } from '../../services/voice/VoiceClientFactory';
import { IVoiceClient } from '../../services/voice/IVoiceClient';
import { VoiceConfig, BusinessContext, AgentConfig, ChatMessage as VoiceChatMessage } from '../../types/voice';

// --- Types ---
interface ConciergePanelProps {
  // Business & Agent Context
  business: BusinessContext;
  agent: AgentConfig;
  
  // Configuration
  voiceConfig: VoiceConfig;
  agentName?: string;
  initialView?: 'chat' | 'voice';
  
  // Layout Controls
  isOpen: boolean;
  layoutMode?: 'floating' | 'fixed' | 'fullscreen';
  onClose: () => void;
  onCycleLayout?: () => void;
  
  // Optional Callbacks
  onOpenSettings?: () => void;
  className?: string;
  zIndex?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  mapData?: any; // For Phase 10: Google Places
  timestamp: number;
}

export const ConciergePanel: React.FC<ConciergePanelProps> = ({
  business,
  agent,
  voiceConfig,
  agentName,
  initialView = 'voice',
  isOpen,
  layoutMode = 'floating',
  onClose,
  onCycleLayout,
  onOpenSettings,
  className = '',
  zIndex = 50
}) => {
  // --- State ---
  const [activeView, setActiveView] = useState<'chat' | 'voice'>(initialView);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Voice State
  const [client, setClient] = useState<IVoiceClient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Engine Initialization ---
  useEffect(() => {
    if (!isOpen) {
      // Cleanup when closed
      client?.disconnect();
      setConnectionStatus('disconnected');
      return;
    }

    const initEngine = async () => {
      setConnectionStatus('connecting');
      try {
        console.log('[ConciergePanel] Initializing voice engine:', voiceConfig.mode);
        
        // 1. Factory creates the right engine (Standard vs Clear Voice)
        const newClient = VoiceClientFactory.createClient(voiceConfig);
        
        // 2. Setup Listeners
        newClient.onMessage((msg) => {
          console.log('[ConciergePanel] Message received:', msg);
          
          if (msg.type === 'transcription' && msg.isFinal) {
            addMessage('user', msg.text);
          } else if (msg.type === 'response') {
            addMessage('assistant', msg.text, msg.metadata);
            setIsProcessing(false);
          } else if (msg.type === 'error') {
            addMessage('system', `Error: ${msg.text}`);
            setIsProcessing(false);
          }
        });

        newClient.onVolumeChange((volume) => {
          setVolumeLevel(volume);
        });

        newClient.onConnectionChange((connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        });

        // 3. Connect
        await newClient.connect(business, agent, voiceConfig);
        setClient(newClient);
        setConnectionStatus('connected');
        
        console.log('[ConciergePanel] Voice engine connected successfully');

      } catch (err) {
        console.error("[ConciergePanel] Failed to init voice engine:", err);
        setConnectionStatus('disconnected');
        addMessage('system', 'Connection failed. Switching to text mode.');
        setActiveView('chat');
      }
    };

    initEngine();

    return () => {
      console.log('[ConciergePanel] Cleaning up voice engine');
      client?.disconnect();
    };
  }, [isOpen, voiceConfig.mode]); // Re-init if mode changes

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync initialView prop changes
  useEffect(() => {
    if (isOpen && initialView !== activeView) {
      setActiveView(initialView);
    }
  }, [isOpen, initialView]);

  // --- Helpers ---
  const addMessage = (role: 'user' | 'assistant' | 'system', text?: string, metadata?: any) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      role,
      text,
      mapData: metadata?.placeId ? metadata : undefined,
      timestamp: Date.now()
    }]);
  };

  // --- PTT Logic (The Dual-Engine Handler) ---
  
  const startPTT = async () => {
    if (!client || connectionStatus !== 'connected') {
      console.warn('[ConciergePanel] Cannot start PTT: client not ready');
      return;
    }
    
    console.log('[ConciergePanel] Starting PTT session');
    setIsRecording(true);
    
    try {
      // Call the abstracted startSession() method
      // - For Clear Voice (streaming): unmutes audio stream
      // - For Standard (transactional): starts recording blob
      client.startSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT start error:", err);
      setIsRecording(false);
      addMessage('system', 'Microphone error. Please check permissions.');
    }
  };

  const stopPTT = () => {
    if (!isRecording || !client) return;
    
    console.log('[ConciergePanel] Stopping PTT session');
    setIsRecording(false);
    setIsProcessing(true); // Show "Thinking..."

    try {
      // Call the abstracted endSession() method
      // - For Clear Voice (streaming): mutes audio stream
      // - For Standard (transactional): stops recording and uploads blob
      client.endSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT stop error:", err);
      setIsProcessing(false);
    }
  };

  // --- Text Chat Handlers ---
  
  const handleSendText = () => {
    if (!inputText.trim() || !client) return;
    
    const text = inputText.trim();
    setInputText('');
    
    // Add user message immediately
    addMessage('user', text);
    setIsProcessing(true);
    
    // Send to voice client
    client.sendText(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // --- Render Helpers ---
  const getContainerClasses = () => {
    const base = "fixed bg-white shadow-2xl transition-all duration-300 flex flex-col overflow-hidden";
    switch (layoutMode) {
      case 'fullscreen': 
        return `${base} inset-0 rounded-none`;
      case 'fixed': 
        return `${base} top-0 right-0 bottom-0 w-96 rounded-l-xl border-l border-gray-100`;
      case 'floating': 
        return `${base} bottom-6 right-6 w-96 h-[600px] rounded-2xl border border-gray-100`;
      default: 
        return base;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`${getContainerClasses()} ${className}`}
      style={{ zIndex }}
    >
      
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-400'
          }`} />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{agentName || agent.role}</h3>
            <p className="text-[10px] text-gray-400 tracking-wider font-medium">
              {business.name.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onOpenSettings && (
            <button 
              onClick={onOpenSettings} 
              className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          )}
          {onCycleLayout && (
            <button 
              onClick={onCycleLayout} 
              className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
              title="Toggle Layout"
            >
              {layoutMode === 'fullscreen' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full text-gray-400 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 bg-gray-50 overflow-hidden relative">
        
        {/* VOICE VIEW */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${
          activeView === 'voice' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          <div className="w-full max-w-[280px] aspect-square bg-white rounded-full shadow-sm flex items-center justify-center mb-12 relative">
            {/* Visualizer - Animated based on volume */}
            <div 
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isRecording ? 'bg-blue-500' : 'bg-gray-100'
              }`}
              style={{
                opacity: isRecording ? Math.min(volumeLevel * 2, 0.4) : 0.1,
                transform: `scale(${1 + (isRecording ? volumeLevel * 0.5 : 0)})`
              }}
            />
            <div className={`w-24 h-24 rounded-full ${
              isProcessing ? 'bg-purple-500 animate-pulse' : 
              isRecording ? 'bg-blue-600' : 
              'bg-gray-800'
            } flex items-center justify-center shadow-lg relative z-10 transition-all duration-300`}>
              <Mic className="text-white w-8 h-8" />
            </div>
          </div>
          
          <div className="text-center space-y-2 px-8">
            <h2 className="text-xl font-medium text-gray-800">
              {isRecording ? "Listening..." : isProcessing ? "Thinking..." : "How can I help?"}
            </h2>
            <p className="text-sm text-gray-400">
              {voiceConfig.mode === 'streaming' ? '⚡ Clear Voice (Streaming)' : '💬 Standard (PTT)'}
            </p>
          </div>

          {/* Recent Messages Preview */}
          {messages.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 max-h-32 overflow-y-auto space-y-2">
              {messages.slice(-3).map((msg) => (
                <div key={msg.id} className={`text-xs ${
                  msg.role === 'user' ? 'text-right text-blue-600' : 'text-left text-gray-700'
                }`}>
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHAT VIEW (Text History) */}
        <div className={`absolute inset-0 flex flex-col bg-white transition-opacity duration-300 ${
          activeView === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
        }`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : msg.role === 'system'
                    ? 'bg-yellow-50 text-yellow-800 rounded-bl-none border border-yellow-200'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text}
                  {msg.mapData && (
                    <div className="mt-2 p-2 bg-white/10 rounded border border-white/20 flex items-center gap-2">
                      <MapPin size={14} />
                      <span className="text-xs font-medium">Map Location</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

      </div>

      {/* 3. Footer / Controls */}
      <div className="bg-white border-t border-gray-100 p-4 shrink-0">
        {activeView === 'voice' ? (
          <div className="flex flex-col gap-4">
            <button
              onPointerDown={startPTT}
              onPointerUp={stopPTT}
              onPointerLeave={stopPTT}
              onTouchStart={startPTT}
              onTouchEnd={stopPTT}
              disabled={connectionStatus !== 'connected'}
              className={`w-full py-4 rounded-xl font-medium tracking-wide transition-all duration-200 select-none touch-none ${
                connectionStatus !== 'connected'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isRecording 
                  ? 'bg-red-500 text-white shadow-lg scale-[0.98]' 
                  : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md active:scale-[0.98]'
              }`}
            >
              {connectionStatus !== 'connected' ? 'CONNECTING...' :
               isRecording ? 'RELEASE TO SEND' : 'HOLD TO SPEAK'}
            </button>
            <div className="flex justify-between px-2">
              <button 
                onClick={() => setActiveView('chat')}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                💬 Text Mode
              </button>
              <button 
                onClick={() => {
                  setMessages([]);
                  client?.disconnect();
                  setTimeout(() => client?.connect(business, agent, voiceConfig), 100);
                }}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={12} /> Restart
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveView('voice')}
              className="p-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors"
              title="Switch to Voice"
            >
              <Mic size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                disabled={connectionStatus !== 'connected'}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none disabled:opacity-50"
              />
              <button 
                onClick={handleSendText}
                disabled={!inputText.trim() || connectionStatus !== 'connected'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
