/**
 * ConciergePanel - Unified Voice/Chat Interface
 * 
 * REDESIGNED LAYOUT (15-20-40-25):
 * =================================
 * 15% - Top Header (Title, Status, Settings/Layout/Close icons)
 * 20% - Visualizer (Wave visualization with glowing effects, status text)
 * 40% - Content Window (Transcribed conversation, multimodal tools area)
 * 25% - Bottom Footer (PTT button 50% width, optional side buttons)
 * 
 * Key Features:
 * - Professional PTT interface with proper visual feedback
 * - Compact, efficient use of screen space
 * - Multimodal content area for maps, forms, catalogs
 * - Auto-restart on settings change
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Mic, Send, Settings, RefreshCw, Shield, ArrowLeft
} from 'lucide-react';
import { VoiceClientFactory } from '../../services/voice/VoiceClientFactory';
import { IVoiceClient } from '../../services/voice/IVoiceClient';
import { VoiceConfig, BusinessContext, AgentConfig } from '../../types/voice';
import { VoiceSettings } from '../voice/VoiceSettings';
import { ToolRouter } from '../voice/tools/ToolRouter';
import { SuccessAnimation } from '../voice/animations/SuccessAnimation';
import { useVoiceAnimations } from '../voice/animations/useVoiceAnimations';
import { AgentDirectoryMenu } from '../voice/AgentDirectoryMenu';
import { AgentsMap, AgentDefinition } from '../../types/entryPoints';

interface ConciergePanelProps {
  business: BusinessContext;
  agent: AgentConfig;
  voiceConfig: VoiceConfig;
  agentName?: string;
  initialView?: 'chat' | 'voice';
  isOpen: boolean;
  layoutMode?: 'floating' | 'fixed' | 'fullscreen';
  onClose: () => void;
  onCycleLayout?: () => void;
  /** When set, header shows "Admin Mode" button that opens admin (e.g. partner dashboard). */
  onOpenAdmin?: () => void;
  className?: string;
  zIndex?: number;
  /**
   * Dynamic Entry Point Engine props.
   * When directoryMode=true the panel opens the AgentDirectoryMenu first
   * and waits for the user to select a specialty agent before connecting.
   */
  directoryMode?: boolean;
  /** Pre-selected agentId from a direct VOICE_AGENT / CHAT_AGENT entry point. */
  agentId?: string;
  /** Click-time metaPrompt — sent in sessionContext, compiled server-side by the proxy. */
  metaPrompt?: string;
  /** Available specialty agents from knowledgeLibrary.agents */
  agents?: AgentsMap;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  mapData?: any;
  timestamp: number;
  metadata?: any;
}

export const ConciergePanel: React.FC<ConciergePanelProps> = ({
  business,
  agent,
  voiceConfig,
  agentName,
  isOpen,
  layoutMode = 'floating',
  onClose,
  onCycleLayout,
  onOpenAdmin,
  className = '',
  zIndex = 50,
  directoryMode = false,
  agentId: initialAgentId,
  metaPrompt: initialMetaPrompt,
  agents = {},
}) => {
  const siteConfigId = business.id;
  const isValidSiteConfigId = !!(siteConfigId && siteConfigId !== 'undefined' && siteConfigId !== '');

  // --- Dynamic Entry Point State ---
  // showDirectory=true means we wait for the user to pick an agent before connecting.
  const [showDirectory, setShowDirectory] = useState(directoryMode && !initialAgentId);
  const [activeAgentId, setActiveAgentId] = useState<string | undefined>(initialAgentId);
  const [activeMetaPrompt, setActiveMetaPrompt] = useState<string | undefined>(initialMetaPrompt);
  const [activeAgentName, setActiveAgentName] = useState<string | undefined>(agentName);

  // Reset directory state whenever the panel opens
  useEffect(() => {
    if (isOpen) {
      setShowDirectory(directoryMode && !initialAgentId);
      setActiveAgentId(initialAgentId);
      setActiveMetaPrompt(initialMetaPrompt);
      setActiveAgentName(agentName);
    }
  }, [isOpen, directoryMode, initialAgentId, initialMetaPrompt, agentName]);

  const handleAgentSelect = useCallback((selectedId: string, selectedAgent: AgentDefinition) => {
    setActiveAgentId(selectedId);
    setActiveAgentName(selectedAgent.name);
    // Use the agent's persona as the metaPrompt — the proxy will compile it with sovereignTruths
    setActiveMetaPrompt(selectedAgent.persona);
    setShowDirectory(false);
  }, []);

  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const clientRef = useRef<IVoiceClient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVoiceConfig, setCurrentVoiceConfig] = useState(voiceConfig);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessageId, setSuccessMessageId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { triggerSuccess } = useVoiceAnimations();

  // --- Engine Initialization ---
  useEffect(() => {
    if (!isOpen || showDirectory) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      return;
    }

    const initEngine = async () => {
      setConnectionStatus('connecting');
      try {
        // --- HANDOVER SERVICE LOGIC ---
        // 1. Fetch the pre-validated configuration from the server (only when a valid ID is available).
        let siteConfig: { geminiModelId?: string; systemPromptOverride?: string } = {};
        if (isValidSiteConfigId) {
          const response = await fetch(`/api/site-configs/${siteConfigId}`);
          if (response.ok) {
            siteConfig = await response.json();
          } else if (response.status === 404) {
            // 404 = new customer, no config saved yet — proceed with defaults.
            console.info(`[ConciergePanel] No site config found for ID ${siteConfigId} (new customer). Using defaults.`);
          } else {
            // Any other error is an infrastructure problem — hard fail so it is visible.
            throw new Error(`Failed to fetch site configuration for ID: ${siteConfigId}`);
          }
        }

        // Allowed Gemini native-audio model IDs. Guards against typos entered in the admin panel.
        const ALLOWED_MODELS = new Set([
          'gemini-2.5-flash-native-audio-preview-12-2025',
          'gemini-2.0-flash-live-001',
          'gemini-2.5-flash-exp-native-audio-thinking-dialog',
        ]);
        const backendModelId = siteConfig.geminiModelId;
        const resolvedModel = (backendModelId && ALLOWED_MODELS.has(backendModelId))
          ? backendModelId
          : currentVoiceConfig.model || 'gemini-2.5-flash-native-audio-preview-12-2025';
        if (backendModelId && !ALLOWED_MODELS.has(backendModelId)) {
          console.warn(`[ConciergePanel] Ignoring unknown model ID from site config: "${backendModelId}". Falling back to default.`);
        }

        // 2. MERGE the validated Model ID into the current voice config
        const validatedVoiceConfig: VoiceConfig = {
          ...currentVoiceConfig,
          // Priority: Backend Config (whitelisted) > Prop > Fallback
          model: resolvedModel
        };

        console.log('[ConciergePanel] Initializing with verified model:', validatedVoiceConfig.model);

        // 3. Create client with the VALIDATED config
        const newClient = VoiceClientFactory.createClient(validatedVoiceConfig);
        
        newClient.onMessage((msg) => {
          console.log('[ConciergePanel] Message received:', msg);
          
          if (msg.type === 'transcription') {
            // Handle user transcription (intermediate or final)
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'user' && lastMsg.metadata?.isTranscription) {
                // Update existing transcription message
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...lastMsg,
                  text: msg.text,
                  metadata: { ...lastMsg.metadata, isFinal: msg.isFinal }
                };
                return newMessages;
              } else {
                // Add new transcription message
                return [...prev, {
                  id: `msg-${Date.now()}`,
                  role: 'user',
                  text: msg.text,
                  timestamp: Date.now(),
                  metadata: { isTranscription: true, isFinal: msg.isFinal }
                }];
              }
            });
            
            if (msg.isFinal) {
              setIsProcessing(true);
            }
          } else if (msg.type === 'response') {
            setIsProcessing(false);
            if (msg.text) {
              addMessage('assistant', msg.text, msg.metadata);
            } else if (msg.metadata?.tool_type) {
              // Tool result without text (e.g. map, business intelligence)
              addMessage('assistant', undefined, msg.metadata);

              // Show SuccessAnimation when an onboarding email is confirmed sent
              if (msg.metadata.tool_type === 'email_sent') {
                setShowSuccessAnimation(true);
                setTimeout(() => setShowSuccessAnimation(false), 3000);
              }

              // Surface upgrade / workspace-connect notices from MCP tool errors.
              if (msg.metadata.tool_type === 'mcp_action') {
                let notice: string | undefined;
                if (msg.metadata.ui_action === 'SHOW_UPGRADE_MODAL') {
                  notice = '⚠️ Voice or Enterprise plan required to use Workspace tools. Upgrade in your Admin Panel.';
                } else if (msg.metadata.ui_action === 'SHOW_WORKSPACE_CONNECT') {
                  notice = '🔗 Google Workspace is not connected. Go to Admin Panel → Workspace tab to connect it.';
                }
                if (notice) addMessage('system', notice);
              }
            }
          } else if (msg.type === 'error') {
            setIsProcessing(false);
            addMessage('system', msg.text || 'An error occurred with the voice engine.');
          }
        });

        newClient.onVolumeChange((volume) => {
          setVolumeLevel(volume);
        });

        newClient.onConnectionChange((connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        });

        // 4. Connect using the fetched, validated system prompt and validated config.
        // entryPointAgentId and entryPointMetaPrompt flow into sessionContext in
        // GeminiStreamingClient — the proxy compiles the master instruction server-side.
        const handoverBusinessContext = {
          ...business,
          systemPromptOverride: siteConfig.systemPromptOverride,
          entryPointAgentId: activeAgentId,
          entryPointMetaPrompt: activeMetaPrompt,
        };

        await newClient.connect(handoverBusinessContext, agent, validatedVoiceConfig);
        clientRef.current = newClient;
        
        console.log('[ConciergePanel] Voice engine connected successfully');

      } catch (err) {
        console.error("[ConciergePanel] Failed to init voice engine:", err);
        setConnectionStatus('disconnected');
        const errorMessage = err instanceof Error && err.message.includes('site configuration') 
          ? 'Failed to load site configuration. Please try again.'
          : 'Connection failed. Check microphone permissions.';
        addMessage('system', errorMessage);
      }
    };

    initEngine();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  // showDirectory triggers reconnect when the user selects an agent from the directory
  }, [isOpen, showDirectory, currentVoiceConfig, siteConfigId, business.name, activeAgentId, activeMetaPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Message Management ---
  const addMessage = (role: 'user' | 'assistant' | 'system', text?: string, metadata?: any) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      text,
      metadata,
      timestamp: Date.now()
    }]);
  };

  // --- Tool Handlers ---
  const handleToolSubmit = (messageId: string, value: string) => {
    // Update message to mark tool as completed
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, metadata: { ...msg.metadata, completed: true, correctedValue: value } }
        : msg
    ));

    // Show success animation
    setSuccessMessageId(messageId);
    setShowSuccessAnimation(true);
    triggerSuccess();
    
    // Hide animation after 1.5 seconds
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setSuccessMessageId(null);
    }, 1500);

    // Send tool response back to Gemini
    if (clientRef.current && 'sendToolResponse' in clientRef.current) {
      (clientRef.current as any).sendToolResponse({
        name: "request_manual_input",
        result: {
          corrected_value: value,
          status: "success"
        }
      });
    }
  };

  const handleToolCancel = (messageId: string) => {
    // Remove the tool message or mark as cancelled
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // --- PTT Handlers ---
  const startPTT = () => {
    if (!clientRef.current || connectionStatus !== 'connected' || isRecording) {
      console.warn('[ConciergePanel] Cannot start PTT: client not ready');
      return;
    }
    
    console.log('[ConciergePanel] Starting PTT session');
    setIsRecording(true);
    
    try {
      clientRef.current.startSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT start error:", err);
      setIsRecording(false);
      addMessage('system', 'Microphone error. Please check permissions.');
    }
  };

  const stopPTT = () => {
    if (!isRecording || !clientRef.current) return;
    
    console.log('[ConciergePanel] Stopping PTT session');
    setIsRecording(false);
    setIsProcessing(true);

    try {
      clientRef.current.endSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT stop error:", err);
      setIsProcessing(false);
      addMessage('system', 'Error processing audio.');
    }
  };

  // --- Layout Classes ---
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
      
      {/* 1. TOP HEADER - 15% */}
      <div className="h-[15%] flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-white/10 text-white shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button — shown when user entered via directory and can return to agent list */}
          {directoryMode && !showDirectory && (
            <button
              onClick={() => { setShowDirectory(true); setMessages([]); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-1"
              title="Back to Agent Directory"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className={`w-3 h-3 rounded-full ${
            showDirectory ? 'bg-indigo-400 animate-pulse' :
            connectionStatus === 'connected' ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            'bg-red-400'
          }`} />
          <div>
            <h3 className="font-bold text-base">
              {showDirectory ? 'Agent Directory' : (activeAgentName || agentName || agent.role)}
            </h3>
            <p className="text-[10px] text-white/60 tracking-wide font-medium">
              {business.name.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
              if (isDesktop && layoutMode !== 'fullscreen' && onCycleLayout) onCycleLayout();
              setShowSettings(true);
            }} 
            className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Voice AI Settings"
          >
            <Settings size={18} />
          </button>
          {onOpenAdmin && (
            <button 
              onClick={onOpenAdmin} 
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-1"
              title="Admin Mode"
            >
              <Shield size={18} />
              <span className="text-xs font-medium hidden sm:inline">Admin</span>
            </button>
          )}
          {onCycleLayout && (
            <button 
              onClick={onCycleLayout} 
              className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
              title="Toggle Layout"
            >
              {layoutMode === 'fullscreen' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-500/30 rounded-lg text-white transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 2. VISUALIZER - 20% */}
      <div className="h-[20%] bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
        {/* Voice Wave Visualization with Tier-Based Colors */}
        <div className="flex items-center gap-1 h-16 mb-2">
          {[...Array(32)].map((_, i) => {
            // Tier-based colors: Green for Clear Voice (Premium), Blue for Standard PTT
            const baseColor = currentVoiceConfig.mode === 'clear_voice' 
              ? (isRecording ? 'bg-green-400' : isProcessing ? 'bg-emerald-400' : 'bg-gray-600')
              : (isRecording ? 'bg-blue-400' : isProcessing ? 'bg-purple-400' : 'bg-gray-600');
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${baseColor}`}
                style={{
                  height: isRecording 
                    ? `${Math.max(4, volumeLevel * 200 * (1 + Math.sin((i + Date.now() / 100) / 2)))}px`
                    : isProcessing
                    ? `${20 + Math.sin((i + Date.now() / 200) * 0.5) * 16}px`
                    : '8px',
                  opacity: isRecording || isProcessing ? 0.8 : 0.3
                }}
              />
            );
          })}
        </div>
        
        {/* Status Text with Tier-Based Glow */}
        <div className="relative">
          {(isRecording || isProcessing) && (
            <div className={`absolute inset-0 blur-xl ${
              currentVoiceConfig.mode === 'clear_voice'
                ? (isRecording ? 'bg-green-500' : 'bg-emerald-500')
                : (isRecording ? 'bg-blue-500' : 'bg-purple-500')
            } opacity-60`} />
          )}
          <p className={`text-sm font-semibold tracking-wider relative z-10 ${
            isRecording 
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-green-300' : 'text-blue-300')
              : isProcessing 
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-emerald-300' : 'text-purple-300')
              : 'text-gray-500'
          }`}>
            {isRecording ? '● LISTENING' : isProcessing ? '◐ THINKING' : 'READY'}
          </p>
        </div>
      </div>

      {/* 3. CONTENT WINDOW - 40% (Multimodal Communication Area) */}
      <div className="h-[40%] bg-[#0f172a] overflow-y-auto shrink-0 border-y border-white/5">
        <AnimatePresence mode="wait">
          {showDirectory ? (
            <motion.div
              key="directory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <AgentDirectoryMenu
                agents={agents}
                onSelectAgent={handleAgentSelect}
              />
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center px-8"
            >
              <Mic className="w-12 h-12 mb-3 text-indigo-500/40" />
              <p className="text-sm font-medium text-slate-300">Hold the button below to speak</p>
              {activeAgentName && (
                <p className="text-xs mt-1 text-indigo-400">Speaking with: {activeAgentName}</p>
              )}
              <p className="text-xs mt-2 text-slate-500">
                Voice input & AI responses appear here
              </p>
            </motion.div>
          ) : (
          <div className="space-y-3 p-4">
            {messages.map((msg) => {
              // Check if this is a tool message (map, form, catalog, etc.)
              const hasTool = msg.metadata?.tool_type;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`${
                    hasTool ? 'w-full' : 'max-w-[80%]'
                  } rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : msg.role === 'assistant'
                      ? hasTool 
                        ? 'bg-gray-50 text-gray-800 border border-gray-200' 
                        : 'bg-gray-100 text-gray-800 shadow-sm'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}>
                    {msg.text && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}
                    
                    {/* MULTIMODAL TOOL RENDERING */}
                    {hasTool && !msg.metadata.completed && (
                      <div className="mt-3 relative">
                        <ToolRouter
                          toolType={msg.metadata.tool_type || 'loading'}
                          metadata={msg.metadata}
                          onSubmit={(value) => handleToolSubmit(msg.id, value)}
                          onCancel={() => handleToolCancel(msg.id)}
                          onTriggerSpeech={(text) => {
                            // Trigger AI speech for tour narration
                            if (clientRef.current && clientRef.current.isConnected()) {
                              clientRef.current.sendText(text);
                            }
                          }}
                        />
                        {showSuccessAnimation && successMessageId === msg.id && (
                          <SuccessAnimation
                            isVisible={showSuccessAnimation}
                            message="UPDATED SUCCESSFULLY"
                            onComplete={() => setShowSuccessAnimation(false)}
                            showConfetti={true}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Show corrected value after submission */}
                    {hasTool && msg.metadata.completed && msg.metadata.correctedValue && (
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ✓ Corrected: {msg.metadata.correctedValue}
                      </div>
                    )}
                    
                    {/* Metadata Footer (DISC, Emotion, Sentiment) */}
                    {msg.metadata && !hasTool && (
                      <div className="mt-2 text-xs opacity-70 border-t border-white/20 pt-2 space-x-3">
                        {msg.metadata.emotion && <span>😊 {msg.metadata.emotion}</span>}
                        {msg.metadata.sentiment && <span>💭 {msg.metadata.sentiment}</span>}
                        {msg.metadata.disc && <span>🎯 {msg.metadata.disc}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. BOTTOM FOOTER - 25% */}
      <div className="h-[25%] bg-[#0f172a] border-t border-white/5 flex flex-col items-center justify-center gap-3 px-4 py-3 shrink-0">
        
        {/* Optional Action Buttons Row (LEFT - PTT - RIGHT layout) */}
        <div className="flex items-center justify-center gap-3 w-full">
          {/* Left Button: Text Mode */}
          <button
            className="w-[20%] h-12 flex items-center justify-center text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200"
            title="Switch to Text Chat"
          >
            <Send size={16} />
          </button>

          {/* Center: Push-To-Talk Button - 50% Width */}
          <button
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onMouseLeave={stopPTT}
            onTouchStart={(e) => { e.preventDefault(); startPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopPTT(); }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={showDirectory || connectionStatus !== 'connected'}
            className={`w-[50%] h-14 rounded-xl font-bold text-sm tracking-wider transition-all transform active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed select-none ${
              showDirectory
                ? 'bg-indigo-900/50 text-indigo-300'
                : isRecording 
                ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-500/50 ring-4 ring-indigo-300/30' 
                : isProcessing
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-500/50 animate-pulse'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-indigo-600 hover:to-blue-700 shadow-slate-900/50'
            }`}
          >
            {showDirectory ? '← Select an Agent' : isRecording ? '🎤 LISTENING...' : isProcessing ? '⏳ PROCESSING...' : '🎙️ HOLD TO SPEAK'}
          </button>

          {/* Right Button: Restart */}
          <button
            onClick={() => {
              if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
              }
              setTimeout(() => window.location.reload(), 300);
            }}
            className="w-[20%] h-12 flex items-center justify-center text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-gray-200"
            title="Restart Connection"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between w-full text-[10px] text-slate-500">
          <span>
            {currentVoiceConfig.mode === 'clear_voice' ? '⚡ Clear Voice' : '💬 Standard PTT'}
          </span>
          <span>
            Buffer: {currentVoiceConfig.bufferDelay || 800}ms
          </span>
          <span className={`font-medium ${
            showDirectory ? 'text-indigo-400' :
            connectionStatus === 'connected' ? 'text-emerald-500' : 
            connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {showDirectory ? '◈ DIRECTORY' :
             connectionStatus === 'connected' ? '● CONNECTED' : 
             connectionStatus === 'connecting' ? '◐ CONNECTING' : '○ DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Voice Settings - contained inside panel so it does not exit the chat interface */}
      <VoiceSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        contained
        currentMode={currentVoiceConfig.mode === 'clear_voice' ? 'clear_voice' : 'standard'}
        currentConfig={{
          bufferDelay: currentVoiceConfig.bufferDelay || 800,
          silenceThreshold: currentVoiceConfig.silenceThreshold || -45,
          analysis: {
            detectEmotion: currentVoiceConfig.enableAnalysis?.emotion || currentVoiceConfig.analysis?.emotion || false,
            detectSentiment: currentVoiceConfig.enableAnalysis?.sentiment || currentVoiceConfig.analysis?.sentiment || false,
            detectDISC: currentVoiceConfig.enableAnalysis?.disc || currentVoiceConfig.analysis?.disc || false
          }
        }}
        onConfigChange={(newConfig) => {
          setCurrentVoiceConfig({
            ...currentVoiceConfig,
            ...newConfig
          });
          addMessage('system', `Settings updated: Buffer ${newConfig.bufferDelay}ms. Reconnecting...`);
        }}
      />
    </div>
  );
};