import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface AgentQRCardProps {
  /** Display name (e.g. "Voice AI Assistant", "AI Biz Bots") */
  title: string;
  /** URL slug for /biz/:slug (e.g. "voice-ai-assistant", "ai-biz-bots") */
  slug: string;
  /** Optional description under the title */
  description?: string;
  /** Optional store/location name shown below title (e.g. "Target") — bold and larger when set */
  storeName?: string;
  /** Visual variant: default indigo, "target" for red Target branding */
  variant?: 'default' | 'target';
}

/**
 * Renders a card with a QR code that encodes the public chat URL (/biz/:slug).
 * Clicking the QR or the CTA opens the chat in the same or new tab.
 */
export function AgentQRCard({ title, slug, description, storeName, variant = 'default' }: AgentQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const chatUrl = typeof window !== 'undefined' ? `${window.location.origin}/biz/${slug}` : `https://aibizbot-dev.gatewayglobal.ai/biz/${slug}`;
  const isTarget = variant === 'target';

  useEffect(() => {
    QRCode.toDataURL(chatUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [chatUrl]);

  const borderClass = isTarget
    ? 'border-red-500/30 hover:border-red-500/50 focus:ring-red-500/50'
    : 'border-indigo-500/20 hover:border-indigo-500/40 focus:ring-indigo-500/50';
  const titleClass = isTarget ? 'text-red-400' : 'text-white';
  const ctaClass = isTarget ? 'text-red-400' : 'text-indigo-400';
  const bgClass = isTarget ? 'hover:bg-slate-900/60' : 'hover:bg-slate-900/60';

  return (
    <a
      href={chatUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col items-center rounded-sui bg-slate-900/40 border backdrop-blur-xl p-6 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 ${borderClass} ${bgClass}`}
      data-testid={`agent-qr-${slug}`}
    >
      <h3 className={`text-lg font-bold mb-1 ${titleClass}`}>{title}</h3>
      {storeName && <p className="text-xl font-bold text-white mb-2">{storeName}</p>}
      {description && <p className="text-slate-400 text-sm mb-4">{description}</p>}
      <div className="rounded-lg overflow-hidden border border-slate-600/50 bg-white p-2 mb-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR code — open ${title} chat`} className="w-[200px] h-[200px]" />
        ) : (
          <div className="w-[200px] h-[200px] bg-slate-200 animate-pulse rounded" />
        )}
      </div>
      <span className={`text-sm font-medium ${ctaClass}`}>Scan or click to open chat</span>
    </a>
  );
}
