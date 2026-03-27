/**
 * Customer-entry idle framing — sits above OSMenuList (does not replace it).
 * See docs-governance/INTENT_DRIVEN_CANVAS_SPEC.md
 */
import { CANVAS } from '@/config/brand';

export function isPlatformMarketingLanding(businessId: string | undefined): boolean {
  if (!businessId) return true;
  return businessId === 'platform_landing' || businessId === 'platform-landing';
}

export function IntentFirstIdleChrome({ businessName }: { businessName: string }) {
  const name = businessName?.trim();
  return (
    <div className="w-full mb-4 px-1" style={{ backgroundColor: CANVAS.bg }}>
      <p className="text-sm font-semibold text-slate-800">
        {name ? `Welcome to ${name}` : 'Welcome'}
      </p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
        What brings you in today? Tap an option below or use voice — we&apos;ll route you from there.
      </p>
    </div>
  );
}
