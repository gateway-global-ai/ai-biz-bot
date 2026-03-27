import { useEffect, useState, useMemo, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { BusinessHeroIdle } from '@/components/biz/BusinessHeroIdle';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { useAuth } from '@/lib/auth';
import { buildConciergeBusinessFromSite } from '@/lib/conciergeBusinessContext';
import type { OSCapabilities } from '@/hooks/useOSMenu';

/**
 * PublicBusinessPage — /biz/:slug
 *
 * The ConciergePanel IS the interface. It runs fullscreen (100vw × 100vh),
 * always open. BusinessHeroIdle fills the canvas when no conversation is active.
 *
 * Voice AI flow:
 *   1. User taps "Voice AI" → button locks, sets autoGreet=true
 *   2. ConciergePanel connects to Gemini Live
 *   3. Once connected, sends a hidden text greeting trigger (NO mic opened)
 *   4. AI speaks its introduction
 *   5. User holds PTT button to ask questions
 */
export default function PublicBusinessPage() {
  const [, params] = useRoute('/biz/:slug');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const slug = params?.slug;

  const [siteData, setSiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteCapabilities, setSiteCapabilities] = useState<OSCapabilities>({
    booking: false, account: false, sms: false, payments: false, reviews: false, loyalty: false,
  });

  // True once user taps "Voice AI" — triggers hidden greeting, never opens mic
  const [autoGreet, setAutoGreet] = useState(false);

  const menuActionRef = useRef<((viewId: string) => void) | null>(null);

  // Capture referrer UUID from ?ref= and persist for the session
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) sessionStorage.setItem('shareRef', ref);
  }, []);

  // Deep-link: if QR code includes ?view=<viewId>, open that canvas view on mount
  useEffect(() => {
    const viewParam = new URLSearchParams(window.location.search).get('view');
    if (!viewParam) return;
    // Wait a tick for menuActionRef to be wired by ConciergePanel
    const timer = setTimeout(() => {
      menuActionRef.current?.(viewParam);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const qp = new URLSearchParams(window.location.search);
    const fromQr = qp.get('from') === 'qr';
    const modeFromQr = qp.get('mode') as any | null;
    fetch(`/api/site-configs/by-slug/${encodeURIComponent(slug)}${fromQr ? '?from=qr' : ''}`)
      .then(r => {
        if (!r.ok) throw new Error('Business not found');
        return r.json();
      })
      .then((data: any) => {
        const { readiness_gate_v1, ...sitePayload } = data;
        void readiness_gate_v1; // Soft v1: server attaches readiness_gate_v1; strip so Concierge payload stays unchanged
        if (modeFromQr && !sitePayload.workspaceState) sitePayload.workspaceState = modeFromQr;
        setSiteData(sitePayload);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  const placeData = useMemo(() => siteData?.placeData || { name: siteData?.name ?? '', formatted_address: '' }, [siteData]);

  const heroImageUrl = useMemo(() =>
    siteData?.heroImageUrl ??
    (siteData?.placeId ? `/api/places/photo-proxy/${encodeURIComponent(siteData.placeId)}?maxWidth=1200` : undefined),
    [siteData]
  );

  const businessContext = useMemo(() => {
    if (!siteData || !slug) {
      return { id: '', placeId: '', name: '', address: '' };
    }
    return buildConciergeBusinessFromSite(siteData as Record<string, unknown>, slug);
  }, [siteData, slug]);

  const agentConfig = useMemo(() => ({
    role: 'CONCIERGE',
    personality: 'Helpful, professional, and friendly',
    objectives: [
      `Represent ${placeData.name} and assist customers`,
      'Answer questions about services, hours, and location',
      'Help customers book appointments or place orders',
    ],
    constraints: [
      'Be polite and professional',
      'Stay on topic about the business',
      'Provide accurate information from business context',
    ],
  }), [placeData.name]);

  const voiceConfig = useMemo(() => VoiceClientFactory.getDefaultConfig('premium'), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-slate-400">
        <p className="text-lg">{error || 'Business not found.'}</p>
        <button
          onClick={() => setLocation('/')}
          className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          Back to Gateway Global AI
        </button>
      </div>
    );
  }

  return (
    <ConciergePanel
      business={businessContext}
      agent={agentConfig}
      voiceConfig={voiceConfig}
      isOpen={true}
      onClose={() => setLocation('/')}
      layoutMode="fullscreen"
      publicSlug={slug ?? null}
      websiteUrl={placeData.website ?? null}
      autoGreetOnConnect={autoGreet}
      onCapabilitiesReady={(caps) => setSiteCapabilities(caps)}
      onMenuActionRef={menuActionRef}
      idleContent={
        <BusinessHeroIdle
          place={placeData}
          heroImageUrl={heroImageUrl}
          siteConfigId={siteData.id}
          publicSlug={slug}
          websiteUrl={placeData.website ?? null}
          onlineStoreUrl={null}
          capabilities={siteCapabilities}
          isAuthenticated={!!user}
          onStartVoice={() => setAutoGreet(true)}
          onMenuAction={(viewId) => menuActionRef.current?.(viewId)}
        />
      }
      zIndex={10}
    />
  );
}
