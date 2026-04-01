import { useRef, useEffect, useCallback } from 'react';
import type { VisualizerConfig, VisualizerState } from './types';
import { DEFAULT_VISUALIZER_CONFIG } from './types';
import { getEngine } from './engines';

interface DynamicVisualizerProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  volumeLevel: number;
  aiOutputVolume: number;
  isRecording: boolean;
  isProcessing: boolean;
  isAISpeaking: boolean;
  config?: VisualizerConfig;
  className?: string;
}

function resolveState(
  isRecording: boolean,
  isProcessing: boolean,
  isAISpeaking: boolean,
): VisualizerState {
  if (isRecording) return 'listening';
  if (isAISpeaking) return 'speaking';
  if (isProcessing) return 'processing';
  return 'idle';
}

export function DynamicVisualizer({
  inputAnalyser,
  outputAnalyser,
  volumeLevel,
  aiOutputVolume,
  isRecording,
  isProcessing,
  isAISpeaking,
  config = DEFAULT_VISUALIZER_CONFIG,
  className,
}: DynamicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array>(new Uint8Array(128));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const state = resolveState(isRecording, isProcessing, isAISpeaking);
    const activeAnalyser = state === 'listening' ? inputAnalyser
      : state === 'speaking' ? outputAnalyser
      : null;

    if (activeAnalyser) {
      if (dataRef.current.length !== activeAnalyser.frequencyBinCount) {
        dataRef.current = new Uint8Array(activeAnalyser.frequencyBinCount);
      }
      activeAnalyser.getByteFrequencyData(dataRef.current);
    } else {
      // Scalar fallback: synthesize a simple frequency array from volume level
      const vol = state === 'speaking' ? aiOutputVolume : state === 'listening' ? volumeLevel : 0;
      const len = dataRef.current.length;
      for (let i = 0; i < len; i++) {
        const base = vol * 255;
        dataRef.current[i] = Math.max(0, Math.min(255,
          base * (0.5 + 0.5 * Math.sin(i * 0.3 + performance.now() * 0.002))
        ));
      }
    }

    const engine = getEngine(config.type);
    engine(ctx, dataRef.current, state, rect.width, rect.height, config, performance.now());

    rafRef.current = requestAnimationFrame(draw);
  }, [inputAnalyser, outputAnalyser, isRecording, isProcessing, isAISpeaking, volumeLevel, aiOutputVolume, config]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ opacity: config.opacity ?? 0.85 }}
    />
  );
}
