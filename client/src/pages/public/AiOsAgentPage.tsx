import { useEffect, useState, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Loader2, QrCode, Copy, Check, Download, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { useAuth } from '@/lib/auth';
import { SHELL } from '@/config/brand';
import { buildConciergeBusinessFromSite } from '@/lib/conciergeBusinessContext';

const GLOBAL_ADMIN_ROLES = new Set(['superadmin', 'platform_admin', 'admin']);

/**
 * AiOsAgentPage — same site + voice contract as /agent/:slug, with minimal AI OS chrome
 * (splash logo, waveform header, idle search, green PTT). Browser adapter for `public.agent.by_slug`
 * with optional presentation variant; see ConciergePanel `shellPresentation="ai_os_simple"`.
 */
export default function AiOsAgentPage() {
  const [, params] = useRoute('/ai-os/:slug');
  const [, setLocation] = useLocation();
  const slug = params?.slug;
  const { user, isLoading: authLoading } = useAuth();

  const [siteData, setSiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrTriggered, setQrTriggered] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) sessionStorage.setItem('shareRef', ref);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const fromQr = new URLSearchParams(window.location.search).get('from') === 'qr';
    fetch(`/api/site-configs/by-slug/${encodeURIComponent(slug)}${fromQr ? '?from=qr' : ''}`)
      .then((r) => {
        if (!r.ok) throw new Error('Agent not found');
        return r.json();
      })
      .then((data: any) => {
        const { readiness_gate_v1, ...sitePayload } = data;
        void readiness_gate_v1;
        setSiteData(sitePayload);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!siteData || qrTriggered || siteData.qrCodeUrl) return;
    setQrTriggered(true);
    fetch(`/api/qr/generate/${siteData.id}`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.qrCodeUrl) {
          setSiteData((prev: any) => ({ ...prev, qrCodeUrl: data.qrCodeUrl }));
        }
      })
      .catch(() => {});
  }, [siteData, qrTriggered]);

  const publicUrl = `${window.location.origin}/biz/${encodeURIComponent(slug ?? '')}`;
  const aiOsUrl = `${window.location.origin}/ai-os/${encodeURIComponent(slug ?? '')}`;

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(aiOsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [aiOsUrl]);

  const isOwner =
    !authLoading &&
    !!user &&
    !!siteData &&
    (GLOBAL_ADMIN_ROLES.has(user.role) ||
      (siteData.ownerId && String(user.id) === String(siteData.ownerId)));

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: SHELL.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#10b981' }} />
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-6" style={{ backgroundColor: SHELL.bg }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-sui bg-slate-900/40 border border-slate-700/60 backdrop-blur-xl text-center max-w-sm"
        >
          <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-1">Agent Not Found</p>
          <p className="text-slate-400 text-sm mb-6">{error || 'This agent page does not exist.'}</p>
          <button
            onClick={() => setLocation('/')}
            className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Back to Gateway Global AI
          </button>
        </motion.div>
      </div>
    );
  }

  const businessContext = buildConciergeBusinessFromSite(siteData as Record<string, unknown>, slug ?? '');

  const agentConfig = {
    role: 'concierge',
    personality: 'professional',
    objectives: [],
    constraints: [],
  };

  const qrImageUrl = `/qr/img/${slug}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHELL.bg }}>
      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="shrink-0 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-xl px-4 py-2 flex items-center gap-3 justify-between"
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs text-slate-500 font-mono shrink-0">AI OS URL:</span>
            <span className="text-xs text-emerald-400/90 font-mono truncate">{aiOsUrl}</span>
            <span className="text-xs text-slate-600 hidden sm:inline">·</span>
            <span className="text-xs text-slate-500 font-mono truncate hidden sm:inline">{publicUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sui bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy AI OS link'}
            </button>
            <button
              onClick={() => setShowQr((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sui border text-xs transition-colors ${
                showQr
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/40'
              }`}
            >
              <QrCode size={12} />
              QR
            </button>
          </div>
        </motion.div>
      )}

      {isOwner && showQr && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="shrink-0 border-b border-slate-700/40 bg-slate-900/70 backdrop-blur-xl flex flex-col items-center gap-3 py-5 px-4"
        >
          <p className="text-xs text-slate-400 font-mono">Scan to open this AI OS page</p>
          <div className="rounded-sui overflow-hidden border border-slate-600/60 bg-white p-3">
            <img
              src={qrImageUrl}
              alt={`QR code for /ai-os/${slug}`}
              className="w-40 h-40 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).alt = 'Generating QR...';
              }}
            />
          </div>
          <a
            href={qrImageUrl}
            download={`ai-os-${slug}-qr.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sui bg-emerald-500/15 border border-emerald-500/35 text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/25 transition-colors"
          >
            <Download size={12} />
            Download QR
          </a>
        </motion.div>
      )}

      <div className="flex-1 min-h-0 relative">
        <ConciergePanel
          business={businessContext}
          agent={agentConfig}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          siteConfigId={siteData.id}
          isOpen={true}
          layoutMode="fullscreen"
          shellPresentation="ai_os_simple"
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
