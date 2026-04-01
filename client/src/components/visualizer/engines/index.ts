import type { RenderEngine } from '../types';
import { circularPulse } from './circularPulse';
import { sineWave } from './sineWave';
import { orb } from './orb';

export const VISUALIZER_ENGINES: Record<string, RenderEngine> = {
  circular_pulse: circularPulse,
  sine_wave: sineWave,
  orb,
};

export function getEngine(type: string): RenderEngine {
  return VISUALIZER_ENGINES[type] ?? circularPulse;
}
