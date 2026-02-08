/**
 * Agent & Voice settings overlay for owners. Ported from ai-voice-sdk-v1 control patterns.
 * Single-action entry from System Options → opens this panel (Voice, Identity, System prompt).
 * Platform agent ID and config ID are shown as source of truth; all other fields are editable locally and synced via onUpdateBotConfig.
 */

import React, { useState, useEffect } from 'react';
import { BotConfig, AgentConfig, VoiceConfig } from '../types';

const VOICE_OPTIONS: { id: string; label: string; gender: string; description: string; recommendedFor: string }[] = [
  { id: 'Puck', label: 'Puck', gender: 'Male', description: 'Soft, well-rounded, and somewhat playful.', recommendedFor: 'Storytelling' },
  { id: 'Charon', label: 'Charon', gender: 'Male', description: 'Deeper, authoritative, and steady.', recommendedFor: 'News / Factual' },
  { id: 'Kore', label: 'Kore', gender: 'Female', description: 'Gentle, soothing, and empathetic.', recommendedFor: 'Wellness / Support' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Male', description: 'Energetic, fast-paced, and intense.', recommendedFor: 'Gaming / Action' },
  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', description: 'Bright, clear, and professional.', recommendedFor: 'Assistant / Business' },
];

const LANGUAGES = [
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
  { id: 'French', label: 'French', flag: '🇫🇷' },
  { id: 'German', label: 'German', flag: '🇩🇪' },
  { id: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
  { id: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
  { id: 'Portuguese', label: 'Portuguese', flag: '🇧🇷' },
];

interface AgentVoiceSettingsPanelProps {
  botConfig: BotConfig;
  onUpdateBotConfig: (config: Partial<BotConfig>) => void;
  onBack: () => void;
}

const AgentVoiceSettingsPanel: React.FC<AgentVoiceSettingsPanelProps> = ({
  botConfig,
  onUpdateBotConfig,
  onBack,
}) => {
  const [company, setCompany] = useState(botConfig.agentProfile.company ?? '');
  const [position, setPosition] = useState(botConfig.agentProfile.role ?? '');
  const [primaryObjective, setPrimaryObjective] = useState(botConfig.agentProfile.primaryObjective ?? '');
  const [basePrompt, setBasePrompt] = useState(botConfig.agentProfile.basePrompt ?? '');
  const [name, setName] = useState(botConfig.agentProfile.name ?? '');
  const [voiceName, setVoiceName] = useState<string>(botConfig.voiceConfig?.voiceName ?? 'Zephyr');
  const [language, setLanguage] = useState(botConfig.voiceConfig?.language ?? 'English');

  useEffect(() => {
    setCompany(botConfig.agentProfile.company ?? '');
    setPosition(botConfig.agentProfile.role ?? '');
    setPrimaryObjective(botConfig.agentProfile.primaryObjective ?? '');
    setBasePrompt(botConfig.agentProfile.basePrompt ?? '');
    setName(botConfig.agentProfile.name ?? '');
    setVoiceName(botConfig.voiceConfig?.voiceName ?? 'Zephyr');
    setLanguage(botConfig.voiceConfig?.language ?? 'English');
  }, [botConfig]);

  const apply = () => {
    onUpdateBotConfig({
      agentProfile: {
        ...botConfig.agentProfile,
        name: name.trim() || botConfig.agentProfile.name,
        role: position.trim() || botConfig.agentProfile.role,
        company: company.trim() || undefined,
        primaryObjective: primaryObjective.trim() || undefined,
        basePrompt: basePrompt.trim() || botConfig.agentProfile.basePrompt,
      },
      voiceConfig: {
        ...botConfig.voiceConfig,
        voiceName: (voiceName as VoiceConfig['voiceName']) || 'Zephyr',
        language: language || 'English',
        isPushToTalk: botConfig.voiceConfig?.isPushToTalk ?? true,
      },
    });
    onBack();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <h3 className="font-bold text-slate-800 text-lg">Agent & Voice</h3>
        <button onClick={apply} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors">Done</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Platform IDs - source of truth */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Platform (source of truth)</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Agent ID</span>
              <span className="font-mono text-slate-700 truncate" title={botConfig.botId}>{botConfig.botId}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Config ID</span>
              <span className="font-mono text-slate-700 truncate" title={botConfig.botConfigId}>{botConfig.botConfigId}</span>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1">
            <span className="text-emerald-600">Agent identity</span>
          </h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Define who the AI is</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Agent name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ava"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Company name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Your Business"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Agent position / role</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Concierge, Support Specialist"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Primary objective</label>
              <input
                type="text"
                value={primaryObjective}
                onChange={(e) => setPrimaryObjective(e.target.value)}
                placeholder="e.g. Help customers with orders and info"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Voice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Voice</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Model persona and language</p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Spoken language</label>
              <div className="grid grid-cols-4 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguage(lang.id)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                      language === lang.id ? 'bg-blue-500/10 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Voice persona</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoiceName(v.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      voiceName === v.id
                        ? 'bg-blue-500/10 border-blue-500 text-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{v.label}</span>
                      <span className="text-[10px] text-slate-500">{v.gender}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{v.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Best for: {v.recommendedFor}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System prompt */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1">System prompt</h4>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Additional context and guardrails</p>
          <textarea
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            placeholder="Enter detailed behavior instructions..."
            rows={5}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
          <p className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-slate-600">
            Identity and prompt are sent to the AI as system instruction. They define tone, knowledge limits, and tasks for the voice session.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentVoiceSettingsPanel;
