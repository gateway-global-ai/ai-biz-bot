/**
 * Standalone Clear Voice AI phone interface — lightweight, QR-codeable.
 *
 * Loads at /phone with URL params to connect to the Clear Voice AI network
 * without the full app (no sidebar, no business page). Intended for:
 * - Second default QR code: "Direct to Clear Voice chat"
 * - Embeddable / API-like usage (pass params, get full-screen PTT).
 *
 * Query params:
 * - siteConfigId (UUID): connect to this site's agent
 * - slug: resolve via GET /api/site-configs/by-slug/:slug then use id
 * If neither is provided, uses platform_landing (Gateway Global AI).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import type { BusinessContext, AgentConfig, VoiceConfig } from '@/types/voice';
import { Loader2, ExternalLink, Power } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import AIOSMark from '@/components/public/AIOSMark';

const DEFAULT_AGENT: AgentConfig = {
  role: 'Business Concierge',
  personality: 'Helpful, professional, and enthusiastic',
  objectives: [
    'Represent the business and assist customers',
    'Answer questions about services, hours, and location',
    'Help customers book appointments or place orders',
  ],
  constraints: [
    'Be polite and professional',
    'Keep responses concise and actionable',
    'Stay on topic about the business',
  ],
};

const PLATFORM_BUSINESS: BusinessContext = {
  id: 'platform_landing',
  placeId: '',
  name: 'Gateway Global AI',
  address: 'AI-Powered Business Platform',
  hours: '24/7 Support Available',
  services: ['AI Concierge', 'Business Automation', 'Voice Agents'],
  primaryColor: '#6366f1',
};

export default function PhonePage() {
  const [location, setLocation] = useLocation();
  const [isStarted, setIsStarted] = useState(false);
  const [siteConfig, setSiteConfig] = useState<{
    id: string;
    name: string;
    placeId?: string | null;
    placeData?: any;
    systemPromptOverride?: string | null;
    voiceConfig?: any;
    modelName?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const q = new URLSearchParams(window.location.search);
    return {
      siteConfigId: q.get('siteConfigId') || q.get('site') || undefined,
      slug: q.get('slug') || undefined,
    };
  }, [location]);

  useEffect(() => {
    const { siteConfigId, slug } = params;

    if (siteConfigId) {
      fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}`)
        .then((r) => {
          if (!r.ok) throw new Error('Site not found');
          return r.json();
        })
        .then((config) => {
          setSiteConfig({
            id: config.id,
            name: config.name,
            placeId: config.placeId,
            placeData: config.placeData,
            systemPromptOverride: config.systemPromptOverride,
            voiceConfig: config.voiceConfig,
            modelName: config.modelName,
          });
        })
        .catch((err) => setError(err.message || 'Failed to load site'))
        .finally(() => setLoading(false));
      return;
    }

    if (slug) {
      fetch(`/api/site-configs/by-slug/${encodeURIComponent(slug)}`)
        .then((r) => {
          if (!r.ok) throw new Error('Site not found');
          return r.json();
        })
        .then((config) => {
          setSiteConfig({
            id: config.id,
            name: config.name,
            placeId: config.placeId,
            placeData: config.placeData,
            systemPromptOverride: config.systemPromptOverride,
            voiceConfig: config.voiceConfig,
            modelName: config.modelName,
          });
        })
        .catch((err) => setError(err.message || 'Failed to load site'))
        .finally(() => setLoading(false));
      return;
    }

    // No params: redirect to /agents onboarding landing
    setLocation('/agents');
  }, [params.siteConfigId, params.slug]);

  const business: BusinessContext = useMemo(() => {
    if (!siteConfig) return PLATFORM_BUSINESS;
    const place = (siteConfig.placeData as any) || {};
    return {
      id: siteConfig.id,
      placeId: siteConfig.placeId || '',
      name: siteConfig.name,
      address: place.formatted_address || place.address || '',
      hours: place.opening_hours?.weekday_text?.join(', '),
      services: place.types,
      primaryColor: '#6366f1',
      systemPromptOverride: siteConfig.systemPromptOverride ?? undefined,
    };
  }, [siteConfig]);

  const voiceConfig: VoiceConfig = useMemo(() => {
    const base = VoiceClientFactory.getDefaultConfig('premium');
    const db = siteConfig?.voiceConfig;
    const dbAnalysis = db?.analysis;
    return {
      ...base,
      model: siteConfig?.modelName || base.model || undefined,
      voiceName: db?.voiceName ?? base.voiceName,
      ...(dbAnalysis && {
        enableAnalysis: {
          emotion: dbAnalysis.detectEmotion ?? base.enableAnalysis?.emotion ?? false,
          sentiment: dbAnalysis.detectSentiment ?? base.enableAnalysis?.sentiment ?? false,
          disc: dbAnalysis.detectDISC ?? base.enableAnalysis?.disc ?? false,
        },
      }),
    };
  }, [siteConfig]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0F172A] flex flex-col items-center justify-center gap-4 z-[100]">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" aria-hidden />
        <p className="text-slate-400 text-sm">Connecting to Clear Voice AI...</p>
      </div>
    );
  }

    if (error) {
    return (
      <div className="fixed inset-0 bg-[#0F172A] flex flex-col items-center justify-center gap-4 z-[100] p-6">
        <p className="text-amber-400 text-center">{error}</p>
        <Link href="/agents">
          <a className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Create or demo an agent
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0F172A] z-[100] flex flex-col">
      {isStarted ? (
        <ConciergePanel
          business={business}
          agent={DEFAULT_AGENT}
          voiceConfig={voiceConfig}
          agentName={siteConfig?.name ?? 'Concierge'}
          initialView="voice"
          isOpen={true}
          layoutMode="fullscreen"
          onClose={() => setLocation('/business')}
          onCycleLayout={() => {}}
          transferUrl={typeof window !== 'undefined' ? window.location.href : '/phone'}
          transferTitle="Share This Voice Demo"
          transferDescription="Open the share menu to send this phone experience to another device."
          autoStartPttOnOpen={true}
          variant="sovereign"
          zIndex={100}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8">
              <AIOSMark />
            </div>
            <button
              type="button"
              onClick={() => setIsStarted(true)}
              className="group relative flex h-36 w-36 flex-col items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 shadow-[0_28px_60px_rgba(15,23,42,0.35)] transition duration-300 hover:scale-[1.02] hover:text-white"
            >
              <span className="pointer-events-none absolute inset-[-10px] rounded-full border border-slate-700/70" />
              <span className="pointer-events-none absolute inset-[-20px] rounded-full border border-slate-800/60 opacity-80 group-hover:shadow-[0_0_28px_rgba(99,102,241,0.22)]" />
              <Power className="mb-3 h-9 w-9 text-indigo-300 transition group-hover:text-indigo-200" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.42em]">
                Start
              </span>
            </button>
          </div>
        </div>
      )}
      {/* Minimal exit: top-right link so it doesn't cover PTT */}
      <div className="absolute top-3 right-14 z-[101] pointer-events-none">
        <Link href="/agents">
          <a
            className="pointer-events-auto text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
            aria-label="Get started with an agent"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Get started
          </a>
        </Link>
      </div>
    </div>
  );
}
