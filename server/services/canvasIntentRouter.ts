/**
 * Canvas Intent Router — Gateway Global AI OS
 *
 * Three-tier intent routing for canvas.resolve syscalls:
 *
 *   Tier 1 — Deterministic: fast rule-based pattern matching
 *   Tier 2 — Llama: local LLM fallback via /api/local-llm-batch/complete
 *   Tier 3 — No change / disambiguation fallback
 *
 * Each tier uses SiteRuntimeContext and visitor security to enforce entitlements.
 * Output is always a CanvasResolveResult — never raw LLM output.
 * Llama responses are treated as UNTRUSTED until validated.
 */

import type { CanvasResolvePayload, CanvasResolveResult, CanvasViewId } from '../../shared/canvasViewContract';
import type { SiteRuntimeContext } from '../../shared/siteRuntimeContext';
import {
  BACKGROUND_SPEAKING_INSTRUCTIONS,
  BACKGROUND_SPEECH_SUMMARY,
  transcriptMatchesBackgroundPickerIntent,
} from '../../shared/backgroundPickerIntent.js';
import { tryActiveExperienceContinuity } from './experienceContinuity';

const LLAMA_TIMEOUT_MS = 5000;

// ── Tier 1 intent rules ───────────────────────────────────────────────────────

interface IntentRule {
  patterns: string[];
  intent: string;
  viewId: CanvasViewId;
  minSecurityLevel: 'public' | 'verified' | 'staff' | 'admin';
  confidence: number;
}

const TIER1_RULES: IntentRule[] = [
  {
    patterns: ['services', 'what do you offer', 'menu', 'price', 'how much', 'pricing', 'what can you do'],
    intent: 'show_service_menu',
    viewId: 'service_menu',
    minSecurityLevel: 'public',
    confidence: 0.92,
  },
  {
    patterns: ['faq', 'frequently asked', 'question', 'questions', 'help me understand', 'how does'],
    intent: 'show_faq',
    viewId: 'faq_list',
    minSecurityLevel: 'public',
    confidence: 0.90,
  },
  {
    patterns: ['schedule', 'book', 'appointment', 'reserve', 'availability', 'when can i'],
    intent: 'open_schedule',
    viewId: 'schedule',
    minSecurityLevel: 'public',
    confidence: 0.88,
  },
  {
    patterns: ['my account', 'account info', 'my profile', 'my plan', 'subscription'],
    intent: 'show_account',
    viewId: 'account_overview',
    minSecurityLevel: 'verified',
    confidence: 0.91,
  },
  {
    patterns: ['agent', 'agents', 'my agents', 'agent roster', 'my team', 'agent list'],
    intent: 'show_agents',
    viewId: 'agent_roster',
    minSecurityLevel: 'admin',
    confidence: 0.90,
  },
  {
    patterns: ['knowledge', 'train', 'training', 'library', 'knowledge base', 'teach', 'upload'],
    intent: 'build_knowledge',
    viewId: 'knowledge_library_builder',
    minSecurityLevel: 'admin',
    confidence: 0.88,
  },
  {
    patterns: ['aptitude', 'test', 'proficiency', 'benchmark', 'evaluate agent', 'agent test'],
    intent: 'run_aptitude_test',
    viewId: 'aptitude_test_runner',
    minSecurityLevel: 'admin',
    confidence: 0.87,
  },
  {
    patterns: ['support', 'help', 'problem', 'issue', 'contact', 'assistance'],
    intent: 'open_support',
    viewId: 'support_home',
    minSecurityLevel: 'public',
    confidence: 0.85,
  },
  {
    patterns: ['phone', 'number', 'provision phone', 'get a number', 'call number'],
    intent: 'provision_phone',
    viewId: 'phone_provisioning_form',
    minSecurityLevel: 'admin',
    confidence: 0.89,
  },
  {
    patterns: ['verify', 'login', 'sign in', 'authenticate', 'who am i', 'identity'],
    intent: 'verify_identity',
    viewId: 'identity_verify',
    minSecurityLevel: 'public',
    confidence: 0.88,
  },
  {
    patterns: ['home', 'start', 'welcome', 'go back', 'main menu', 'beginning'],
    intent: 'go_home',
    viewId: 'welcome',
    minSecurityLevel: 'public',
    confidence: 0.85,
  },
  {
    patterns: [
      'command center',
      'control center',
      'ops board',
      'operations board',
      'operations dashboard',
      'show dashboard',
      'open dashboard',
    ],
    intent: 'open_command_center',
    viewId: 'command_center',
    minSecurityLevel: 'staff',
    confidence: 0.86,
  },
  // canvas_backgrounds / appearance — canonical matcher only: `transcriptMatchesBackgroundPickerIntent`
  // (shared/backgroundPickerIntent.ts). Tier 0 runs before Tier 1; do not duplicate patterns here.
];

// ── Security level ordering ───────────────────────────────────────────────────

const SECURITY_ORDER: Record<string, number> = {
  public: 0, verified: 1, staff: 2, admin: 3,
};

function meetsSecurityLevel(
  visitorLevel: string,
  required: IntentRule['minSecurityLevel'],
): boolean {
  return (SECURITY_ORDER[visitorLevel] ?? 0) >= (SECURITY_ORDER[required] ?? 0);
}

// ── Tier 1: Deterministic matching ────────────────────────────────────────────

function tier1Route(
  transcript: string,
  visitorSecurityLevel: string,
  allowedViews: string[],
): CanvasResolveResult | null {
  const lower = transcript.toLowerCase();
  let best: (IntentRule & { matchScore: number }) | null = null;

  for (const rule of TIER1_RULES) {
    if (!meetsSecurityLevel(visitorSecurityLevel, rule.minSecurityLevel)) continue;
    if (!allowedViews.includes(rule.viewId)) continue;

    let matchScore = 0;
    for (const pattern of rule.patterns) {
      if (lower.includes(pattern)) {
        matchScore = Math.max(matchScore, pattern.length);
      }
    }
    if (matchScore > 0 && (!best || matchScore > best.matchScore)) {
      best = { ...rule, matchScore };
    }
  }

  if (!best) return null;

  const screenSummary =
    best.viewId === 'command_center'
      ? 'Command center: status lane, work queue, and pending approvals.'
      : `Showing ${best.viewId.replace(/_/g, ' ')}.`;

  const speakingInstructions = `Describe what is shown. Guide the user through the options.`;

  return {
    selectedViewId: best.viewId,
    renderMode: 'replace',
    intentRouterTier: 1,
    reason: `Tier 1 matched intent '${best.intent}' via pattern`,
    speechContext: {
      screenSummary,
      speakingInstructions,
    },
  };
}

// ── Tier 2: Llama fallback ────────────────────────────────────────────────────

interface LlamaIntentResponse {
  selectedViewId?: string;
  intent?: string;
  confidence?: number;
  requiresDisambiguation?: boolean;
  reason?: string;
}

function buildLlamaPrompt(payload: CanvasResolvePayload, allowedViews: string[]): string {
  return `You are a Canvas Control Intent Router for a voice-first AI OS.
Given a voice transcript, select the best canvas view to show.

Allowed view IDs: ${allowedViews.join(', ')}

Transcript: "${payload.transcript}"
Current canvas: ${payload.currentCanvasSummary ?? 'welcome screen'}
Recent context: ${payload.recentTurns?.map(t => t.transcript).slice(-3).join(' | ') ?? 'none'}

Respond ONLY with valid JSON matching this schema:
{
  "selectedViewId": "<one of the allowed view IDs, or null if no canvas change>",
  "intent": "<intent name>",
  "confidence": <0.0-1.0>,
  "requiresDisambiguation": <true|false>,
  "reason": "<brief explanation>"
}

If the transcript is ambiguous between multiple intents, set requiresDisambiguation: true and selectedViewId: "disambiguation_menu".
If no canvas change is needed, set selectedViewId: null and confidence: 0.9.`;
}

async function tier2Route(
  payload: CanvasResolvePayload,
  allowedViews: string[],
): Promise<CanvasResolveResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLAMA_TIMEOUT_MS);

    const response = await fetch('/api/local-llm-batch/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        agentRole: 'canvas_control_agent',
        prompt: buildLlamaPrompt(payload, allowedViews),
        format: 'json',
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const raw = await response.json();
    const text = (raw.result ?? raw.text ?? '').trim();

    // Parse — LLM output is UNTRUSTED until validated
    let parsed: LlamaIntentResponse;
    try {
      parsed = JSON.parse(text) as LlamaIntentResponse;
    } catch {
      console.warn('[canvasIntentRouter] Tier 2 Llama returned unparseable JSON:', text);
      return null;
    }

    // Validate — never trust a viewId not in the allowed list
    const selectedViewId = parsed.selectedViewId;
    if (selectedViewId && !allowedViews.includes(selectedViewId)) {
      console.warn('[canvasIntentRouter] Tier 2 Llama returned unallowed viewId:', selectedViewId);
      return null;
    }

    const renderMode = parsed.requiresDisambiguation ? 'disambiguate'
      : selectedViewId ? 'replace' : 'noop';

    return {
      selectedViewId: selectedViewId ?? undefined,
      renderMode,
      intentRouterTier: 2,
      reason: `Tier 2 Llama: ${parsed.reason ?? 'intent classified'}`,
      speechContext: {
        screenSummary: selectedViewId
          ? `Showing ${(selectedViewId ?? '').replace(/_/g, ' ')}.`
          : 'No canvas change.',
        speakingInstructions: parsed.requiresDisambiguation
          ? 'Ask the user to clarify what they would like to do.'
          : 'Describe what is shown and guide the user.',
      },
    };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[canvasIntentRouter] Tier 2 Llama timed out after', LLAMA_TIMEOUT_MS, 'ms');
    } else {
      console.error('[canvasIntentRouter] Tier 2 error:', err);
    }
    return null;
  }
}

// ── Tier 0: Canvas appearance (shared matcher only — before Tier 1) ─────────────────
// Single source: `transcriptMatchesBackgroundPickerIntent` in shared/backgroundPickerIntent.ts

function tier0BackgroundVisualIntent(
  transcript: string,
  visitorSecurityLevel: string,
  allowedViews: string[],
): CanvasResolveResult | null {
  if (!allowedViews.includes('canvas_backgrounds')) return null;
  if (!meetsSecurityLevel(visitorSecurityLevel, 'public')) return null;
  if (!transcriptMatchesBackgroundPickerIntent(transcript)) return null;

  return {
    selectedViewId: 'canvas_backgrounds',
    renderMode: 'replace',
    intentRouterTier: 1,
    reason: 'Tier 0 — shared transcriptMatchesBackgroundPickerIntent (canvas appearance)',
    speechContext: {
      screenSummary: BACKGROUND_SPEECH_SUMMARY,
      speakingInstructions: BACKGROUND_SPEAKING_INSTRUCTIONS,
    },
  };
}

// ── Tier 3: No change / noop fallback ────────────────────────────────────────

function tier3Noop(): CanvasResolveResult {
  return {
    selectedViewId: undefined,
    renderMode: 'noop',
    intentRouterTier: 3,
    reason: 'Tier 3 fallback — no intent matched',
    speechContext: {
      screenSummary: 'Canvas unchanged.',
      speakingInstructions: 'Respond conversationally. Do not describe a canvas change.',
    },
  };
}

// ── Main router ───────────────────────────────────────────────────────────────

export async function routeCanvasIntent(
  payload: CanvasResolvePayload,
  siteRuntime: SiteRuntimeContext,
  visitorSecurityLevel: string,
  /** `envelope.context.currentViewId` — active canvas before this turn (voice / UI). */
  activeCanvasViewId?: string | null,
): Promise<CanvasResolveResult> {
  const allowedViews = siteRuntime.entitlements.allowedCanvasViews;

  // Experience-first — follow-ups inside an intent-bound surface before global re-routing
  const continuity = tryActiveExperienceContinuity(
    payload.transcript,
    activeCanvasViewId,
    allowedViews,
    visitorSecurityLevel,
  );
  if (continuity) return continuity;

  // Tier 0 — background / visual intent (before generic Tier 1 so “categories” does not lose to noop)
  const t0 = tier0BackgroundVisualIntent(payload.transcript, visitorSecurityLevel, allowedViews);
  if (t0) return t0;

  // Tier 1 — deterministic
  const t1 = tier1Route(payload.transcript, visitorSecurityLevel, allowedViews);
  if (t1) return t1;

  // Tier 2 — Llama
  const t2 = await tier2Route(payload, allowedViews);
  if (t2) return t2;

  // Tier 3 — noop
  return tier3Noop();
}
