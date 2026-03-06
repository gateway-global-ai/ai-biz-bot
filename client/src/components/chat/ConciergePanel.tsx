/**
 * ConciergePanel - Unified Voice/Chat Interface (Gateway Global AI PTT)
 *
 * This is the canonical PTT interface that represents Gateway Global AI.
 * Default styling follows the Nova Verify billing-summary look: solid white content area,
 * solid dark header/footer (sovereign-deep #0F172A), clean sans-serif, rounded-sui.
 * See _legacy_archive/novaverify (1) and docs/NOVA_VERIFY_UI_REFERENCE.md.
 *
 * REDESIGNED LAYOUT (15-20-40-25):
 * 15% - Top Header (Logo, Status, Title, Settings/Admin/Layout/Close)
 * 20% - Visualizer (Wave visualization, status text)
 * 40% - Content Window (Transcribed conversation, multimodal tools)
 * 25% - Bottom Footer (PTT button 50% width, optional side buttons)
 *
 * Key Features:
 * - Professional PTT with sovereign glass UI by default
 * - Compact, efficient use of screen space
 * - Multimodal content area for maps, forms, catalogs
 * - Auto-restart on settings change
 */

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Mic, Send, Settings, RefreshCw, Shield, MessageSquare, Menu 
} from 'lucide-react';
import { VoiceClientFactory } from '../../services/voice/VoiceClientFactory';
import { IVoiceClient } from '../../services/voice/IVoiceClient';
import { VoiceConfig, BusinessContext, AgentConfig } from '../../types/voice';
import { VoiceSettings } from '../voice/VoiceSettings';
import { ToolRouter } from '../voice/tools/ToolRouter';
import { SuccessAnimation } from '../voice/animations/SuccessAnimation';
import { useVoiceAnimations } from '../voice/animations/useVoiceAnimations';
import headerLogo from '@assets/clear_voice_ai_dark_sm.png';
import chatFooterCarbon from '@assets/chat-footer-carbon.png';

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
  onOpenSettings?: () => void;
  /** When set, header shows "Admin Mode" button that opens admin (e.g. partner dashboard). */
  onOpenAdmin?: () => void;
  /** When set, header shows "AI Biz Bot Chat" — open the owner chat to talk to the platform and modify router/agents. */
  onOpenBizBotChat?: () => void;
  /** UI style: 'sovereign' = Gateway Global AI / Nova Verify (default). 'default' = legacy blue/purple gradient. */
  variant?: 'default' | 'sovereign';
  className?: string;
  zIndex?: number;
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
  onOpenBizBotChat,
  variant = 'sovereign',
  className = '',
  zIndex = 50
}) => {
  const siteConfigId = business.id;
  const isSovereign = variant === 'sovereign';

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
  const [showBizBotMenu, setShowBizBotMenu] = useState(false);
  const bizBotMenuRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { triggerSuccess } = useVoiceAnimations();

  // Close AI Biz Bot menu on outside click
  useEffect(() => {
    if (!showBizBotMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (bizBotMenuRef.current && !bizBotMenuRef.current.contains(e.target as Node)) {
        setShowBizBotMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showBizBotMenu]);

  // --- Engine Initialization ---
  useEffect(() => {
    if (!isOpen) {
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
        // Guard: only call the Handover Service when we have a real DB UUID.
        // WebsitePreview (demo/preview mode) passes business.id = '' — in that
        // case we skip the fetch and initialise directly from the props config.
        const hasValidId = Boolean(siteConfigId) && siteConfigId !== 'undefined' && siteConfigId !== '';

        // Resolved DB record (only populated when hasValidId === true)
        let dbSiteConfig: Record<string, any> | null = null;
        let validatedVoiceConfig: VoiceConfig = currentVoiceConfig;

        if (hasValidId) {
          // 1. Fetch the pre-validated configuration from the Handover Service.
          const response = await fetch(`/api/site-configs/${siteConfigId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch site configuration for ID: ${siteConfigId}`);
          }
          dbSiteConfig = await response.json();

          // 2. Merge the validated Model ID and voice name — Backend Config > Prop > Fallback
          const dbVoiceConfig = dbSiteConfig!.voiceConfig as { voiceName?: string } | null | undefined;
          validatedVoiceConfig = {
            ...currentVoiceConfig,
            model: dbSiteConfig!.modelName || currentVoiceConfig.model || process.env.GEMINI_MODEL_ID,
            voiceName: dbVoiceConfig?.voiceName ?? currentVoiceConfig.voiceName,
          };
        }

        // 3. Build resolvedAgent — DB persona takes priority over static prop.
        //    agentConfig fields: { name, role, discProfile, basePrompt }
        const dbAgentConfig = dbSiteConfig?.agentConfig as {
          name?: string;
          role?: string;
          discProfile?: string;
          basePrompt?: string;
        } | null | undefined;

        const resolvedAgent: AgentConfig = dbAgentConfig ? {
          ...agent,
          role: [dbAgentConfig.name, dbAgentConfig.role].filter(Boolean).join(', ') || agent.role,
          personality: [
            dbAgentConfig.basePrompt,
            dbAgentConfig.discProfile ? `DISC Profile: ${dbAgentConfig.discProfile}` : undefined
          ].filter(Boolean).join('. ') || agent.personality,
        } : agent;

        console.log('[ConciergePanel] Initializing with model:', validatedVoiceConfig.model, '| Persona:', resolvedAgent.role, hasValidId ? '(Handover Service)' : '(props — preview mode)');

        console.log('[ConciergePanel] Initializing with model:', validatedVoiceConfig.model, '| Persona:', resolvedAgent.role, hasValidId ? '(Handover Service)' : '(props — preview mode)');
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
            }
          } else if (msg.type === 'error') {
            setIsProcessing(false);
            addMessage('system', msg.text || 'An error occurred with the voice engine.');
          }
        });

        newClient.onVolumeChange((volume) => {
          startTransition(() => setVolumeLevel(volume));
        });

        newClient.onConnectionChange((connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        });

        // 4. Connect — enrich context with DB-validated systemPromptOverride when
        //    Handover Service ran; in preview mode use business as-is.
        //    CRITICAL: Always pass the resolved siteConfigId (UUID) into sessionContext so
        //    the voice proxy and MCP tools receive the Business UUID, not place_id or empty string.
        const handoverBusinessContext = dbSiteConfig
          ? { ...business, id: siteConfigId, systemPromptOverride: dbSiteConfig.systemPromptOverride }
          : business;

        await newClient.connect(handoverBusinessContext, resolvedAgent, validatedVoiceConfig);
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
  // Deps: `siteConfigId` (primitive) replaces the full `business` object reference
  // so that inline object literals in calling components (e.g. WebsitePreview) do
  // not create new references on every render and trigger an infinite re-connect.
  // `currentVoiceConfig` is React state so its identity is already stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, siteConfigId, currentVoiceConfig]);

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

  // --- Layout Classes (Nova Verify style: white panel, dark header/footer, rounded-sui) ---
  const getContainerClasses = () => {
    const base = isSovereign
      ? "fixed shadow-2xl transition-all duration-300 flex flex-col overflow-hidden bg-white border border-slate-200"
      : "fixed bg-slate-50 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden";
    switch (layoutMode) {
      case 'fullscreen':
        return `${base} inset-0 rounded-none`;
      case 'fixed':
        return isSovereign
          ? `${base} top-0 right-0 bottom-0 w-96 rounded-l-sui border-l border-slate-200`
          : `${base} top-0 right-0 bottom-0 w-96 rounded-l-xl border-l border-gray-100`;
      case 'floating':
        return isSovereign
          ? `${base} bottom-6 right-6 w-96 h-[600px] rounded-sui`
          : `${base} bottom-6 right-6 w-96 h-[600px] rounded-2xl border border-gray-100`;
      default:
        return base;
    }
  };

  if (!isOpen) return null;

  const PanelWrapper = isSovereign ? motion.div : 'div';
  const panelProps = isSovereign
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' as const },
      }
    : {};

  // In fullscreen, header/footer must never collapse — use flex basis
  const isFullscreen = layoutMode === 'fullscreen';
  const headerStyle = isFullscreen ? { flex: '0 0 56px', minHeight: 56 } : undefined;
  const visualizerStyle = isFullscreen ? { flex: '0 0 100px', minHeight: 100 } : undefined;
  const footerStyle = isFullscreen ? { flex: '0 0 120px', minHeight: 120 } : undefined;

  return (
    <PanelWrapper
      {...panelProps}
      className={`${getContainerClasses()} ${className}`}
      style={{ zIndex }}
    >
      {/* 1. TOP HEADER (always visible; in fullscreen fixed flex basis so it never disappears) */}
      <div
        style={headerStyle}
        className={`flex items-center justify-between px-4 py-3 flex-shrink-0 min-h-[56px] ${
          isSovereign
            ? 'bg-[#0F172A] border-b border-slate-700/80'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
        }`}
      >
        {/* Left: hamburger only */}
        <div className="flex items-center shrink-0">
          <div className="relative" ref={bizBotMenuRef}>
            <button
              onClick={() => setShowBizBotMenu((v) => !v)}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
              title="AI Biz Bot — settings, admin, chat"
            >
              <Menu size={20} />
            </button>
            {showBizBotMenu && (
              <div className={`absolute left-0 top-full mt-1 py-1 min-w-[180px] rounded-xl shadow-xl z-50 ${
                isSovereign ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={() => { setShowSettings(true); setShowBizBotMenu(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                    isSovereign ? 'text-slate-200 hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Settings size={16} />
                  Voice settings
                </button>
                {onOpenAdmin && (
                  <button
                    onClick={() => { onOpenAdmin(); setShowBizBotMenu(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                      isSovereign ? 'text-slate-200 hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Shield size={16} />
                    Admin
                  </button>
                )}
                {onOpenBizBotChat && (
                  <button
                    onClick={() => { onOpenBizBotChat(); setShowBizBotMenu(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                      isSovereign ? 'text-slate-200 hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare size={16} />
                    Chat with AI Biz Bot
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Center: Clear Voice logo + status */}
        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          <img src={headerLogo} alt="Clear Voice AI" className={isSovereign ? 'h-10 w-auto object-contain' : 'h-11 w-auto object-contain'} />
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            connectionStatus === 'connected'
              ? (isSovereign ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50')
              : connectionStatus === 'connecting'
              ? 'bg-yellow-400 animate-pulse'
              : 'bg-red-400'
          }`} />
        </div>
        {/* Right: resize + close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onCycleLayout && (
            <button
              onClick={onCycleLayout}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
              title="Toggle Layout"
            >
              {layoutMode === 'fullscreen' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button
            onClick={onClose}
            className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-red-500/30 rounded-lg text-white transition-colors"}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 2. VISUALIZER (Nova Verify: solid dark band) */}
      <div
        style={visualizerStyle}
        className={`flex flex-col items-center justify-center flex-shrink-0 min-h-[100px] relative overflow-hidden ${
          isSovereign ? 'bg-slate-900 border-b border-slate-700/80' : 'bg-gradient-to-b from-gray-900 to-gray-800'
        }`}
      >
        {/* Voice Wave Visualization with Tier-Based Colors */}
        <div className="flex items-center gap-1 h-16 mb-2">
          {[...Array(32)].map((_, i) => {
            const clearVoice = currentVoiceConfig.mode === 'clear_voice';
            const baseColor = isSovereign
              ? (clearVoice ? (isRecording ? 'bg-emerald-400' : isProcessing ? 'bg-emerald-400' : 'bg-slate-600') : (isRecording ? 'bg-indigo-400' : isProcessing ? 'bg-indigo-400' : 'bg-slate-600'))
              : (clearVoice ? (isRecording ? 'bg-green-400' : isProcessing ? 'bg-emerald-400' : 'bg-gray-600') : (isRecording ? 'bg-blue-400' : isProcessing ? 'bg-purple-400' : 'bg-gray-600'));
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
        <div className="relative">
          {(isRecording || isProcessing) && (
            <div className={`absolute inset-0 blur-xl opacity-60 ${
              isSovereign
                ? (currentVoiceConfig.mode === 'clear_voice' ? 'bg-emerald-500' : 'bg-indigo-500')
                : currentVoiceConfig.mode === 'clear_voice'
                ? (isRecording ? 'bg-green-500' : 'bg-emerald-500')
                : (isRecording ? 'bg-blue-500' : 'bg-purple-500')
            }`} />
          )}
          <p className={`text-[10px] font-semibold tracking-widest uppercase relative z-10 ${
            isSovereign
              ? (isRecording || isProcessing ? 'text-indigo-300' : 'text-slate-400')
              : isRecording
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-green-300' : 'text-blue-300')
              : isProcessing
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-emerald-300' : 'text-purple-300')
              : 'text-slate-500'
          }`}>
            {isRecording ? '● LISTENING' : isProcessing ? '◐ THINKING' : 'READY'}
          </p>
        </div>
      </div>

      {/* 3. CONTENT WINDOW: outer constrains height, inner is the only scroll container */}
      <div className={`flex-1 min-h-0 flex flex-col border-t overflow-hidden ${
        isSovereign ? 'bg-white border-slate-200' : 'bg-slate-50 border-gray-200'
      }`}>
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden concierge-content-scroll"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
        {messages.length === 0 ? (
          <div className={`min-h-full flex flex-col items-center justify-center text-center px-8 py-8 ${isSovereign ? 'text-slate-600' : 'text-slate-400'}`}>
            <Mic className={`w-12 h-12 mb-3 ${isSovereign ? 'text-slate-400' : 'text-slate-300'}`} />
            <p className={isSovereign ? 'text-sm font-medium text-slate-700' : 'text-sm font-medium text-slate-600'}>Hold the button below to speak</p>
            <p className="text-xs mt-2 text-slate-500">
              Voice input & AI responses appear here
            </p>
            <p className={`text-[10px] mt-4 max-w-xs uppercase tracking-wider ${isSovereign ? 'text-slate-400' : 'text-slate-300'}`}>
              Multimodal: maps, forms, catalogs
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {messages.map((msg) => {
              const hasTool = msg.metadata?.tool_type;
              const userBubble = isSovereign
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-blue-600 text-white shadow-sm';
              const assistantBubble = isSovereign
                ? (hasTool ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm')
                : (hasTool ? 'bg-gray-50 text-slate-800 border border-gray-200' : 'bg-gray-100 text-slate-800 shadow-sm');
              const systemBubble = isSovereign ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200';
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`${
                    hasTool ? 'w-full' : 'max-w-[80%]'
                  } rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? userBubble
                      : msg.role === 'assistant'
                      ? assistantBubble
                      : systemBubble
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
                      <div className={`mt-2 text-xs font-medium ${isSovereign ? 'text-emerald-600' : 'text-green-600'}`}>
                        ✓ Corrected: {msg.metadata.correctedValue}
                      </div>
                    )}
                    
                    {/* Metadata Footer (DISC, Emotion, Sentiment) */}
                    {msg.metadata && !hasTool && (
                      <div className={`mt-2 text-xs border-t pt-2 space-x-3 ${isSovereign ? 'border-slate-200 text-slate-500' : 'border-white/20 opacity-70'}`}>
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
        </div>
      </div>

      {/* 4. BOTTOM FOOTER — carbon texture background, modern PTT */}
      <div
        style={{
          ...footerStyle,
          ...(isSovereign ? {
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.92) 100%), url(${chatFooterCarbon})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined),
        }}
        className={`flex flex-col items-center justify-center gap-3 px-4 py-3 flex-shrink-0 min-h-[120px] border-t ${
          isSovereign ? 'border-slate-700/50' : 'bg-gradient-to-b from-gray-50 to-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            className={isSovereign
              ? 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors'
              : 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200'
            }
            title="Switch to Text Chat"
          >
            <Send size={16} />
          </button>

          <button
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onMouseLeave={stopPTT}
            onTouchStart={(e) => { e.preventDefault(); startPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopPTT(); }}
            disabled={connectionStatus !== 'connected'}
            className={isSovereign
              ? `relative w-[50%] min-w-[140px] max-w-[220px] h-14 rounded-2xl font-semibold text-sm transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden ${
                  isRecording
                    ? 'bg-indigo-500 text-white shadow-[0_0_24px_rgba(99,102,241,0.5)] ring-2 ring-indigo-400/50'
                    : isProcessing
                    ? 'bg-indigo-500/90 text-white animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-600/80 hover:bg-slate-700/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-sm'
                }`
              : `w-[50%] h-14 rounded-2xl font-semibold text-sm transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none ${
                  isRecording
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/50 ring-2 ring-blue-300/50'
                    : isProcessing
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-blue-600 hover:to-blue-700'
                }`
            }
          >
            <span className="flex items-center justify-center gap-2">
              <Mic size={20} className={isRecording || isProcessing ? 'animate-pulse' : ''} />
              <span className="hidden min-[380px]:inline">
                {isRecording ? 'Listening…' : isProcessing ? 'Processing…' : 'Hold to speak'}
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
              }
              setTimeout(() => window.location.reload(), 300);
            }}
            className={isSovereign
              ? 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors'
              : 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-gray-200'
            }
            title="Restart Connection"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className={`flex items-center justify-between w-full text-[10px] font-medium uppercase tracking-wider ${isSovereign ? 'text-slate-400' : 'text-slate-400'}`}>
          <span>
            {currentVoiceConfig.mode === 'clear_voice' ? '⚡ Clear Voice' : '💬 Standard PTT'}
          </span>
          <span className={
            isSovereign
              ? (connectionStatus === 'connected' ? 'text-emerald-400' : connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400')
              : (connectionStatus === 'connected' ? 'text-green-600' : connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600')
          }>
            {connectionStatus === 'connected' ? '● CONNECTED' : connectionStatus === 'connecting' ? '◐ CONNECTING' : '○ DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Voice Settings - overlay when open; fully hidden when closed (no render when !showSettings) */}
      {showSettings && (
      <VoiceSettings
        isOpen={true}
        onClose={() => setShowSettings(false)}
        contained
        currentMode={currentVoiceConfig.mode === 'clear_voice' ? 'clear_voice' : 'standard'}
        currentConfig={{
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
          addMessage('system', 'Settings updated. Reconnecting...');
        }}
        onOpenAgentSettings={onOpenAdmin}
      />
      )}
    </PanelWrapper>
  );
};