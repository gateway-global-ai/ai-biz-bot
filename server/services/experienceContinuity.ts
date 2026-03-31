/**
 * Active experience continuity — governed narration when canvas.resolve would otherwise noop
 * and strip grounding. See INTENT_LOOP_GOVERNANCE_V1 / experience grounding invariant.
 */
import type { CanvasResolveResult } from "../../shared/canvasViewContract.js";
import {
  BACKGROUND_SPEAKING_INSTRUCTIONS,
  BACKGROUND_SPEECH_SUMMARY,
} from "../../shared/backgroundPickerIntent.js";

export { BACKGROUND_SPEAKING_INSTRUCTIONS, BACKGROUND_SPEECH_SUMMARY };

const CONTINUITY_FOLLOWUP_HINT =
  " The user is still in the background picker. Treat the utterance as refinement, comparison, or in-UI navigation (e.g. darker, aurora-like, particles, scroll, that category) unless they clearly ask to leave. Do NOT revert to generic platform or business pitch.";

/** Phrases that indicate the user is leaving the background-picker experience for another surface */
const EXIT_FROM_BACKGROUND_PATTERNS: string[] = [
  "main menu",
  "go home",
  "home screen",
  "welcome screen",
  "what are your services",
  "your services",
  "main services",
  "book a room",
  "book an appointment",
  "make a reservation",
  "schedule an appointment",
  "reserve a room",
  "faq",
  "frequently asked",
  "open support",
  "contact us",
  "pricing",
  "how much do",
  "different topic",
  "something else entirely",
  "forget the background",
  "stop with the background",
  "tell me about your business",
  "what can your business",
];

export function continuitySpeechCanvasBackgrounds(): NonNullable<CanvasResolveResult["speechContext"]> {
  return {
    screenSummary: BACKGROUND_SPEECH_SUMMARY,
    speakingInstructions: BACKGROUND_SPEAKING_INSTRUCTIONS + CONTINUITY_FOLLOWUP_HINT,
  };
}

export function mergeGroundingForPreservedView(viewId: string): NonNullable<CanvasResolveResult["speechContext"]> {
  if (viewId === "canvas_backgrounds") {
    return continuitySpeechCanvasBackgrounds();
  }
  return {
    screenSummary: `Active experience: ${viewId.replace(/_/g, " ")}.`,
    speakingInstructions:
      "Stay focused on this screen. Help the user with the active experience unless they clearly switch to another topic.",
  };
}

export function isExplicitExitFromBackgroundExperience(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return EXIT_FROM_BACKGROUND_PATTERNS.some((p) => lower.includes(p));
}

const SECURITY_ORDER: Record<string, number> = {
  public: 0,
  verified: 1,
  staff: 2,
  admin: 3,
};

function meetsSecurityLevel(visitorLevel: string, required: "public" | "verified" | "staff" | "admin"): boolean {
  return (SECURITY_ORDER[visitorLevel] ?? 0) >= (SECURITY_ORDER[required] ?? 0);
}

/**
 * While `canvas_backgrounds` is the active view, keep follow-up turns in-scope before global re-routing.
 * Returns noop + grounded speech so the client does not re-render; voice stays picker-scoped.
 */
export function tryActiveExperienceContinuity(
  transcript: string,
  activeCanvasViewId: string | undefined | null,
  allowedViews: string[],
  visitorSecurityLevel: string,
): CanvasResolveResult | null {
  if (!activeCanvasViewId || activeCanvasViewId !== "canvas_backgrounds") return null;
  if (!allowedViews.includes("canvas_backgrounds")) return null;
  if (!meetsSecurityLevel(visitorSecurityLevel, "public")) return null;
  if (isExplicitExitFromBackgroundExperience(transcript)) return null;

  return {
    selectedViewId: "canvas_backgrounds",
    renderMode: "noop",
    intentRouterTier: 1,
    reason: "active_experience_continuity — canvas_backgrounds; follow-up interpreted in-scope",
    resolutionSummary: "continuity:canvas_backgrounds",
    speechContext: continuitySpeechCanvasBackgrounds(),
  };
}
