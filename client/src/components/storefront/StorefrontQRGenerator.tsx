import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEFAULT_QR_COLOR = '#1e3a8a';
const DEFAULT_STICKER_BG = '#0F172A';
const DEFAULT_PRIMARY_BG = '#1e293b';
const DEFAULT_CAPTION = 'Scan Me';
const PLACEHOLDER_URL = 'https://aibizbot-dev.gatewayglobal.ai/biz/demo';
/** Default center logo and "Powered by" strip (192x192 ClearVoice / G AI logo). */
const POWERED_BY_LOGO = '/clear_voice_ai_dark_sm.png';

interface StorefrontQRGeneratorProps {
  /** When set, QR encodes this URL (e.g. after demo creation). */
  demoUrl?: string;
}

export function StorefrontQRGenerator({ demoUrl }: StorefrontQRGeneratorProps) {
  const [qrColor, setQrColor] = useState(DEFAULT_QR_COLOR);
  const [stickerBackgroundColor, setStickerBackgroundColor] = useState(DEFAULT_STICKER_BG);
  const [primaryBackgroundColor, setPrimaryBackgroundColor] = useState(DEFAULT_PRIMARY_BG);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundImageOpacity, setBackgroundImageOpacity] = useState(0.3);
  const [captionText, setCaptionText] = useState(DEFAULT_CAPTION);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const encodeUrl = demoUrl || (typeof window !== 'undefined' ? `${window.location.origin}/biz/demo` : PLACEHOLDER_URL);

  useEffect(() => {
    QRCode.toDataURL(encodeUrl, {
      width: 256,
      margin: 2,
      color: { dark: qrColor, light: '#00000000' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [encodeUrl, qrColor]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-400 text-xs">QR code color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={qrColor}
              onChange={(e) => setQrColor(e.target.value)}
              className="w-10 h-10 rounded border border-slate-600 cursor-pointer"
            />
            <Input
              value={qrColor}
              onChange={(e) => setQrColor(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-400 text-xs">Sticker background</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={stickerBackgroundColor}
              onChange={(e) => setStickerBackgroundColor(e.target.value)}
              className="w-10 h-10 rounded border border-slate-600 cursor-pointer"
            />
            <Input
              value={stickerBackgroundColor}
              onChange={(e) => setStickerBackgroundColor(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-400 text-xs">Primary background</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={primaryBackgroundColor}
              onChange={(e) => setPrimaryBackgroundColor(e.target.value)}
              className="w-10 h-10 rounded border border-slate-600 cursor-pointer"
            />
            <Input
              value={primaryBackgroundColor}
              onChange={(e) => setPrimaryBackgroundColor(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-slate-400 text-xs">Background image opacity</Label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={backgroundImageOpacity}
            onChange={(e) => setBackgroundImageOpacity(Number(e.target.value))}
            className="w-full mt-2 h-2 rounded-lg appearance-none bg-slate-700 accent-indigo-500"
          />
          <span className="text-xs text-slate-500">{Math.round(backgroundImageOpacity * 100)}%</span>
        </div>
      </div>
      <div>
        <Label className="text-slate-400 text-xs">Background image URL (optional)</Label>
        <Input
          placeholder="https://..."
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
          className="mt-1 bg-slate-800 border-slate-700 text-white text-sm"
        />
      </div>
      <div>
        <Label className="text-slate-400 text-xs">Text above QR (e.g. Scan Me)</Label>
        <Input
          placeholder={DEFAULT_CAPTION}
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          className="mt-1 bg-slate-800 border-slate-700 text-white text-sm max-w-[280px]"
        />
      </div>

      {/* Preview: caption -> primary bg -> sticker bg -> bg image -> QR with center logo -> Powered by */}
      <div
        className="inline-block p-4 rounded-sui border border-slate-600/50"
        style={{ backgroundColor: primaryBackgroundColor }}
      >
        <p className="text-sm font-medium text-white text-center mb-2 min-h-[1.25rem]">
          {captionText || '\u00A0'}
        </p>
        <div
          className="relative w-[280px] h-[280px] rounded-sui overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: stickerBackgroundColor }}
        >
          {backgroundImageUrl && (
            <img
              src={backgroundImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: backgroundImageOpacity }}
              onError={() => setBackgroundImageUrl('')}
            />
          )}
          {qrDataUrl && (
            <div className="relative flex items-center justify-center w-48 h-48">
              <img
                src={qrDataUrl}
                alt="QR code"
                className="w-full h-full object-contain"
              />
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <img
                  src={POWERED_BY_LOGO}
                  alt=""
                  className="w-16 h-16 object-contain rounded-md bg-white/95 p-0.5 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-col items-center gap-1">
          <img
            src={POWERED_BY_LOGO}
            alt="Powered by ClearVoice AI"
            className="h-8 w-auto object-contain opacity-90"
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center font-mono truncate max-w-[280px]" title={encodeUrl}>
          {encodeUrl}
        </p>
      </div>
    </div>
  );
}
