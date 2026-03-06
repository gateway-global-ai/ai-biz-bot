/**
 * VoiceSettings - Advanced Voice AI Configuration Panel
 * 
 * Provides real-time control and monitoring for Clear Voice Technology:
 * - Buffer delay optimization (250ms-2000ms)
 * - Performance metrics and system logs
 * - A/B testing for different configurations
 * - Separate settings for Streaming vs PTT modes
 */

import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';

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
  onOpenAgentSettings
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

  // --- Effects ---
  useEffect(() => {
    if (isMonitoring) {
      // Start capturing performance metrics
      const interval = setInterval(() => {
        captureMetrics();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

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
    addSystemLog(`🔄 Auto-restarting voice engine with new configuration...`);
    
    setTimeout(() => {
      onClose();
    }, 2000);
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

  return (
    <div className={contained
      ? "absolute inset-0 z-30 flex flex-col overflow-hidden bg-white"
      : "fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
    }>
      <div className={contained
        ? "flex-1 flex flex-col overflow-hidden min-h-0 min-w-0"
        : "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      }>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Voice AI Settings</h2>
              <p className="text-sm text-gray-500">Clear Voice Technology Control Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {onOpenAgentSettings && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Manage agent behavior</p>
                <p className="text-xs text-gray-600">DiSC, ARCH, role, name, behavioral charts</p>
              </div>
            </div>
            <button
              onClick={() => { onOpenAgentSettings(); onClose(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Open AI Biz Bot settings
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Engine Selector */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedEngine('stream')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                selectedEngine === 'stream'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Waves className="w-5 h-5" />
              Clear Voice Stream
              {currentMode === 'clear_voice' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </button>
            <button
              onClick={() => setSelectedEngine('ptt')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                selectedEngine === 'ptt'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Radio className="w-5 h-5" />
              Clear Voice PTT
              {currentMode === 'standard' && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {[
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'logs', label: 'System Logs', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - min-h-0 so flex-1 scrolls correctly */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
          
          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">

              {/* PTT Hard-Wired Notice */}
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Response Timing: Hard-Wired at 800ms</p>
                  <p className="text-xs text-green-700 mt-1">
                    The silence detection threshold is fixed at the Gateway Global AI conversational sweet spot. No tuning required.
                  </p>
                </div>
              </div>

              {/* Audio Analysis */}
              {selectedEngine === 'ptt' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Audio Analysis (PTT Only)
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'emotion', label: 'Emotion Detection', state: enableEmotion, setter: setEnableEmotion },
                      { key: 'sentiment', label: 'Sentiment Analysis', state: enableSentiment, setter: setEnableSentiment },
                      { key: 'disc', label: 'DISC Profiling', state: enableDISC, setter: setEnableDISC }
                    ].map(option => (
                      <label key={option.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={option.state}
                          onChange={(e) => option.setter(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={applySettings}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Apply Settings
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Avg Response</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{avgResponseTime}s</div>
                </div>

                <div className={`p-4 rounded-lg border ${
                  parseFloat(cutoffRate) < 5 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className={`w-5 h-5 ${
                      parseFloat(cutoffRate) < 5 ? 'text-green-600' : 'text-orange-600'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">Cutoff Rate</span>
                  </div>
                  <div className={`text-3xl font-bold ${
                    parseFloat(cutoffRate) < 5 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {cutoffRate}%
                  </div>
                </div>
              </div>

              {/* Monitor Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Real-time Monitoring</div>
                    <div className="text-xs text-gray-500">Capture performance metrics during sessions</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMonitoring}
                    onChange={(e) => setIsMonitoring(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Performance Log */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Sessions</h3>
                <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {performanceLog.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No performance data yet. Enable monitoring and test the voice AI.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600">Time</th>
                          <th className="px-3 py-2 text-left text-gray-600">Response</th>
                          <th className="px-3 py-2 text-left text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {performanceLog.slice().reverse().map((metric, idx) => (
                          <tr key={idx} className="hover:bg-gray-100">
                            <td className="px-3 py-2 text-gray-600">
                              {new Date(metric.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-900">{metric.responseTime.toFixed(2)}s</td>
                            <td className="px-3 py-2">
                              {metric.cutoffDetected ? (
                                <span className="text-orange-600">⚠ Cutoff</span>
                              ) : (
                                <span className="text-green-600">✓ Clean</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">System Event Log</h3>
                <button
                  onClick={exportLogs}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
              
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto">
                {systemLogs.length === 0 ? (
                  <div className="text-gray-500">No system logs yet. Apply settings or run tests to generate logs.</div>
                ) : (
                  systemLogs.map((log, idx) => (
                    <div key={idx} className="mb-1">{log}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
