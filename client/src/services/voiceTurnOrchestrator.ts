/**
 * Voice Turn Orchestrator — Gateway Global AI OS
 *
 * Central orchestrator for the PTT turn lifecycle.
 * Intercepts transcript.final events and sequences:
 *   1. Build VoiceTurnContext from PttSessionContext + transcript
 *   2. Emit canvas.resolve syscall → POST /api/canvas-control
 *   3. If viewId returned, emit canvas.render syscall
 *   4. After render committed, build SpeechGroundingContext
 *   5. Pass SpeechGroundingContext to Gemini for narration
 *
 * SOLE OWNER of barge-in interruption.
 * GeminiStreamingClient exposes interruptSpeech() but never decides when.
 * Audio controller emits signal only.
 *
 * Architecture: canvas_control.md §12, §15, §19
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BACKGROUND_SPEAKING_INSTRUCTIONS,
  BACKGROUND_SPEECH_SUMMARY,
  transcriptMatchesBackgroundPickerIntent,
} from '../../../shared/backgroundPickerIntent';
import type { VoiceTurnContext, PttSessionContext, PttRuntimeState } from '../../../shared/siteRuntimeContext';
import type {
  CanvasSyscallEnvelope,
  CanvasResolveResult,
  CanvasRenderPayload,
  SpeechGroundingContext,
  IntentNextStepPacket,
} from '../../../shared/canvasViewContract';
import type {
  IntentLoopResolution,
  IntentLoopResolveAuthorityTrace,
} from '../../../shared/intentLoopContract';

// ── Interruption signal ───────────────────────────────────────────────────────

export interface InterruptionSignal {
  source: 'ptt_down' | 'barge_in';
  sessionId: string;
}

// ── Gemini speech interface (injected dependency) ─────────────────────────────

export interface GeminiSpeechInterface {
  interruptSpeech(): void;
  sendGroundedSpeechContext(ctx: SpeechGroundingContext): void;
}

// ── Canvas controller interface (injected dependency) ─────────────────────────

export interface CanvasController {
  apply(payload: CanvasRenderPayload): void;
  clear(reason: string): void;
}

// ── Turn state tracking ───────────────────────────────────────────────────────

type OrchestratorTurnState =
  | 'idle'
  | 'orchestrating'
  | 'resolving_canvas'
  | 'rendering_canvas'
  | 'planning_speech';

/** Dev/demo: last canvas-control outcome for operator-visible mutation trace (see COMMAND_CENTER_SURFACE_SPEC_V1.md). */
export interface CanvasSyscallTraceEntry {
  at: number;
  phase: 'canvas.resolve' | 'canvas.render_audit';
  syscall: 'canvas.resolve' | 'canvas.render';
  httpStatus: number;
  ok: boolean;
  syscallId?: string;
  errorCode?: string;
  message?: string;
  latencyMs?: number;
  resultSummary?: string;
  /** Phase A: PII-free intent-loop line from server (`CanvasResolveResult.resolutionSummary`). */
  resolutionSummary?: string;
  /** Phase B: audit correlation id from server (`intentLoopResolution.resolutionId`). */
  intentLoopResolutionId?: string;
  /** Router vs merged authority (`intentLoopTrace` on `canvas.resolve`). */
  routerSelectedViewId?: string;
  finalSelectedViewId?: string;
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export class VoiceTurnOrchestrator {
  private sessionContext: PttSessionContext | null = null;
  private runtimeState: PttRuntimeState;
  private recentTurns: VoiceTurnContext['recentTurns'] = [];

  private gemini: GeminiSpeechInterface | null = null;
  private canvasController: CanvasController | null = null;

  private turnState: OrchestratorTurnState = 'idle';
  private currentTurnId: string | null = null;

  private canvasTraceListener: ((entry: CanvasSyscallTraceEntry) => void) | null = null;
  private lastNextStepPacket: IntentNextStepPacket | null = null;

  constructor() {
    this.runtimeState = {
      currentCanvasView: null,
      currentCanvasSummary: '',
      lastTurnId: null,
    };
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  init(
    sessionContext: PttSessionContext,
    runtimeState: PttRuntimeState,
    gemini: GeminiSpeechInterface,
    canvasController: CanvasController,
  ): void {
    this.sessionContext = sessionContext;
    this.runtimeState = runtimeState;
    this.gemini = gemini;
    this.canvasController = canvasController;
    this.turnState = 'idle';
    this.currentTurnId = null;
    this.recentTurns = [];
  }

  /** Optional listener for governed canvas syscall trace (dev / `?canvasTrace=1` only in UI). */
  setCanvasTraceListener(cb: ((entry: CanvasSyscallTraceEntry) => void) | null): void {
    this.canvasTraceListener = cb;
  }

  private emitCanvasTrace(entry: CanvasSyscallTraceEntry): void {
    try {
      this.canvasTraceListener?.(entry);
    } catch (e) {
      console.warn('[VoiceTurnOrchestrator] canvasTraceListener error', e);
    }
  }

  // ── Barge-in (SOLE authority) ──────────────────────────────────────────────

  handleBargeIn(signal: InterruptionSignal): void {
    if (!this.gemini) return;
    console.log('[VoiceTurnOrchestrator] Barge-in:', signal.source);
    this.gemini.interruptSpeech();
    this.turnState = 'idle';
  }

  // ── Main turn handler ──────────────────────────────────────────────────────

  async handleFinalTranscript(transcript: string): Promise<void> {
    if (!this.sessionContext || !this.gemini) {
      console.warn('[VoiceTurnOrchestrator] Not initialized');
      return;
    }

    const turnId = uuidv4();
    this.currentTurnId = turnId;
    this.turnState = 'orchestrating';

    const turnContext = this.buildVoiceTurnContext(turnId, transcript);

    try {
      // Step 1: canvas.resolve
      this.turnState = 'resolving_canvas';
      const resolveFromServer = await this.dispatchCanvasResolve(turnContext);
      let resolveResult = resolveFromServer;

      // Voice fallback: if server returned no viewId but transcript matches shared appearance matcher.
      // Telemetry distinguishes router-selected vs orchestrator-rescued opens (see INTENT_LOOP_GOVERNANCE).
      if (
        !resolveResult.selectedViewId &&
        transcriptMatchesBackgroundPickerIntent(turnContext.transcript)
      ) {
        console.info(
          JSON.stringify({
            event: 'canvas_appearance.picker_fallback_injected',
            background_picker_fallback_injected: true,
            source: 'voice_turn_orchestrator',
            turnId: turnContext.turnId,
            sessionId: turnContext.sessionId,
            siteConfigId: turnContext.siteRuntime.identity.siteConfigId,
            transcript: turnContext.transcript.slice(0, 500),
            originalSelectedViewId: resolveFromServer.selectedViewId ?? null,
            originalRenderMode: resolveFromServer.renderMode,
            originalReason: resolveFromServer.reason,
            originalResolutionSummary: resolveFromServer.resolutionSummary ?? null,
            injectedViewId: 'canvas_backgrounds',
          }),
        );
        resolveResult = {
          selectedViewId: 'canvas_backgrounds',
          renderMode: 'replace',
          intentRouterTier: 1,
          reason: 'client_voice_fallback_canvas_appearance_intent',
          resolutionSummary: 'fallback:canvas_backgrounds_voice',
          speechContext: {
            screenSummary: BACKGROUND_SPEECH_SUMMARY,
            speakingInstructions: BACKGROUND_SPEAKING_INSTRUCTIONS,
          },
        };
      }

      // Step 2: canvas.render (if view selected)
      // Server may return renderMode `noop` while still authorizing a view: experience continuity
      // (same surface) or intent-loop prior-view pin. Skipping hydrate here leaves activeExperience
      // empty while speech is grounded — must still dispatch when runtime never applied that viewId.
      if (this.shouldDispatchCanvasRender(resolveResult)) {
        this.turnState = 'rendering_canvas';
        await this.dispatchCanvasRender(turnContext, resolveResult);
      }

      // Step 3: build speech grounding context and pass to Gemini
      this.turnState = 'planning_speech';
      const speechCtx = this.buildSpeechGroundingContext(turnId, resolveResult);
      this.gemini.sendGroundedSpeechContext(speechCtx);

      // Update ring buffer
      this.pushRecentTurn(turnId, transcript, resolveResult);
      this.runtimeState.lastTurnId = turnId;

    } catch (err) {
      console.error('[VoiceTurnOrchestrator] Turn error:', err);
      // On error: clear canvas to safe state, allow speech to proceed un-grounded
      const speechCtx: SpeechGroundingContext = {
        turnId,
        currentViewId: this.runtimeState.currentCanvasView ?? undefined,
        screenSummary: 'An error occurred loading the canvas.',
        speakingInstructions: 'Apologize briefly and offer to try again.',
      };
      this.gemini.sendGroundedSpeechContext(speechCtx);
    } finally {
      this.turnState = 'idle';
    }
  }

  // ── Canvas syscall helpers ─────────────────────────────────────────────────

  /**
   * Hydrate canvas when resolve authorizes a viewId. Plain `noop` means "no transition" for
   * continuity, but the client must still run the first hydrate if runtime state was never set
   * (e.g. merge pinned prior view while router returned noop).
   */
  private shouldDispatchCanvasRender(resolveResult: CanvasResolveResult): boolean {
    const sid = resolveResult.selectedViewId;
    if (!sid) return false;
    if (resolveResult.renderMode !== 'noop') return true;
    return this.runtimeState.currentCanvasView !== sid;
  }

  /** Read-only: current in-orchestrator canvas view (for React/orchestrator desync recovery). */
  getCurrentCanvasViewId(): string | null {
    return this.runtimeState.currentCanvasView ?? null;
  }

  /** Read-only: last IntentNextStepPacket from canvas.resolve (for canvas rendering decisions). */
  getLastNextStepPacket(): IntentNextStepPacket | null {
    return this.lastNextStepPacket;
  }

  private async dispatchCanvasResolve(turnCtx: VoiceTurnContext): Promise<CanvasResolveResult> {
    const envelope: CanvasSyscallEnvelope = {
      version: '1.0',
      syscallId: uuidv4(),
      turnId: turnCtx.turnId,
      sessionId: turnCtx.sessionId,
      siteConfigId: turnCtx.siteRuntime.identity.siteConfigId,
      visitorId: turnCtx.visitor.visitorId,
      syscall: 'canvas.resolve',
      source: 'voice_turn_orchestrator',
      security: {
        securityLevel: turnCtx.visitor.securityLevel,
        authState: turnCtx.visitor.authState,
      },
      context: {
        currentViewId: turnCtx.currentCanvas.currentViewId,
        workspaceState: turnCtx.siteRuntime.identity.workspaceState,
      },
      payload: {
        transcript: turnCtx.transcript,
        recentTurns: turnCtx.recentTurns,
        currentCanvasSummary: turnCtx.currentCanvas.currentViewSummary,
      },
    };

    const response = await fetch('/api/canvas-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    let json: {
      result?: CanvasResolveResult;
      syscallId?: string;
      latencyMs?: number;
      intentLoopResolution?: IntentLoopResolution;
      intentLoopTrace?: IntentLoopResolveAuthorityTrace;
      nextStep?: IntentNextStepPacket;
      error?: string;
      message?: string;
    } = {};
    try {
      json = (await response.json()) as typeof json;
    } catch {
      /* non-JSON body */
    }

    const sid = json.syscallId ?? envelope.syscallId;
    const result = json.result;
    const resultSummary =
      response.ok && result
        ? `view=${result.selectedViewId ?? 'none'} mode=${result.renderMode}`
        : undefined;
    const resolutionSummary =
      response.ok && result?.resolutionSummary ? result.resolutionSummary : undefined;
    const intentLoopResolutionId =
      response.ok && json.intentLoopResolution?.resolutionId
        ? json.intentLoopResolution.resolutionId
        : undefined;
    const tr = response.ok ? json.intentLoopTrace : undefined;

    this.emitCanvasTrace({
      at: Date.now(),
      phase: 'canvas.resolve',
      syscall: 'canvas.resolve',
      httpStatus: response.status,
      ok: response.ok,
      syscallId: sid,
      errorCode: response.ok ? undefined : String(json.error ?? 'HTTP_ERROR'),
      message: response.ok ? undefined : String(json.message ?? response.statusText),
      latencyMs: typeof json.latencyMs === 'number' ? json.latencyMs : undefined,
      resultSummary,
      resolutionSummary,
      intentLoopResolutionId,
      routerSelectedViewId: tr?.routerSelectedViewId,
      finalSelectedViewId: tr?.finalSelectedViewId,
    });

    if (!response.ok) {
      this.lastNextStepPacket = null;
      return { renderMode: 'noop', reason: 'canvas.resolve HTTP error' };
    }

    this.lastNextStepPacket = json.nextStep ?? null;
    return result ?? { renderMode: 'noop', reason: 'empty resolve result' };
  }

  private async dispatchCanvasRender(
    turnCtx: VoiceTurnContext,
    resolveResult: CanvasResolveResult,
  ): Promise<void> {
    // Missing selectedViewId: server noop/deny after merge — do not hydrate or invent a view client-side.
    if (!this.canvasController || !resolveResult.selectedViewId) return;

    const siteRuntime = turnCtx.siteRuntime;

    // Hydrate payload from site runtime based on viewId
    const viewId = resolveResult.selectedViewId;
    const hydratedPayload = this.hydrateViewPayload(viewId, siteRuntime);

    if (!hydratedPayload) {
      console.warn('[VoiceTurnOrchestrator] No hydration for viewId:', viewId);
      return;
    }

    // Apply to canvas controller (client-owned canvas store)
    this.canvasController.apply(hydratedPayload as CanvasRenderPayload);

    // Update runtime state
    this.runtimeState.currentCanvasView = viewId;
    this.runtimeState.currentCanvasSummary = resolveResult.speechContext?.screenSummary ?? '';

    // Confirm render to server for audit
    const renderEnvelope: CanvasSyscallEnvelope = {
      version: '1.0',
      syscallId: uuidv4(),
      turnId: turnCtx.turnId,
      sessionId: turnCtx.sessionId,
      siteConfigId: siteRuntime.identity.siteConfigId,
      visitorId: turnCtx.visitor.visitorId,
      syscall: 'canvas.render',
      source: 'voice_turn_orchestrator',
      security: {
        securityLevel: turnCtx.visitor.securityLevel,
        authState: turnCtx.visitor.authState,
      },
      context: {
        currentViewId: viewId,
        workspaceState: siteRuntime.identity.workspaceState,
      },
      payload: hydratedPayload,
    };

    // Fire-and-forget audit confirmation (+ optional trace)
    fetch('/api/canvas-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderEnvelope),
    })
      .then(async (res) => {
        let body: {
          syscallId?: string;
          latencyMs?: number;
          error?: string;
          message?: string;
        } = {};
        try {
          body = (await res.json()) as typeof body;
        } catch {
          /* ignore */
        }
        this.emitCanvasTrace({
          at: Date.now(),
          phase: 'canvas.render_audit',
          syscall: 'canvas.render',
          httpStatus: res.status,
          ok: res.ok,
          syscallId: body.syscallId ?? renderEnvelope.syscallId,
          errorCode: res.ok ? undefined : String(body.error ?? 'HTTP_ERROR'),
          message: res.ok ? undefined : String(body.message ?? res.statusText),
          latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : undefined,
          resultSummary: res.ok ? `viewId=${viewId}` : undefined,
        });
      })
      .catch(err => console.warn('[VoiceTurnOrchestrator] canvas.render audit failed:', err));
  }

  // ── View hydration from SiteRuntimeContext ─────────────────────────────────

  private hydrateViewPayload(
    viewId: string,
    siteRuntime: VoiceTurnContext['siteRuntime'],
  ): Partial<CanvasRenderPayload> | null {
    const { business } = siteRuntime;

    switch (viewId) {
      case 'welcome':
        return {
          viewId: 'welcome',
          renderMode: 'replace',
          title: `Welcome to ${business.name}`,
          data: {
            greeting: `How can I help you today at ${business.name}?`,
            intentOptions: [
              { label: 'Services & Pricing', viewId: 'service_menu' },
              { label: 'FAQ', viewId: 'faq_list' },
              { label: 'Support', viewId: 'support_home' },
            ],
          },
        };
      case 'service_menu':
        return {
          viewId: 'service_menu',
          renderMode: 'replace',
          title: `${business.name} Services`,
          data: {
            title: `${business.name} Services`,
            items: business.serviceMenu,
          },
        };
      case 'faq_list':
        return {
          viewId: 'faq_list',
          renderMode: 'replace',
          title: 'Frequently Asked Questions',
          data: { title: 'Frequently Asked Questions', faqs: business.faqs },
        };
      case 'intake_checklist':
        return {
          viewId: 'intake_checklist',
          renderMode: 'replace',
          title: 'Getting Started',
          data: { title: 'Getting Started', steps: business.taskOrder },
        };
      case 'support_home':
        return {
          viewId: 'support_home',
          renderMode: 'replace',
          title: 'Support',
          data: {
            topics: [
              { label: 'General Help', description: 'Common questions and answers', action: 'open_faq' },
              { label: 'Contact Us', description: 'Reach a team member', action: 'escalate' },
            ],
          },
        };
      case 'canvas_backgrounds':
        return {
          viewId: 'canvas_backgrounds',
          renderMode: 'replace',
          title: 'Canvas appearance',
          data: {
            helperText:
              'Background: pick a catalog effect (full strength — use tint only if you need contrast). Surface: tune the card, text, and optional scrim in Canvas & layout.',
          },
        };
      case 'command_center':
        return {
          viewId: 'command_center',
          renderMode: 'replace',
          title: `${business.name} — Command Center`,
          data: {
            headline: `Operations overview — ${business.name}`,
            contextSummary: `Plan tier: ${siteRuntime.entitlements.plan}`,
            statusItems: [
              {
                id: 'voice',
                label: 'Voice package',
                value: siteRuntime.entitlements.voicePlanActive ? 'Active' : 'Not subscribed',
                tone: siteRuntime.entitlements.voicePlanActive ? 'success' : 'warning',
              },
              {
                id: 'canvas',
                label: 'Canvas syscall plane',
                value: 'Ready',
                tone: 'success',
              },
            ],
            workItems: [
              {
                id: 'w1',
                title: 'Guest-facing views',
                subtitle: 'Services, FAQ, schedule, and support home resolve via canvas intents.',
              },
              {
                id: 'w2',
                title: 'Staff & admin tools',
                subtitle: 'Agent roster, knowledge builder, and provisioning require elevated access.',
              },
            ],
            approvals: [],
          },
        };
      default:
        return {
          viewId: 'welcome',
          renderMode: 'replace',
          title: `Welcome to ${business.name}`,
          data: {
            greeting: `How can I help you?`,
            intentOptions: [],
          },
        };
    }
  }

  // ── Speech grounding ───────────────────────────────────────────────────────

  private buildSpeechGroundingContext(
    turnId: string,
    resolveResult: CanvasResolveResult,
  ): SpeechGroundingContext {
    const nextStep = this.lastNextStepPacket;
    return {
      turnId,
      currentViewId: this.runtimeState.currentCanvasView ?? undefined,
      screenSummary: nextStep?.resultSummary
        ?? resolveResult.speechContext?.screenSummary
        ?? this.runtimeState.currentCanvasSummary
        ?? 'Canvas ready.',
      speakingInstructions: nextStep?.promptToUser
        ?? resolveResult.speechContext?.speakingInstructions,
      allowedReferences: undefined,
    };
  }

  // ── Turn context builder ───────────────────────────────────────────────────

  private buildVoiceTurnContext(turnId: string, transcript: string): VoiceTurnContext {
    const ctx = this.sessionContext!;
    return {
      turnId,
      sessionId: ctx.sessionId,
      transcript,
      siteRuntime: ctx.siteRuntime,
      visitor: {
        visitorId: ctx.visitor.visitorId,
        securityLevel: ctx.visitor.securityLevel,
        authState: ctx.visitor.authState,
      },
      currentCanvas: {
        currentViewId: this.runtimeState.currentCanvasView ?? undefined,
        currentViewSummary: this.runtimeState.currentCanvasSummary,
      },
      recentTurns: [...this.recentTurns],
    };
  }

  // ── Recent turn ring buffer (max 3) ────────────────────────────────────────

  private pushRecentTurn(
    turnId: string,
    transcript: string,
    resolveResult: CanvasResolveResult,
  ): void {
    this.recentTurns.push({
      turnId,
      transcript,
      selectedIntent: resolveResult.reason,
      currentViewId: resolveResult.selectedViewId,
    });
    if (this.recentTurns.length > 3) {
      this.recentTurns.shift();
    }
  }

  // ── Public state accessors ─────────────────────────────────────────────────

  getTurnState(): OrchestratorTurnState {
    return this.turnState;
  }

  getCurrentTurnId(): string | null {
    return this.currentTurnId;
  }

  /**
   * Apply a canvas payload through the governed controller.
   * Used by skill dispatch and other server-originated canvas mutations.
   * If the orchestrator is not initialized, falls back safely (no-op) with a warning.
   */
  applyCanvasPayload(payload: CanvasRenderPayload): void {
    if (!this.canvasController) {
      console.warn('[VoiceTurnOrchestrator] applyCanvasPayload called before init() — payload dropped');
      return;
    }
    this.canvasController.apply(payload);
    const viewId = (payload as { viewId?: string }).viewId ?? null;
    if (viewId) {
      this.runtimeState.currentCanvasView = viewId;
    }
  }

  clearCanvas(reason: string): void {
    if (!this.canvasController) return;
    this.canvasController.clear(reason);
    this.runtimeState.currentCanvasView = null;
    this.runtimeState.currentCanvasSummary = '';
  }
}

// Singleton export for use in ConciergePanel
export const voiceTurnOrchestrator = new VoiceTurnOrchestrator();
