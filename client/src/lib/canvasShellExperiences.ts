/**
 * In-shell canvas payloads for intent chips (no route navigation).
 * Align with server hydration in client/src/services/voiceTurnOrchestrator.ts for canvas_backgrounds.
 */
import type { CanvasRenderPayload } from '@shared/canvasViewContract';

export function canvasBackgroundPickerShellPayload(): Extract<
  CanvasRenderPayload,
  { viewId: 'canvas_backgrounds' }
> {
  return {
    viewId: 'canvas_backgrounds',
    renderMode: 'replace',
    title: 'Canvas appearance',
    data: {
      helperText:
        'Compose the shell: choose a background effect at full strength, then adjust surface (card) and text. Optional scrim only if you need more contrast.',
    },
  };
}
