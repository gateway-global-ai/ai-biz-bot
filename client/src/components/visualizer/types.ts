export type VisualizerState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VisualizerConfig {
  type: 'circular_pulse' | 'sine_wave' | 'orb';
  primaryColor?: string;
  secondaryColor?: string;
  opacity?: number;
  glowIntensity?: number;
  barCount?: number;
  smoothing?: number;
  amplitudeScale?: number;
  reactivityScale?: number;
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  type: 'circular_pulse',
  primaryColor: '#008a3e',
  secondaryColor: '#10b981',
  opacity: 0.85,
  glowIntensity: 0.6,
  barCount: 64,
  smoothing: 0.7,
  amplitudeScale: 1.0,
  reactivityScale: 1.0,
};

/**
 * Pure render function signature — the SDK sandbox.
 * Engines implement this contract. No hooks, no React, no side effects.
 */
export type RenderEngine = (
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  state: VisualizerState,
  width: number,
  height: number,
  config: VisualizerConfig,
  time: number,
) => void;
