import { useEffect, useState, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Loader2, QrCode, Copy, Check, Download, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { useAuth } from '@/lib/auth';

const GLOBAL_ADMIN_ROLES = new Set(['superadmin', 'platform_admin', 'admin']);

/**
 * AgentPage — the AI OS entry point at /agent/:slug
 *
 * Configuration-driven: the same ConciergePanel framework renders for every
 * visitor. What changes is whether owner controls are unlocked.
 *
 * Gate logic:
 *   - Unauthenticated → customer mode (voice concierge only)
 *   - Authenticated, owns the site (user.id === siteConfig.ownerId) → owner mode
 *   - Authenticated, global admin role → owner mode (platform oversight)
 *   - Authenticated, different user → customer mode
 *
 * The QR router (/qr/:id) lands here via /biz/:slug for customers; this route
 * is the direct owner link. Both eventually render the same panel.
 */
export default function AgentPage() {
  const [, params] = useRoute('/agent/:slug');
  const [, setLocation] = useLocation();
  const slug = params?.slug;
  const { user, isLoading: authLoading } = useAuth();

  const [siteData, setSiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrTriggered, setQrTriggered] = useState(false);

  // Capture referrer for attribution
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) sessionStorage.setItem('shareRef', ref);
  }, []);

  // Fetch site config by slug
  useEffect(() => {
    if (!slug) return;
    const fromQr = new URLSearchParams(window.location.search).get('from') === 'qr';
    fetch(`/api/site-configs/by-slug/${encodeURIComponent(slug)}${fromQr ? '?from=qr' : ''}`)
      .then(r => {
        if (!r.ok) throw new Error('Agent not found');
        return r.json();
      })
      .then(data => { setSiteData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  // Trigger QR generation once if qrCodeUrl is null
  useEffect(() => {
    if (!siteData || qrTriggered || siteData.qrCodeUrl) return;
    setQrTriggered(true);
    fetch(`/api/qr/generate/${siteData.id}`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.qrCodeUrl) {
          setSiteData((prev: any) => ({ ...prev, qrCodeUrl: data.qrCodeUrl }));
        }
      })
      .catch(() => {});
  }, [siteData, qrTriggered]);

  const publicUrl = `${window.location.origin}/agent/${slug}`;

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [publicUrl]);

  // Determine owner access — wait for both auth and site data to resolve
  const isOwner = !authLoading && !!user && !!siteData && (
    GLOBAL_ADMIN_ROLES.has(user.role) ||
    (siteData.ownerId && String(user.id) === String(siteData.ownerId))
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl text-center max-w-sm"
        >
          <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-1">Agent Not Found</p>
          <p className="text-slate-400 text-sm mb-6">{error || 'This agent page does not exist.'}</p>
          <button
            onClick={() => setLocation('/')}
            className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Back to Gateway Global AI
          </button>
        </motion.div>
      </div>
    );
  }

  // Build business context from site data
  const placeData = siteData.placeData || {};
  const heroImageUrl =
    siteData.heroImageUrl ??
    (siteData.placeId ? `/api/places/photo-proxy/${encodeURIComponent(siteData.placeId)}?maxWidth=1200` : undefined);
  const businessContext = {
    id: siteData.id,
    placeId: siteData.placeId || placeData.place_id || '',
    name: placeData.name || siteData.name || 'Agent',
    address: placeData.formatted_address || '',
    hours: placeData.opening_hours?.weekday_text || [],
    services: [],
    rating: placeData.rating,
    userRatingsTotal: placeData.user_ratings_total,
    phone: placeData.formatted_phone_number || placeData.international_phone_number,
    types: (placeData.types || []).filter((t: string) => !['point_of_interest', 'establishment'].includes(t)),
    heroImageUrl,
    lat: placeData.geometry?.location?.lat,
    lng: placeData.geometry?.location?.lng,
  };

  const agentConfig = {
    role: 'concierge',
    personality: 'professional',
    objectives: [],
    constraints: [],
  };

  const qrImageUrl = `/qr/img/${slug}`;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* QR + Share bar — only visible to site owners and admins */}
      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="shrink-0 border-b border-indigo-500/15 bg-slate-900/80 backdrop-blur-xl px-4 py-2 flex items-center gap-3 justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-500 font-mono shrink-0">Public URL:</span>
            <span className="text-xs text-indigo-300 font-mono truncate">{publicUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sui bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => setShowQr(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sui border text-xs transition-colors ${
                showQr
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500/40'
              }`}
            >
              <QrCode size={12} />
              QR Code
            </button>
          </div>
        </motion.div>
      )}

      {/* QR panel — slides down when open, owner-only */}
      {isOwner && showQr && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="shrink-0 border-b border-indigo-500/10 bg-slate-900/60 backdrop-blur-xl flex flex-col items-center gap-3 py-5 px-4"
        >
          <p className="text-xs text-slate-400 font-mono">Scan to open this agent page</p>
          <div className="rounded-sui overflow-hidden border border-indigo-500/20 bg-white p-3">
            <img
              src={qrImageUrl}
              alt={`QR code for /agent/${slug}`}
              className="w-40 h-40 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).alt = 'Generating QR...';
              }}
            />
          </div>
          <a
            href={qrImageUrl}
            download={`agent-${slug}-qr.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sui bg-indigo-500/20 border border-indigo-500/40 text-xs text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-colors"
          >
            <Download size={12} />
            Download QR
          </a>
        </motion.div>
      )}

      {/* ConciergePanel fills remaining viewport */}
      <div className="flex-1 min-h-0 relative">
        <ConciergePanel
          business={businessContext}
          agent={agentConfig}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          siteConfigId={siteData.id}
          isOpen={true}
          layoutMode="fullscreen"
          showOwnerControls={isOwner}
          isAuthenticated={!!user}
          publicSlug={slug ?? undefined}
          onClose={() => {}}
          onCycleLayout={() => {}}
          zIndex={10}
        />
      </div>
    </div>
  );
}
