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
  Maximize2, Minimize2, Mic, Send, Settings, RefreshCw, Shield, MessageSquare, Menu,
  User, Activity, CreditCard, Building2, Users, ArrowLeft, Bot, ChevronRight, ChevronDown, Phone, Share2, QrCode, History
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
import { ProfileContent } from '@/components/account/ProfileContent';
import { BillingContentWithStripe } from '@/pages/account/BillingPage';
import { MixingBoardContent } from '@/pages/reseller/MixingBoard';

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
  /** When set, header shows "Admin Mode" button that opens admin (e.g. partner dashboard). Pass optional tab id to open (e.g. 'identity-manager'). */
  onOpenAdmin?: (tab?: string) => void;
  /** When set, header shows "AI Biz Bot Chat" — open the owner chat to talk to the platform and modify router/agents. */
  onOpenBizBotChat?: () => void;
  /** When true, content shows Command Center (Profile, Governance, Bill, Businesses, Reseller, Configure AI) instead of voice transcript. */
  ownerMode?: boolean;
  /** Call when user exits Command Center back to conversation. */
  onExitOwnerMode?: () => void;
  /** Call when user taps a menu item to navigate (e.g. setLocation). */
  onNavigate?: (path: string) => void;
  /** When true, User items (Profile, Billing, etc.) open inside the panel inline instead of navigating. */
  embedViewsInPanel?: boolean;
  /** Optional: called when user chooses Share from the menu (header item moved into menu). */
  onShareClick?: () => void;
  /** Optional: called when user chooses My Account from the menu. */
  onMyAccountClick?: () => void;
  /** When true, bottom-left History button shows call history (or runs onHistoryClick); when false, shows SMS signup / login. */
  isAuthenticated?: boolean;
  /** Called when user taps History and is authenticated (e.g. open call history or telephony). */
  onHistoryClick?: () => void;
  /** Called when user taps History and not authenticated (e.g. open SMS consent or login). */
  onSmsConsentClick?: () => void;
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
  ownerMode = false,
  onExitOwnerMode,
  onNavigate,
  embedViewsInPanel = false,
  onShareClick,
  onMyAccountClick,
  isAuthenticated = false,
  onHistoryClick,
  onSmsConsentClick,
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
  /** Single Menu icon opens overlay; first screen = Admin | User | Public Agents only. */
  const [showMenuOverlay, setShowMenuOverlay] = useState(false);
  /** First-level drill: null = home (Admin | User | Public Agents); then 'admin' | 'user' | 'public'. */
  const [menuDrillDown, setMenuDrillDown] = useState<null | 'admin' | 'user' | 'public'>(null);
  type EmbeddedViewId = 'profile' | 'billing' | 'my-businesses' | 'reseller';
  const [embeddedView, setEmbeddedView] = useState<EmbeddedViewId | null>(null);
  const [expandedAdminAccount, setExpandedAdminAccount] = useState(false);
  const [expandedAdminAgents, setExpandedAdminAgents] = useState(false);
  const [expandedAdminReferral, setExpandedAdminReferral] = useState(false);
  const [expandedUserReferral, setExpandedUserReferral] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { triggerSuccess } = useVoiceAnimations();
  const [animationTick, setAnimationTick] = useState(0);
  const processingStartedAtRef = useRef<number>(0);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setProcessingOn = () => {
    processingStartedAtRef.current = Date.now();
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    setIsProcessing(true);
  };

  const setProcessingOff = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    const elapsed = Date.now() - processingStartedAtRef.current;
    const minDisplayMs = 1200;
    const remaining = Math.max(0, minDisplayMs - elapsed);
    if (remaining > 0) {
      processingTimeoutRef.current = setTimeout(() => {
        processingTimeoutRef.current = null;
        setIsProcessing(false);
      }, remaining);
    } else {
      setIsProcessing(false);
    }
  };

  // Close menu overlay when navigating or opening a view (handled in onClick handlers).

  // Animation tick for visualizer — fixed interval so bar heights don't flicker on every re-render (e.g. volume)
  useEffect(() => {
    if (!isRecording && !isProcessing) return;
    const id = setInterval(() => setAnimationTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [isRecording, isProcessing]);

  // Clear embedded view when leaving Command Center (owner mode)
  useEffect(() => {
    if (!ownerMode) setEmbeddedView(null);
  }, [ownerMode]);

  // Load saved voice config from API when panel opens for a real site (so Voice Settings shows DB-backed values)
  useEffect(() => {
    if (!isOpen || !siteConfigId) return;
    const isPlatform = !siteConfigId || siteConfigId === 'platform-landing' || siteConfigId === 'platform_landing' || siteConfigId === 'platform' || siteConfigId === 'undefined';
    if (isPlatform) return;
    let cancelled = false;
    fetch(`/api/site-configs/${siteConfigId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: any) => {
        if (cancelled || !data?.voiceConfig) return;
        const vc = data.voiceConfig as { voiceName?: string; analysis?: { detectEmotion?: boolean; detectSentiment?: boolean; detectDISC?: boolean } };
        const a = vc?.analysis;
        setCurrentVoiceConfig((prev) => ({
          ...prev,
          voiceName: vc?.voiceName ?? prev.voiceName,
          model: data.modelName ?? prev.model,
          ...(a && {
            enableAnalysis: {
              emotion: a.detectEmotion ?? prev.enableAnalysis.emotion,
              sentiment: a.detectSentiment ?? prev.enableAnalysis.sentiment,
              disc: a.detectDISC ?? prev.enableAnalysis.disc,
            },
          }),
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, siteConfigId]);

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

          // 2. Merge validated model, voice name, and analysis — Backend Config > Prop > Fallback
          const dbVoiceConfig = dbSiteConfig!.voiceConfig as {
            voiceName?: string;
            analysis?: { detectEmotion?: boolean; detectSentiment?: boolean; detectDISC?: boolean };
          } | null | undefined;
          const dbAnalysis = dbVoiceConfig?.analysis;
          validatedVoiceConfig = {
            ...currentVoiceConfig,
            model: dbSiteConfig!.modelName || currentVoiceConfig.model || process.env.GEMINI_MODEL_ID,
            voiceName: dbVoiceConfig?.voiceName ?? currentVoiceConfig.voiceName,
            ...(dbAnalysis && {
              enableAnalysis: {
                emotion: dbAnalysis.detectEmotion ?? currentVoiceConfig.enableAnalysis.emotion,
                sentiment: dbAnalysis.detectSentiment ?? currentVoiceConfig.enableAnalysis.sentiment,
                disc: dbAnalysis.detectDISC ?? currentVoiceConfig.enableAnalysis.disc,
              },
            }),
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
              setProcessingOn();
            }
          } else if (msg.type === 'response') {
            setProcessingOff();
            if (msg.text) {
              addMessage('assistant', msg.text, msg.metadata);
            } else if (msg.metadata?.tool_type) {
              // Tool result without text (e.g. map, business intelligence)
              addMessage('assistant', undefined, msg.metadata);
            }
          } else if (msg.type === 'error') {
            setProcessingOff();
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
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
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
    setProcessingOn();

    try {
      clientRef.current.endSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT stop error:", err);
      setProcessingOff();
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
        {/* Left: owner mode back, or Menu (single entry to overlay) */}
        <div className="flex items-center shrink-0">
          {ownerMode && onExitOwnerMode ? (
            <button
              onClick={onExitOwnerMode}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors flex items-center gap-1.5 text-sm" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors flex items-center gap-1.5 text-sm"}
              title="Back to conversation"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowMenuOverlay((v) => !v)}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
              title="Menu"
              data-concierge-menu="overlay"
              aria-expanded={showMenuOverlay}
              aria-haspopup="dialog"
              aria-controls="concierge-menu-overlay"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        {/* Center: Command Center title when owner mode, else Clear Voice logo + status */}
        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          {ownerMode ? (
            <span className="text-white font-semibold flex items-center gap-2">
              <Bot size={20} className="text-indigo-400" />
              Command Center
            </span>
          ) : (
            <>
              <img src={headerLogo} alt="Clear Voice AI" className={isSovereign ? 'h-10 w-auto object-contain' : 'h-11 w-auto object-contain'} />
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'connected'
                  ? (isSovereign ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50')
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
              }`} />
            </>
          )}
        </div>
        {/* Right: layout cycle only (no close X — use layout minimize to collapse) */}
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
                    ? `${Math.max(4, volumeLevel * 200 * (1 + Math.sin((i + animationTick) / 2)))}px`
                    : isProcessing
                    ? `${20 + Math.sin((i + animationTick * 0.5) * 0.5) * 16}px`
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

      {/* 3. CONTENT WINDOW: outer constrains height so overlay never covers header/footer. Inner is the only scroll container. */}
      <div
        className={`flex-1 min-h-0 flex flex-col border-t overflow-hidden relative ${
          isSovereign ? 'bg-white border-slate-200' : 'bg-slate-50 border-gray-200'
        }`}
        style={{ minHeight: 0 }}
      >
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden concierge-content-scroll relative"
          style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}
        >
        {/* Menu overlay: strictly inside this content box so panel header and footer stay visible. */}
        {showMenuOverlay && (
          <motion.div
            id="concierge-menu-overlay"
            role="dialog"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${isSovereign ? 'bg-[#0F172A]' : 'bg-slate-900'} backdrop-blur-sm`}
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-500/60 shrink-0">
              <span className="font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => { setShowMenuOverlay(false); setMenuDrillDown(null); }}
                className="px-3 py-1.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {menuDrillDown === null ? (
                /* First screen: Admin | User | Public Agents only */
                <>
                  <button type="button" onClick={() => setMenuDrillDown('admin')} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-4 text-left text-white hover:bg-white/10">
                    <Shield size={20} className="text-slate-300 shrink-0" /> <span className="font-medium">Admin</span> <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                  <button type="button" onClick={() => setMenuDrillDown('user')} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-4 text-left text-white hover:bg-white/10">
                    <User size={20} className="text-slate-300 shrink-0" /> <span className="font-medium">User</span> <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                  <button type="button" onClick={() => setMenuDrillDown('public')} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-4 text-left text-white hover:bg-white/10">
                    <Bot size={20} className="text-slate-300 shrink-0" /> <span className="font-medium">Public Agents</span> <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                </>
              ) : menuDrillDown === 'admin' ? (
                <>
                  <button type="button" onClick={() => setMenuDrillDown(null)} className="flex items-center gap-2 text-slate-300 hover:text-white mb-4">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">Admin</h3>
                    <div className="space-y-1">
                      <button type="button" onClick={() => { setShowSettings(true); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <Settings size={18} className="text-slate-300" /> <span>Voice settings</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                      {onOpenAdmin && (
                        <>
                          <button type="button" onClick={() => { onOpenAdmin(); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                            <Shield size={18} className="text-slate-300" /> <span>Admin</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                          </button>
                          <button type="button" onClick={() => { onOpenAdmin('identity-manager'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                            <Bot size={18} className="text-slate-300" /> <span>Identity Manager</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                          </button>
                          <button type="button" onClick={() => { onOpenAdmin('identity-manager'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                            <QrCode size={18} className="text-slate-300" /> <span>QR codes & decals</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                          </button>
                          <button type="button" onClick={() => { onNavigate?.('/compliance-gateway'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                            <Phone size={18} className="text-slate-300" /> <span>Agents — Telephony</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                </>
              ) : menuDrillDown === 'user' ? (
                <>
                  <button type="button" onClick={() => setMenuDrillDown(null)} className="flex items-center gap-2 text-slate-300 hover:text-white mb-4">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">User</h3>
                    <div className="space-y-1">
                      {onShareClick && (
                        <button type="button" onClick={() => { onShareClick(); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                          <Share2 size={18} className="text-slate-300" /> <span>Share</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                        </button>
                      )}
                      <button type="button" onClick={() => { onMyAccountClick?.(); setShowMenuOverlay(false); if (!onMyAccountClick) { setEmbeddedView(embedViewsInPanel ? 'profile' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/my-account'); } }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <User size={18} className="text-slate-300" /> <span>Profile</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                      <button type="button" onClick={() => { onNavigate?.('/compliance-gateway'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <Shield size={18} className="text-slate-300" /> <span>Compliance</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'my-businesses' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/my-account'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <Building2 size={18} className="text-slate-300" /> <span>My Businesses</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'billing' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/billing'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <CreditCard size={18} className="text-slate-300" /> <span>Billing</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'reseller' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/mixing-board'); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <Users size={18} className="text-slate-300" /> <span>Referral Program</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                      </button>
                    </div>
                  </section>
                </>
              ) : (
                /* Public Agents: list only — click to interact; no Telephony, no "Chat with AI Biz Bot" */
                <>
                  <button type="button" onClick={() => setMenuDrillDown(null)} className="flex items-center gap-2 text-slate-300 hover:text-white mb-4">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">Public Agents</h3>
                    <p className="text-xs text-slate-400 mb-3">Tap an agent to interact.</p>
                    <div className="space-y-2">
                      <button type="button" onClick={() => setShowMenuOverlay(false)} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <MessageSquare size={18} className="text-slate-300 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">Manifesto</span>
                          <p className="text-xs text-slate-400 mt-0.5">Voice concierge for this business</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-400 shrink-0" />
                      </button>
                      <button type="button" onClick={() => setShowMenuOverlay(false)} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                        <Bot size={18} className="text-slate-300 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium">AI Biz Bot</span>
                          <p className="text-xs text-slate-400 mt-0.5">Platform assistant</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-400 shrink-0" />
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        )}

        {!showMenuOverlay && ownerMode && (onNavigate || embedViewsInPanel) ? (
          embeddedView ? (
            <div className="flex flex-col h-full min-h-0">
              <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b ${isSovereign ? 'border-slate-200 bg-slate-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={() => setEmbeddedView(null)}
                  className={`flex items-center gap-1.5 text-sm font-medium ${isSovereign ? 'text-slate-700 hover:text-indigo-600' : 'text-gray-700 hover:text-indigo-600'}`}
                  data-testid="button-back-command-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Command Center
                </button>
              </div>
              <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-b-sui ${embeddedView === 'billing' ? 'bg-white' : 'bg-slate-950'}`}>
                {embeddedView === 'profile' && <ProfileContent section="profile" />}
                {embeddedView === 'billing' && <BillingContentWithStripe />}
                {embeddedView === 'my-businesses' && <ProfileContent section="my-businesses" />}
                {embeddedView === 'reseller' && <MixingBoardContent />}
              </div>
            </div>
          ) : (
          <div className="p-4 space-y-4 overflow-y-auto">
            <p className={`text-sm ${isSovereign ? 'text-slate-600' : 'text-slate-500'}`}>
              One place for account, agents, and referral program.
            </p>
            {/* ——— Admin ——— */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-200 pb-1">Admin</h3>
              <div className="space-y-1">
                {/* Account */}
                <div>
                  <button type="button" onClick={() => setExpandedAdminAccount(!expandedAdminAccount)} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                    <User className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="font-medium text-slate-900">Account</span>
                    {expandedAdminAccount ? <ChevronDown className="w-4 h-4 ml-auto rotate-180" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                  </button>
                  {expandedAdminAccount && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'profile' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/my-account'); }} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Profile</button>
                      <button type="button" onClick={() => onNavigate?.('/compliance-gateway')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">A2P Compliance</button>
                      <button type="button" onClick={() => onNavigate?.('/aibizbot')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Globals</button>
                    </div>
                  )}
                </div>
                {/* Agents */}
                <div>
                  <button type="button" onClick={() => setExpandedAdminAgents(!expandedAdminAgents)} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                    <Bot className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="font-medium text-slate-900">Agents</span>
                    {expandedAdminAgents ? <ChevronDown className="w-4 h-4 ml-auto rotate-180" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                  </button>
                  {expandedAdminAgents && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      <div className="py-1"><span className="text-xs font-medium text-slate-500">Manifesto</span><button type="button" onClick={() => setEmbeddedView(null)} className="block text-sm text-slate-700 hover:text-indigo-600 flex items-center gap-1"><Phone className="w-3 h-3" /> Telephony</button></div>
                      <div className="py-1"><span className="text-xs font-medium text-slate-500">AI BIZ BOT</span><button type="button" onClick={() => setEmbeddedView(null)} className="block text-sm text-slate-700 hover:text-indigo-600 flex items-center gap-1"><Phone className="w-3 h-3" /> Telephony</button></div>
                    </div>
                  )}
                </div>
                {/* Referral Program (Admin) */}
                <div>
                  <button type="button" onClick={() => setExpandedAdminReferral(!expandedAdminReferral)} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                    <Users className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="font-medium text-slate-900">Referral Program</span>
                    {expandedAdminReferral ? <ChevronDown className="w-4 h-4 ml-auto rotate-180" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                  </button>
                  {expandedAdminReferral && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'reseller' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/mixing-board'); }} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Dashboard</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Affiliates</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Customers</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Commissions</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Invite Tool</button>
                    </div>
                  )}
                </div>
              </div>
            </section>
            {/* ——— User ——— */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-200 pb-1">User</h3>
              <div className="space-y-1">
                {onShareClick && (
                  <button type="button" onClick={onShareClick} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                    <Share2 className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="font-medium text-slate-900">Share</span>
                  </button>
                )}
                <button type="button" onClick={() => { onMyAccountClick?.(); if (!onMyAccountClick) { setEmbeddedView(embedViewsInPanel ? 'profile' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/my-account'); } }} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                  <User className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-900">Profile</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
                <button type="button" onClick={() => { setEmbeddedView(null); onNavigate?.('/compliance-gateway'); }} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                  <Shield className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-900">Compliance</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
                <button type="button" onClick={() => setEmbeddedView(null)} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                  <Phone className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-900">Telephony</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
                <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'my-businesses' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/my-account'); }} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                  <Building2 className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-900">My Businesses</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
                <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'billing' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/billing'); }} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                  <CreditCard className="w-5 h-5 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-900">Billing</span>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
                {/* Referral Program (User) */}
                <div>
                  <button type="button" onClick={() => setExpandedUserReferral(!expandedUserReferral)} className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}>
                    <Users className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="font-medium text-slate-900">Referral Program</span>
                    {expandedUserReferral ? <ChevronDown className="w-4 h-4 ml-auto rotate-180" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                  </button>
                  {expandedUserReferral && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                      <button type="button" onClick={() => { setEmbeddedView(embedViewsInPanel ? 'reseller' : null); if (!embedViewsInPanel && onNavigate) onNavigate('/mixing-board'); }} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Dashboard</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Referrals</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Team Members</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Invite Tool</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Commission Level</button>
                      <button type="button" onClick={() => onNavigate?.('/mixing-board')} className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600">Payouts</button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          )
        ) : messages.length === 0 ? (
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
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                onHistoryClick?.() ?? onNavigate?.('/compliance-gateway');
              } else {
                onSmsConsentClick?.() ?? onNavigate?.('/login');
              }
            }}
            className={isSovereign
              ? 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors'
              : 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200'
            }
            title={isAuthenticated ? 'Call history' : 'Sign in or register for SMS'}
          >
            <History size={16} />
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
                    ? 'bg-indigo-500/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-600/80 hover:bg-slate-700/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-sm'
                }`
              : `w-[50%] h-14 rounded-2xl font-semibold text-sm transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none ${
                  isRecording
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/50 ring-2 ring-blue-300/50'
                    : isProcessing
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-blue-600 hover:to-blue-700'
                }`
            }
          >
            <span className="flex items-center justify-center gap-2">
              <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
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
          const next = {
            ...currentVoiceConfig,
            ...newConfig,
            ...(newConfig.analysis && {
              enableAnalysis: {
                emotion: newConfig.analysis.detectEmotion ?? currentVoiceConfig.enableAnalysis.emotion,
                sentiment: newConfig.analysis.detectSentiment ?? currentVoiceConfig.enableAnalysis.sentiment,
                disc: newConfig.analysis.detectDISC ?? currentVoiceConfig.enableAnalysis.disc,
              },
            }),
          };
          setCurrentVoiceConfig(next);
          addMessage('system', 'Settings updated. Reconnecting...');
          const canPersist = siteConfigId && siteConfigId !== 'platform-landing' && siteConfigId !== 'platform_landing' && siteConfigId !== 'platform' && siteConfigId !== '';
          if (canPersist) {
            fetch(`/api/site-configs/${siteConfigId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
              voiceConfig: {
                voiceName: next.voiceName,
                analysis: {
                  detectEmotion: next.enableAnalysis.emotion,
                  detectSentiment: next.enableAnalysis.sentiment,
                  detectDISC: next.enableAnalysis.disc,
                },
              },
            }) }).catch((err) => console.warn('[ConciergePanel] Failed to persist voice config:', err));
          }
        }}
        onOpenAgentSettings={onOpenAdmin}
        siteConfigId={siteConfigId}
      />
      )}
    </PanelWrapper>
  );
};