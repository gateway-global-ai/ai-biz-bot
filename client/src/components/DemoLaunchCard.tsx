import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Bot, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DemoLaunchCardProps {
  /** URL slug for the demo (e.g. "voice-ai-assistant", "the-joint-chiropractic") */
  slug: string;
  /** Company or brand name (e.g. "Target", "The Joint Chiropractic") */
  companyName: string;
  /** "AI Biz Bot" or "Voice Concierge" */
  agentLabel: 'AI Biz Bot' | 'Voice Concierge';
  /** Short description under the title */
  description: string;
  /** Callback when user chooses to open this demo in the in-page chat (no navigation) */
  onOpenInChat: (slug: string) => void;
  /** Visual variant: default indigo, "target" for red Target branding */
  variant?: 'default' | 'target';
}

/**
 * Standard demo launcher card: same layout and style for every demo section.
 * Opens the demo in the page's ConciergePanel (chat/voice) instead of navigating to /biz/:slug.
 */
export function DemoLaunchCard({
  slug,
  companyName,
  agentLabel,
  description,
  onOpenInChat,
  variant = 'default',
}: DemoLaunchCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const chatUrl = typeof window !== 'undefined' ? `${window.location.origin}/biz/${slug}` : '';
  const isTarget = variant === 'target';

  useEffect(() => {
    if (!chatUrl) return;
    QRCode.toDataURL(chatUrl, {
      width: 140,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [chatUrl]);

  const borderClass = isTarget
    ? 'border-red-500/30 focus-within:ring-red-500/50'
    : 'border-indigo-500/20 focus-within:ring-indigo-500/50';
  const accentClass = isTarget ? 'text-red-400' : 'text-indigo-400';
  const buttonClass = isTarget
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-indigo-600 hover:bg-indigo-500 text-white';

  const Icon = agentLabel === 'Voice Concierge' ? Mic : Bot;

  return (
    <div
      className={`flex flex-col rounded-sui bg-slate-900/60 border backdrop-blur-xl p-6 transition-all hover:border-opacity-80 focus-within:ring-2 ${borderClass}`}
      data-testid={`demo-launch-${slug}-${agentLabel.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-sui flex items-center justify-center shrink-0 ${isTarget ? 'bg-red-500/20' : 'bg-indigo-500/20'}`}>
          <Icon className={`w-5 h-5 ${accentClass}`} />
        </div>
        <div>
          <p className="font-bold text-white text-sm uppercase tracking-wide">{companyName}</p>
          <h3 className="text-lg font-bold text-white">{agentLabel}</h3>
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-4 flex-1">{description}</p>
      <div className="rounded-lg overflow-hidden border border-slate-600/50 bg-white p-2 mb-4 w-[140px] h-[140px] flex items-center justify-center">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR — ${companyName} ${agentLabel}`} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-slate-200 animate-pulse rounded" />
        )}
      </div>
      <Button
        type="button"
        onClick={() => onOpenInChat(slug)}
        className={`w-full rounded-sui font-semibold ${buttonClass}`}
      >
        Open in chat
      </Button>
      <p className="text-xs text-slate-500 mt-2 text-center">Scan QR to open on another device</p>
    </div>
  );
}
