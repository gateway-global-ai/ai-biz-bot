/**
 * Customer-entry idle framing — centered, minimal copy (ChatGPT-style empty state).
 * Sits above OSMenuList / ShellIntentChips; does not replace them.
 * On dark canvas backgrounds, wrap with `PlatformIdleGlassPanel` for iOS-style frosted readability.
 */
import type { ReactNode } from 'react';
import {
  type CanvasChromeSettings,
  DEFAULT_CANVAS_CHROME,
  hexToRgba,
} from '@/lib/canvasChromeSettings';

export function isPlatformMarketingLanding(businessId: string | undefined): boolean {
  if (!businessId) return true;
  return businessId === 'platform_landing' || businessId === 'platform-landing';
}

/** Frosted stack for idle headline + intent chips — colors from `CanvasChromeSettings`. */
export function PlatformIdleGlassPanel({
  children,
  chrome = DEFAULT_CANVAS_CHROME,
}: {
  children: ReactNode;
  chrome?: CanvasChromeSettings;
}) {
  return (
    <div
      className="w-full max-w-2xl rounded-sui px-5 py-7 sm:px-8 sm:py-8 flex flex-col items-center gap-6 shadow-[0_12px_48px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.07]"
      style={{
        backgroundColor: hexToRgba(chrome.cardBackgroundColor, chrome.cardOpacity),
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: `rgba(255,255,255,${Math.min(0.95, chrome.cardBorderOpacity)})`,
        backdropFilter: `blur(${chrome.cardBlurPx}px)`,
        WebkitBackdropFilter: `blur(${chrome.cardBlurPx}px)`,
      }}
    >
      {children}
    </div>
  );
}

type IntentFirstIdleChromeProps = {
  businessName: string;
  /**
   * When set (including `null`), use platform home `/` copy (voice-first AI OS).
   * `null` = no external referrer; string = hostname label from `document.referrer`.
   * When `undefined`, use standard business welcome (non-platform pages).
   */
  platformReferrerDisplay?: string | null;
  /** Typography when parent does not force Tailwind defaults (platform canvas chrome). */
  chrome?: CanvasChromeSettings;
};

export function IntentFirstIdleChrome({
  businessName,
  platformReferrerDisplay,
  chrome = DEFAULT_CANVAS_CHROME,
}: IntentFirstIdleChromeProps) {
  const platformMode = platformReferrerDisplay !== undefined;

  if (platformMode) {
    const ref = platformReferrerDisplay?.trim();
    return (
      <div className="w-full text-center bg-transparent">
        <h2
          className="text-2xl sm:text-[1.65rem] font-semibold tracking-tight leading-snug"
          style={{ color: chrome.primaryTextColor }}
        >
          Explore the canvas — or ask anything
        </h2>
        <p
          className="text-sm mt-2 max-w-md mx-auto leading-relaxed"
          style={{ color: chrome.mutedTextColor }}
        >
          Tap a chip, open Canvas appearance, or use the mic. Business demo is optional when you&apos;re ready.
        </p>
        {ref ? (
          <p
            className="text-xs mt-2 max-w-md mx-auto leading-relaxed opacity-90"
            style={{ color: chrome.mutedTextColor }}
          >
            From &quot;{ref}&quot;
          </p>
        ) : null}
      </div>
    );
  }

  const name = businessName?.trim();
  return (
    <div className="w-full text-center bg-transparent">
      <h2
        className="text-xl sm:text-2xl font-semibold tracking-tight"
        style={{ color: chrome.primaryTextColor }}
      >
        {name ? `Welcome to ${name}` : 'Welcome'}
      </h2>
      <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: chrome.mutedTextColor }}>
        Pick an option below or use the microphone.
      </p>
    </div>
  );
}
