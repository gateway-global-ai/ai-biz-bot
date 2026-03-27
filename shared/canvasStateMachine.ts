/**
 * Canvas State Machine — Gateway Global AI OS
 *
 * Defines session states and per-turn states for the voice-first PTT interface.
 * VoiceTurnOrchestrator is the SOLE owner of turn state transitions.
 * GeminiStreamingClient exposes interruptSpeech() but never decides when to call it.
 *
 * State machine spec: canvas_control.md §19
 */

// ── Session states (persist across turns) ─────────────────────────────────────

export type SessionState =
  | 'disconnected'   // No active WebSocket connection
  | 'connecting'     // WebSocket handshake in progress
  | 'connected'      // WebSocket open, site runtime resolving
  | 'ready'          // SiteRuntimeContext resolved, canvas initialized
  | 'error';         // Unrecoverable session error

// ── Turn states (reset on each PTT press) ─────────────────────────────────────

export type TurnState =
  | 'idle'             // Waiting for PTT press
  | 'listening'        // PTT held down, recording audio
  | 'transcribing'     // PTT released, audio sent to ASR
  | 'orchestrating'    // transcript.final received, VoiceTurnOrchestrator processing
  | 'resolving_canvas' // canvas.resolve syscall dispatched, awaiting CanvasResolveResult
  | 'rendering_canvas' // canvas.render syscall dispatched, committing view to canvas store
  | 'planning_speech'  // SpeechGroundingContext built, passing to Gemini
  | 'speaking'         // Gemini TTS playing audio to user
  | 'waiting_for_user' // TTS complete, system idle — ready for next turn
  | 'turn_error';      // Syscall validation failure or runtime error

// ── Transitions (spec §19.3) ──────────────────────────────────────────────────

/**
 * Valid state transitions.
 * VoiceTurnOrchestrator enforces these — no component transitions directly.
 *
 * idle              → listening              [PTT down]
 * listening         → transcribing           [PTT up]
 * transcribing      → orchestrating          [transcript.final received]
 * orchestrating     → resolving_canvas       [canvas syscall needed]
 * orchestrating     → planning_speech        [speech only, no canvas change]
 * resolving_canvas  → rendering_canvas       [CanvasResolveResult valid]
 * resolving_canvas  → turn_error             [CanvasSyscallError, not recoverable]
 * rendering_canvas  → planning_speech        [render committed to canvas store]
 * planning_speech   → speaking               [SpeechGroundingContext ready]
 * speaking          → waiting_for_user       [TTS complete]
 * speaking          → listening              [barge-in — VoiceTurnOrchestrator ONLY]
 * turn_error        → waiting_for_user       [recovered with fallback view or noop]
 * waiting_for_user  → idle                   [session keepalive or timeout]
 */
export const VALID_TURN_TRANSITIONS: Record<TurnState, TurnState[]> = {
  idle:             ['listening'],
  listening:        ['transcribing'],
  transcribing:     ['orchestrating'],
  orchestrating:    ['resolving_canvas', 'planning_speech'],
  resolving_canvas: ['rendering_canvas', 'turn_error'],
  rendering_canvas: ['planning_speech'],
  planning_speech:  ['speaking'],
  speaking:         ['waiting_for_user', 'listening'],
  waiting_for_user: ['idle', 'listening'],
  turn_error:       ['waiting_for_user'],
};

// ── Guards ────────────────────────────────────────────────────────────────────

/** No new turn starts while another is in orchestrating or resolving_canvas */
export function canStartNewTurn(current: TurnState): boolean {
  return current === 'idle' || current === 'waiting_for_user';
}

/** Only VoiceTurnOrchestrator may call this — barge-in guard */
export function canInterrupt(current: TurnState): boolean {
  return current === 'speaking';
}

/** transition guard — validates against VALID_TURN_TRANSITIONS */
export function isValidTurnTransition(from: TurnState, to: TurnState): boolean {
  return VALID_TURN_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Turn metadata ─────────────────────────────────────────────────────────────

export interface TurnRecord {
  turnId: string;
  sessionId: string;
  startedAt: number;          // Date.now()
  transcript?: string;
  selectedIntent?: string;
  canvasViewId?: string;
  state: TurnState;
  errorCode?: string;
}

// ── State snapshot ────────────────────────────────────────────────────────────

export interface CanvasSessionSnapshot {
  sessionState: SessionState;
  turnState: TurnState;
  currentTurnId: string | null;
  currentViewId: string | null;
  currentViewSummary: string;
  lastTurnId: string | null;
  sessionStartedAt: number | null;
}

export function createInitialSnapshot(): CanvasSessionSnapshot {
  return {
    sessionState: 'disconnected',
    turnState: 'idle',
    currentTurnId: null,
    currentViewId: null,
    currentViewSummary: '',
    lastTurnId: null,
    sessionStartedAt: null,
  };
}
