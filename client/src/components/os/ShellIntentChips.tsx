/**
 * Intent starters for neutral shell — in-shell only; styled like ChatGPT suggestion chips.
 * See docs-governance/canonical/SHELL_CONTAINMENT_RULE_V1.md
 */
import { motion } from 'framer-motion';
import { type CanvasChromeSettings, DEFAULT_CANVAS_CHROME, hexToRgba } from '@/lib/canvasChromeSettings';

export type ShellIntentChip = {
  id: string;
  label: string;
  /** Voice phrase to send when mic session is active (intent routing). */
  phrase?: string;
  /** If set, also opens this in-shell canvas experience immediately (no route change). */
  openBackgroundPicker?: boolean;
  /** SPA navigation (e.g. business lookup demo at `/business`). */
  navigateTo?: string;
};

/** Default chips for generic shells — not used on public platform `/` (see PLATFORM_SHELL_CHIPS). */
const DEFAULT_CHIPS: ShellIntentChip[] = [
  {
    id: 'bg',
    label: 'Canvas appearance',
    phrase: 'Open canvas appearance and background options',
    openBackgroundPicker: true,
  },
  { id: 'section', label: 'Build a page section', phrase: 'Help me build a page section for my site' },
  { id: 'brand', label: 'Edit branding', phrase: 'I want to edit branding and colors' },
  { id: 'review', label: 'Review content', phrase: 'Help me review my content' },
  { id: 'reset', label: 'Start over', phrase: 'Start over with a blank slate for this session' },
];

/**
 * Public platform home: passive exploration — canvas UI first, optional education + business demo path.
 * Voice prompts align with `PUBLIC_PLATFORM_VOICE_INSTRUCTION` (server) + platform `AgentConfig` (client).
 */
export const PLATFORM_SHELL_CHIPS: ShellIntentChip[] = [
  {
    id: 'bg',
    label: 'Canvas appearance',
    phrase: 'Open canvas appearance and background options',
    openBackgroundPicker: true,
  },
  {
    id: 'voice_ai',
    label: 'What is Voice AI?',
    phrase:
      'In a short spoken answer: what is Voice AI in this app, what is the canvas, and how does push-to-talk work?',
  },
  {
    id: 'tell_more',
    label: 'Tell me more',
    phrase:
      'Give a brief factual overview of Gateway Global AI — no sales pitch. Then stop and ask if I want to go deeper.',
  },
  {
    id: 'canvas_help',
    label: 'How do canvas controls work?',
    phrase:
      'Walk me through the canvas appearance controls: backgrounds, theme, readability — stay on UI and tools only.',
  },
  {
    id: 'business_demo',
    label: 'Find my business',
    navigateTo: '/business',
  },
];

export function ShellIntentChips({
  chips = DEFAULT_CHIPS,
  onPhrase,
  onOpenBackgroundPicker,
  onNavigate,
  chrome = DEFAULT_CANVAS_CHROME,
}: {
  chips?: ShellIntentChip[];
  onPhrase: (phrase: string) => void;
  onOpenBackgroundPicker: () => void;
  /** When a chip has `navigateTo`, called instead of voice phrase (platform business demo). */
  onNavigate?: (path: string) => void;
  chrome?: CanvasChromeSettings;
}) {
  return (
    <div className="w-full flex flex-col items-center gap-3 bg-transparent">
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {chips.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (c.navigateTo) {
                if (onNavigate) onNavigate(c.navigateTo);
                else if (typeof window !== 'undefined') window.location.assign(c.navigateTo);
                return;
              }
              if (c.openBackgroundPicker) {
                onOpenBackgroundPicker();
                return;
              }
              if (c.phrase) onPhrase(c.phrase);
            }}
            className="px-4 py-2.5 rounded-2xl text-sm font-medium backdrop-blur-sm border shadow-sm transition-colors text-center max-w-[13rem] leading-snug hover:opacity-95"
            style={{
              color: chrome.primaryTextColor,
              backgroundColor: hexToRgba(chrome.cardBackgroundColor, Math.min(0.96, chrome.cardOpacity + 0.12)),
              borderColor: hexToRgba(chrome.primaryTextColor, 0.12),
            }}
          >
            {c.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
