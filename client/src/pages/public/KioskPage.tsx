import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { ConciergePanel } from '../../components/chat/ConciergePanel';
import type { BusinessContext, AgentConfig, VoiceConfig } from '../../types/voice';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  mapData?: any;
  timestamp: number;
  metadata?: any;
}

// Default configs for fallback
const DEFAULT_BUSINESS: BusinessContext = {
  id: '',
  name: 'Gateway Global AI',
  address: 'Platform HQ',
  phone: '',
  hours: '24/7',
  services: ['AI Automation', 'Voice Agents', 'Business Intelligence'],
};

const DEFAULT_AGENT: AgentConfig = {
  name: 'Gateway AI',
  role: 'Platform Assistant',
  personality: 'Professional, helpful, and knowledgeable about AI business solutions.',
  objectives: ['Assist users', 'Provide information', 'Demonstrate capabilities'],
  constraints: ['Be polite', 'Be concise'],
};

const DEFAULT_VOICE: VoiceConfig = {
  provider: 'gemini',
  voiceName: 'Puck',
  model: 'gemini-2.0-flash-exp', // Will be overridden by server env
  mode: 'clear_voice',
  enableAnalysis: {
    emotion: true,
    sentiment: true,
    disc: true,
  },
};

export default function KioskPage() {
  const [, params] = useRoute('/kiosk/:slug');
  const slug = params?.slug;
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      fetch(`/api/site-configs/by-slug/${slug}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load site config');
          return res.json();
        })
        .then(data => {
          setSiteConfig(data);
        })
        .catch(err => {
          console.error("Failed to fetch site config:", err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [slug]);

  // Construct business context from site config or defaults
  const business = React.useMemo<BusinessContext>(() => siteConfig ? {
    id: siteConfig.id,
    name: siteConfig.name,
    address: siteConfig.placeData?.formatted_address || siteConfig.placeData?.address || '',
    phone: siteConfig.placeData?.formatted_phone_number || siteConfig.placeData?.phone || '',
    hours: siteConfig.placeData?.opening_hours?.weekday_text?.join('\n') || '',
    services: siteConfig.placeData?.types || [],
  } : DEFAULT_BUSINESS, [siteConfig]);

  // Construct agent config
  const agent = React.useMemo<AgentConfig>(() => siteConfig?.agentConfig ? {
    name: siteConfig.agentConfig.name || DEFAULT_AGENT.name,
    role: siteConfig.agentConfig.role || DEFAULT_AGENT.role,
    personality: siteConfig.agentConfig.basePrompt || DEFAULT_AGENT.personality,
    objectives: DEFAULT_AGENT.objectives,
    constraints: DEFAULT_AGENT.constraints,
  } : DEFAULT_AGENT, [siteConfig]);

  // Construct voice config
  const voiceConfig = React.useMemo<VoiceConfig>(() => siteConfig?.voiceConfig ? {
    ...DEFAULT_VOICE,
    voiceName: siteConfig.voiceConfig.voiceName || DEFAULT_VOICE.voiceName,
    ...(siteConfig.voiceConfig.analysis ? {
      enableAnalysis: {
        emotion: siteConfig.voiceConfig.analysis.detectEmotion ?? true,
        sentiment: siteConfig.voiceConfig.analysis.detectSentiment ?? true,
        disc: siteConfig.voiceConfig.analysis.detectDISC ?? true,
      }
    } : {})
  } : DEFAULT_VOICE, [siteConfig]);

  const initialMessages = React.useMemo<ChatMessage[]>(() => [
    {
      id: 'kiosk-welcome',
      role: 'assistant',
      timestamp: Date.now(),
      metadata: { tool_type: 'kiosk_onboarding' }
    }
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900">
      <ConciergePanel
        isOpen={true}
        layoutMode="fullscreen"
        onClose={() => {}} // No-op for kiosk mode
        business={business}
        agent={agent}
        voiceConfig={voiceConfig}
        agentName={agent.name}
        variant="sovereign"
        showOwnerControls={false} // Hide admin controls for public kiosk
        autoStartPttOnOpen={false} // Let user initiate
        publicSlug={slug}
        initialMessages={initialMessages}
      />
    </div>
  );
}
