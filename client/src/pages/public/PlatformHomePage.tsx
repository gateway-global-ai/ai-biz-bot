/**
 * PlatformHomePage — Public entry at /
 *
 * Single governed shell: only ConciergePanel provides the header/footer (brand tokens).
 * Idle canvas is intent-first: `IntentFirstIdleChrome` + `OSMenuList` (platform entry menu),
 * not a hero report — see `useOSMenu` `platformEntry` and INTENT_DRIVEN_CANVAS_SPEC.
 */

import { useCallback, useState } from 'react';
import { useLocation } from 'wouter';
import { usePlatformEntryReferrer } from '@/hooks/usePlatformEntryReferrer';
import { UnifiedOtpForm } from '@gateway/canvas-sdk';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { BusinessContext, AgentConfig } from '@/types/voice';
import { SHELL } from '@/config/brand';

// ─── Platform context — Nova is the public face ───────────────────────────────

const PLATFORM_BUSINESS: BusinessContext = {
  id: 'platform_landing',
  placeId: '',
  name: 'Gateway Global AI',
  address: 'AI Front Desk & customer communication',
  services: [
    'Missed-call recovery',
    'Voice-first concierge & governed canvas',
    'Verified identity',
    'Forms that complete with the customer',
  ],
  primaryColor: '#6366f1',
  workspaceState: 'active',
  claimStatus: null,
  ownerId: null,
  plan: 'enterprise',
};

const PLATFORM_AGENT: AgentConfig = {
  role: 'Canvas & platform guide (public shell)',
  personality: 'Calm, helpful, concise — canvas-first',
  objectives: [
    'Prioritize help with the canvas: appearance, backgrounds, theme/readability chips, and push-to-talk — match the user’s immediate intent',
    'Explain Voice AI / PTT / canvas in plain language when asked; keep Gateway Global AI positioning to one short optional line unless the user asks for more',
    'Only discuss business needs, signup, or demo when the user steers there (e.g. "Find my business", demo, pricing) — do not probe their business on a casual canvas exploration turn',
    'Keep spoken answers under three sentences unless the user asks for depth',
  ],
  constraints: [
    'NEVER output markdown, bullet points, bold text, or headings — you are speaking aloud',
    'NEVER reason out loud or explain your thought process',
    'Do not open with a long sales pitch or repeated "Gateway Global AI" branding — brief greeting, then follow the user’s topic',
    'When the user is clearly playing with canvas tools or backgrounds, do not ask what their business is or push pricing',
  ],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatformHomePage() {
  const [, setLocation] = useLocation();
  const platformReferrerDisplay = usePlatformEntryReferrer();
  const [signInOpen, setSignInOpen] = useState(false);

  const isAuthed = typeof window !== 'undefined' && (
    !!localStorage.getItem('authToken') || !!localStorage.getItem('gateway_auth_token')
  );

  const handleOpenSettings = useCallback(() => {
    if (isAuthed) {
      setLocation('/platform');
    } else {
      setSignInOpen(true);
    }
  }, [isAuthed, setLocation]);

  return (
    <div
      className="h-[100dvh] min-h-0 w-full overflow-hidden flex flex-col"
      style={{ backgroundColor: SHELL.bg }}
    >
      <div className="relative flex-1 min-h-0 w-full">
        <ConciergePanel
          business={PLATFORM_BUSINESS}
          agent={PLATFORM_AGENT}
          voiceConfig={VoiceClientFactory.getDefaultConfig('premium')}
          siteConfigId="platform_landing"
          isOpen={true}
          layoutMode="fullscreen"
          variant="sovereign"
          showOwnerControls={false}
          autoStartPttOnOpen={false}
          publicSlug={null}
          transferTitle="Try Gateway Global AI"
          transferDescription="Open this session on another device to try the AI Front Desk."
          transferUrl={typeof window !== 'undefined' ? window.location.href : '/'}
          onClose={() => {}}
          onCycleLayout={() => {}}
          onOpenSettings={handleOpenSettings}
          onNavigate={setLocation}
          isAuthenticated={isAuthed}
          signInCanvasOverlay={
            signInOpen ? (
              <UnifiedOtpForm
                surface="canvas"
                onClose={() => setSignInOpen(false)}
                onAdminActivated={() => {
                  setSignInOpen(false);
                  setLocation('/platform');
                }}
                onCustomerActivated={() => {
                  setSignInOpen(false);
                  setLocation('/my-account');
                }}
              />
            ) : undefined
          }
          zIndex={10}
          className="h-full"
          platformIdleReferrerDisplay={platformReferrerDisplay}
        />
      </div>
    </div>
  );
}
