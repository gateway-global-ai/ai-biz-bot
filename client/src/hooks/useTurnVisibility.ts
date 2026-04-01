import { useState, useEffect, useRef, useMemo } from 'react';
import type { PttUiMode, VisibilityPolicy } from '@/config/brand';

interface TurnVisibilityInput {
  isRecording: boolean;
  isProcessing: boolean;
  isAISpeaking: boolean;
}

interface TurnVisibilityOutput {
  mode: PttUiMode;
  visibility: VisibilityPolicy;
  turnActive: boolean;
}

const LINGER_MS = 800;

function deriveMode(input: TurnVisibilityInput): PttUiMode {
  if (input.isRecording) return 'recording';
  if (input.isProcessing) return 'processing';
  if (input.isAISpeaking) return 'speaking';
  return 'idle';
}

function deriveVisibility(mode: PttUiMode): VisibilityPolicy {
  switch (mode) {
    case 'recording':
      return { visualizer: true, liveTranscript: true, thinkingMotion: false, appCanvas: true };
    case 'processing':
      return { visualizer: true, liveTranscript: true, thinkingMotion: true, appCanvas: true };
    case 'speaking':
      return { visualizer: true, liveTranscript: false, thinkingMotion: false, appCanvas: true };
    case 'idle':
    default:
      return { visualizer: false, liveTranscript: false, thinkingMotion: false, appCanvas: true };
  }
}

export function useTurnVisibility(input: TurnVisibilityInput): TurnVisibilityOutput {
  const rawMode = deriveMode(input);
  const [lingering, setLingering] = useState(false);
  const lingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRawMode = useRef<PttUiMode>(rawMode);

  useEffect(() => {
    const prev = prevRawMode.current;
    prevRawMode.current = rawMode;

    if (lingerTimer.current) {
      clearTimeout(lingerTimer.current);
      lingerTimer.current = null;
    }

    if (prev !== 'idle' && rawMode === 'idle') {
      setLingering(true);
      lingerTimer.current = setTimeout(() => {
        setLingering(false);
        lingerTimer.current = null;
      }, LINGER_MS);
    } else if (rawMode !== 'idle') {
      setLingering(false);
    }

    return () => {
      if (lingerTimer.current) {
        clearTimeout(lingerTimer.current);
      }
    };
  }, [rawMode]);

  const turnActive = rawMode !== 'idle' || lingering;

  const effectiveMode: PttUiMode = lingering ? 'speaking' : rawMode;

  const visibility = useMemo(() => deriveVisibility(effectiveMode), [effectiveMode]);

  return { mode: effectiveMode, visibility, turnActive };
}
