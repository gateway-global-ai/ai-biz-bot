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
import type { VoiceTurnContext, PttSessionContext, PttRuntimeState } from '../../../shared/siteRuntimeContext';
import type {
  CanvasSyscallEnvelope,
  CanvasResolveResult,
  CanvasRenderPayload,
  SpeechGroundingContext,
} from '../../../shared/canvasViewContract';

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

// ── Main orchestrator ─────────────────────────────────────────────────────────

export class VoiceTurnOrchestrator {
  private sessionContext: PttSessionContext | null = null;
  private runtimeState: PttRuntimeState;
  private recentTurns: VoiceTurnContext['recentTurns'] = [];

  private gemini: GeminiSpeechInterface | null = null;
  private canvasController: CanvasController | null = null;

  private turnState: OrchestratorTurnState = 'idle';
  private currentTurnId: string | null = null;

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
      const resolveResult = await this.dispatchCanvasResolve(turnContext);

      // Step 2: canvas.render (if view selected)
      if (resolveResult.renderMode !== 'noop' && resolveResult.selectedViewId) {
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

    if (!response.ok) {
      return { renderMode: 'noop', reason: 'canvas.resolve HTTP error' };
    }

    const json = await response.json() as { result: CanvasResolveResult };
    return json.result ?? { renderMode: 'noop', reason: 'empty resolve result' };
  }

  private async dispatchCanvasRender(
    turnCtx: VoiceTurnContext,
    resolveResult: CanvasResolveResult,
  ): Promise<void> {
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

    // Fire-and-forget audit confirmation
    fetch('/api/canvas-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderEnvelope),
    }).catch(err => console.warn('[VoiceTurnOrchestrator] canvas.render audit failed:', err));
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
    return {
      turnId,
      currentViewId: this.runtimeState.currentCanvasView ?? undefined,
      screenSummary: resolveResult.speechContext?.screenSummary
        ?? this.runtimeState.currentCanvasSummary
        ?? 'Canvas ready.',
      speakingInstructions: resolveResult.speechContext?.speakingInstructions,
      allowedReferences: undefined, // Populated by server validator in future
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
