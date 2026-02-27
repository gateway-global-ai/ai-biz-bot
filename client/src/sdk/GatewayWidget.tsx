/**
 * client/src/sdk/GatewayWidget.tsx
 *
 * The smart wrapper component for the Gateway Global Web SDK.
 *
 * Responsibilities:
 *  1. Fetch the site configuration from the platform using the siteId.
 *  2. Map the raw site config to the typed props that ConciergePanel expects.
 *  3. Render a floating launcher button (inline styles — no Tailwind dependency)
 *     that opens/closes the full ConciergePanel.
 *  4. Support 3-mode layout cycling (floating → fixed → fullscreen → floating)
 *     as required by the chat-ptt-requirements rule.
 *
 * All API calls use resolvePlatformUrl() so they call home to the platform
 * regardless of which third-party domain is hosting this widget.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ConciergePanel } from '../components/chat/ConciergePanel';
import { resolvePlatformUrl } from './platformConfig';
import type { BusinessContext, AgentConfig, VoiceConfig } from '../types/voice';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GatewayWidgetProps {
  /** The UUID of the site_configs record — comes from data-site-id on the script tag. */
  siteId: string;
}

type LayoutMode = 'floating' | 'fixed' | 'fullscreen';

interface SiteConfigPayload {
  id: string;
  name: string;
  placeId: string | null;
  placeData: Record<string, any> | null;
  assignedAgentId: string | null;
  systemPromptOverride: string | null;
  widgetColor: string | null;
  widgetPosition: string | null;
  greetingMessage: string | null;
  chatbotEnabled: boolean;
  voiceConciergeEnabled: boolean;
  modelProvider: string | null;
  modelName: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const GatewayWidget: React.FC<GatewayWidgetProps> = ({ siteId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('floating');
  const [siteConfig, setSiteConfig] = useState<SiteConfigPayload | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  // ── Fetch site config on mount ──────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        // Uses the Handover Service endpoint — modular, already has the CORS header.
        const res = await fetch(resolvePlatformUrl(`/api/site-configs/${siteId}`), {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
          console.error(`[Gateway SDK] Config fetch failed (${res.status}) for site: ${siteId}`);
          setLoadState('error');
          return;
        }

        const data: SiteConfigPayload = await res.json();
        setSiteConfig(data);
        setLoadState('ready');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[Gateway SDK] Failed to load site config:', err);
          setLoadState('error');
        }
      }
    };

    load();
    return () => controller.abort();
  }, [siteId]);

  const cycleLayout = useCallback(() => {
    setLayoutMode(m =>
      m === 'floating' ? 'fixed' : m === 'fixed' ? 'fullscreen' : 'floating'
    );
  }, []);

  // Silent fail — never throw errors into the host page
  if (loadState !== 'ready' || !siteConfig) return null;
  if (!siteConfig.chatbotEnabled && !siteConfig.voiceConciergeEnabled) return null;

  // ── Build typed props from raw site config ────────────────────────────────
  const accentColor = siteConfig.widgetColor ?? '#2563eb';

  const business: BusinessContext = {
    id: siteConfig.id,
    placeId: siteConfig.placeId ?? '',
    name: siteConfig.name,
    address: (siteConfig.placeData as any)?.formatted_address ?? (siteConfig.placeData as any)?.address ?? '',
    hours: (siteConfig.placeData as any)?.opening_hours?.weekday_text?.join(', ') ?? undefined,
    services: (siteConfig.placeData as any)?.types ?? undefined,
    primaryColor: accentColor,
  };

  const agent: AgentConfig = {
    role: (siteConfig.placeData as any)?.types?.[0] ?? 'Business Assistant',
    personality: 'friendly',
    objectives: ['Help customers find information', 'Answer questions about the business'],
    constraints: ['Stay on topic for this business', 'Do not discuss competitors'],
  };

  const voiceConfig: VoiceConfig = {
    mode: siteConfig.voiceConciergeEnabled ? 'clear_voice' : 'standard_ptt',
    latency: 'ultra-low',
    bufferDelay: 800,
    enableAnalysis: { emotion: false, sentiment: false, disc: false },
    model: process.env.GEMINI_MODEL_ID ?? 'models/gemini-2.5-flash-native-audio-preview-12-2025',
  };

  // ── Position from site config ──────────────────────────────────────────
  const pos = siteConfig.widgetPosition ?? 'bottom-right';
  const isLeft = pos.includes('left');
  const isTop = pos.includes('top');

  const launcherStyle: React.CSSProperties = {
    all: 'initial' as any,
    position: 'fixed',
    zIndex: 2147483646,
    [isTop ? 'top' : 'bottom']: '24px',
    [isLeft ? 'left' : 'right']: '24px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: accentColor,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'system-ui, sans-serif',
  };

  return (
    <>
      {/* Floating launcher — only shown when the panel is closed */}
      {!isOpen && (
        <button
          style={launcherStyle}
          onClick={() => setIsOpen(true)}
          aria-label={`Chat with ${siteConfig.name}`}
          title={siteConfig.greetingMessage ?? `Chat with ${siteConfig.name}`}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
          }}
        >
          {/* Chat bubble SVG icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            style={{ width: '28px', height: '28px' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        </button>
      )}

      {/* Full ConciergePanel — mounts when open */}
      <ConciergePanel
        business={business}
        agent={agent}
        voiceConfig={voiceConfig}
        agentName={siteConfig.name}
        isOpen={isOpen}
        layoutMode={layoutMode}
        onClose={() => setIsOpen(false)}
        onCycleLayout={cycleLayout}
        zIndex={2147483647}
      />
    </>
  );
};

export default GatewayWidget;
