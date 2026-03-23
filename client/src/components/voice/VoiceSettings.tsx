/**
 * VoiceSettings - Advanced Voice AI Configuration Panel
 *
 * Provides real-time control and monitoring for Clear Voice Technology:
 * - Behavioral profile (DiSC / ARCH) when siteConfigId is provided
 * - Platform health (Database, Twilio, Gemini) in Performance tab
 * - Audio analysis toggles (emotion, sentiment, DISC) saved to site config
 * - Separate settings for Streaming vs PTT modes
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Radio,
  Waves,
  Activity,
  FileText,
  CheckCircle,
  Zap,
  BarChart3,
  Download,
  X,
  Bot,
  ExternalLink,
  RefreshCw,
  Server,
  Database,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { DiscRadar, ArchBreakdown } from '@/ui/charts';
import type { DiscScores, ArchProfile } from '@shared/schema';

// --- Types ---
interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, render inside parent (absolute inset-0). When false, viewport overlay (fixed inset-0). */
  contained?: boolean;
  currentMode: 'clear_voice' | 'standard';
  currentConfig: {
    analysis: {
      detectEmotion: boolean;
      detectSentiment: boolean;
      detectDISC: boolean;
    };
  };
  onConfigChange: (newConfig: any) => void;
  /** When set, show a CTA to open full AI Biz Bot settings (DiSC, ARCH, role, name). */
  onOpenAgentSettings?: () => void;
  /** When set, load agent for this site and show DiSC/ARCH behavioral profile. */
  siteConfigId?: string | null;
}

interface HealthCheck {
  service: string;
  status: string;
  message: string;
  nativeAudioPreviewPermit?: boolean;
  listModels?: boolean;
}

type EngineType = 'stream' | 'ptt';
type TabType = 'settings' | 'performance' | 'logs';

interface PerformanceMetric {
  timestamp: number;
  responseTime: number;
  cutoffDetected: boolean;
  phrase: string;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isOpen,
  onClose,
  contained = false,
  currentMode,
  currentConfig,
  onConfigChange,
  onOpenAgentSettings,
  siteConfigId
}) => {
  // --- State ---
  const [selectedEngine, setSelectedEngine] = useState<EngineType>('stream');
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  
  // Settings State
  const [enableEmotion, setEnableEmotion] = useState(currentConfig.analysis.detectEmotion);
  const [enableSentiment, setEnableSentiment] = useState(currentConfig.analysis.detectSentiment);
  const [enableDISC, setEnableDISC] = useState(currentConfig.analysis.detectDISC);
  
  // Performance State
  const [performanceLog, setPerformanceLog] = useState<PerformanceMetric[]>([]);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // --- Platform health (Performance tab) ---
  const { data: healthData, refetch: refetchHealth, isLoading: healthLoading } = useQuery<{
    status: string;
    checks: HealthCheck[];
    timestamp: string;
  }>({
    queryKey: ['/api/health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return res.json();
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  // --- Agent for behavioral profile (when siteConfigId provided) ---
  const { data: siteConfig } = useQuery({
    queryKey: ['/api/site-configs', siteConfigId],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isOpen && !!siteConfigId && siteConfigId !== 'platform' && siteConfigId !== 'platform-landing',
  });
  const assignedAgentId = (siteConfig as { assignedAgentId?: string } | null)?.assignedAgentId;

  const { data: agentsList } = useQuery({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen && !!siteConfigId && !!assignedAgentId,
  });
  const currentAgent = (agentsList as any[] | undefined)?.find((a: any) => a.id === assignedAgentId);

  const discScores: DiscScores | null = currentAgent
    ? {
        dominance: Number(currentAgent.dominance) ?? 50,
        influence: Number(currentAgent.influence) ?? 50,
        steadiness: Number(currentAgent.steadiness) ?? 50,
        conscientiousness: Number(currentAgent.conscientiousness) ?? 50,
      }
    : null;
  const archProfile: ArchProfile | null =
    currentAgent?.archProfile && typeof currentAgent.archProfile === 'object'
      ? {
          acknowledge: Number((currentAgent.archProfile as any).acknowledge) ?? 75,
          reflect: Number((currentAgent.archProfile as any).reflect) ?? 60,
          context: Number((currentAgent.archProfile as any).context) ?? 50,
          handoff: Number((currentAgent.archProfile as any).handoff) ?? 30,
        }
      : null;

  // --- Effects ---
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => captureMetrics(), 1000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  // Sync local toggles from props when panel opens or config changes
  useEffect(() => {
    if (isOpen && currentConfig?.analysis) {
      setEnableEmotion(currentConfig.analysis.detectEmotion);
      setEnableSentiment(currentConfig.analysis.detectSentiment);
      setEnableDISC(currentConfig.analysis.detectDISC);
    }
  }, [isOpen, currentConfig?.analysis?.detectEmotion, currentConfig?.analysis?.detectSentiment, currentConfig?.analysis?.detectDISC]);

  // --- Handlers ---
  const captureMetrics = () => {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      responseTime: 0,
      cutoffDetected: false,
      phrase: ''
    };
    setPerformanceLog(prev => [...prev.slice(-49), metric]);
  };

  const applySettings = () => {
    const newConfig = {
      analysis: {
        detectEmotion: enableEmotion,
        detectSentiment: enableSentiment,
        detectDISC: enableDISC
      }
    };
    onConfigChange(newConfig);
    addSystemLog(`✓ Settings applied`);
    addSystemLog(`🔄 Reconnecting voice engine...`);
    setTimeout(() => onClose(), 300);
  };

  const resetToDefaults = () => {
    setEnableEmotion(currentConfig.analysis.detectEmotion);
    setEnableSentiment(currentConfig.analysis.detectSentiment);
    setEnableDISC(currentConfig.analysis.detectDISC);
    addSystemLog(`↺ Reset to defaults`);
  };

  const addSystemLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  const exportLogs = () => {
    const data = {
      settings: { enableEmotion, enableSentiment, enableDISC },
      performance: performanceLog,
      systemLogs: systemLogs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-ai-logs-${Date.now()}.json`;
    a.click();
    addSystemLog('📥 Logs exported');
  };

  // --- Metrics Calculations ---
  const avgResponseTime = performanceLog.length 
    ? (performanceLog.reduce((sum, m) => sum + m.responseTime, 0) / performanceLog.length).toFixed(2)
    : '0.00';
  
  const cutoffRate = performanceLog.length
    ? ((performanceLog.filter(m => m.cutoffDetected).length / performanceLog.length) * 100).toFixed(1)
    : '0.0';

  if (!isOpen) return null;

  const panelContent = (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0F172A] border border-indigo-500/20 rounded-sui shadow-2xl">
      {/* Header — sticky so close is always visible */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/80 shrink-0 bg-[#0F172A]">
        <div className="flex items-center gap-3 min-w-0">
          {contained && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Back to chat"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Back to chat</span>
            </button>
          )}
          <div className="flex items-center gap-3 min-w-0">
            <Settings className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">Voice AI Settings</h2>
              <p className="text-xs text-slate-400 truncate">Clear Voice Control Panel</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Behavioral profile or CTA */}
      {(siteConfigId && (discScores || archProfile)) ? (
        <div className="px-4 pt-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Agent behavior</p>
            {onOpenAgentSettings && (
              <button
                type="button"
                onClick={() => { onOpenAgentSettings(); onClose(); }}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Edit in AI Biz Bot <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-sui bg-slate-900/40 border border-indigo-500/20">
            {discScores && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-1">DiSC</p>
                <DiscRadar data={discScores} className="h-32" />
              </div>
            )}
            {archProfile && (
              <div>
                <p className="text-[10px] font-medium text-slate-500 mb-1">ARCH</p>
                <ArchBreakdown data={archProfile} className="h-32" />
              </div>
            )}
          </div>
        </div>
      ) : onOpenAgentSettings ? (
        <div className="mx-4 mt-4 p-3 rounded-sui bg-slate-900/40 border border-indigo-500/20 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Manage agent behavior</p>
              <p className="text-xs text-slate-400">DiSC, ARCH, role, behavioral charts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onOpenAgentSettings(); onClose(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors shrink-0"
          >
            Open AI Biz Bot <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* Engine + Tabs — same structure as menu */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedEngine('stream')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sui text-sm font-medium transition-all ${
              selectedEngine === 'stream'
                ? 'bg-indigo-500/80 text-white border border-indigo-400/50'
                : 'bg-slate-800/60 text-slate-400 border border-slate-600/60 hover:bg-slate-700/60'
            }`}
          >
            <Waves className="w-4 h-4" />
            Stream
            {currentMode === 'clear_voice' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            type="button"
            onClick={() => setSelectedEngine('ptt')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sui text-sm font-medium transition-all ${
              selectedEngine === 'ptt'
                ? 'bg-indigo-500/80 text-white border border-indigo-400/50'
                : 'bg-slate-800/60 text-slate-400 border border-slate-600/60 hover:bg-slate-700/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            PTT
            {currentMode === 'standard' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
        <div className="flex gap-1">
          {[
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'logs', label: 'System Logs', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-sui bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">Response timing: platform default</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Silence detection uses Gateway Global AI default. Buffer tuned; no tuning required.
                </p>
              </div>
            </div>

            {selectedEngine === 'ptt' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Audio Analysis (PTT only)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Saved to your site and used by the voice engine during PTT.
                </p>
                <div className="space-y-1.5">
                  {[
                    { key: 'emotion', label: 'Emotion Detection', state: enableEmotion, setter: setEnableEmotion },
                    { key: 'sentiment', label: 'Sentiment Analysis', state: enableSentiment, setter: setEnableSentiment },
                    { key: 'disc', label: 'DISC Profiling', state: enableDISC, setter: setEnableDISC }
                  ].map(option => (
                    <label key={option.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-600/60 cursor-pointer hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={option.state}
                        onChange={(e) => option.setter(e.target.checked)}
                        className="w-4 h-4 text-indigo-500 rounded border-slate-600"
                      />
                      <span className="text-sm font-medium text-slate-200">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={applySettings}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-sui text-sm font-medium hover:bg-indigo-600 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Apply Settings
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                className="px-4 py-2.5 bg-slate-800/60 text-slate-300 rounded-sui text-sm font-medium border border-slate-600/60 hover:bg-slate-700/60 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Platform health</h3>
                <button
                  type="button"
                  onClick={() => refetchHealth()}
                  disabled={healthLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-800/60 text-slate-300 rounded-lg border border-slate-600/60 hover:bg-slate-700/60 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  Run health check
                </button>
              </div>
              {healthLoading ? (
                <div className="p-3 rounded-sui bg-slate-800/50 border border-slate-600/60 text-sm text-slate-400">Loading…</div>
              ) : healthData?.checks?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {healthData.checks.map((check: HealthCheck) => {
                    const isOk = check.status === 'ok';
                    const Icon = check.service === 'database' ? Database : check.service === 'twilio' ? MessageSquare : check.service === 'gemini' ? Zap : Server;
                    return (
                      <div
                        key={check.service}
                        className={`p-2.5 rounded-sui border flex items-start gap-2 ${
                          isOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isOk ? 'text-emerald-400' : 'text-red-400'}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium capitalize text-white">{check.service.replace(/_/g, ' ')}</p>
                          <p className={`text-[10px] ${isOk ? 'text-slate-400' : 'text-red-300'}`}>{check.message}</p>
                          {check.service === 'gemini' && check.nativeAudioPreviewPermit !== undefined && (
                            <p className="text-[10px] text-slate-500 mt-0.5">Native audio: {check.nativeAudioPreviewPermit ? 'Yes' : 'No'}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-sui bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  Run health check to see Database, Twilio, and Gemini status.
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-sui bg-slate-800/50 border border-indigo-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-400">Avg Response</span>
                </div>
                <div className="text-xl font-bold text-white">{avgResponseTime}s</div>
              </div>
              <div className={`p-3 rounded-sui border ${parseFloat(cutoffRate) < 5 ? 'bg-slate-800/50 border-emerald-500/30' : 'bg-slate-800/50 border-amber-500/30'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className={`w-4 h-4 ${parseFloat(cutoffRate) < 5 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-xs font-medium text-slate-400">Cutoff Rate</span>
                </div>
                <div className={`text-xl font-bold ${parseFloat(cutoffRate) < 5 ? 'text-emerald-400' : 'text-amber-400'}`}>{cutoffRate}%</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-sui bg-slate-800/50 border border-slate-600/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-white">Real-time monitoring</div>
                  <div className="text-[10px] text-slate-500">Capture metrics during sessions</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isMonitoring} onChange={(e) => setIsMonitoring(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
              </label>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent sessions</h3>
              <div className="rounded-sui bg-slate-800/50 border border-slate-600/60 max-h-48 overflow-y-auto">
                {performanceLog.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">No data yet. Enable monitoring and test voice.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-slate-400">Time</th>
                        <th className="px-2 py-1.5 text-left text-slate-400">Response</th>
                        <th className="px-2 py-1.5 text-left text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {performanceLog.slice().reverse().map((metric, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30">
                          <td className="px-2 py-1.5 text-slate-400">{new Date(metric.timestamp).toLocaleTimeString()}</td>
                          <td className="px-2 py-1.5 font-mono text-slate-200">{metric.responseTime.toFixed(2)}s</td>
                          <td className="px-2 py-1.5">{metric.cutoffDetected ? <span className="text-amber-400">⚠ Cutoff</span> : <span className="text-emerald-400">✓ Clean</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">System event log</h3>
              <button
                type="button"
                onClick={exportLogs}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-800/60 text-slate-300 rounded-lg border border-slate-600/60 hover:bg-slate-700/60"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
            <div className="rounded-sui bg-slate-950 border border-slate-700 p-3 font-mono text-[11px] text-emerald-400/90 h-72 overflow-y-auto">
              {systemLogs.length === 0 ? (
                <div className="text-slate-500">No logs yet. Apply settings or run tests.</div>
              ) : (
                systemLogs.map((log, idx) => <div key={idx} className="mb-0.5">{log}</div>)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (contained) {
    return (
      <div className="absolute inset-0 z-30 flex overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-w-0 bg-black/40 backdrop-blur-sm border-0 cursor-default"
          aria-label="Back to chat"
        />
        <div className="w-[85%] max-w-md flex flex-col overflow-hidden shrink-0">
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-sui shadow-2xl border border-indigo-500/20">
        {panelContent}
      </div>
    </div>
  );
}
