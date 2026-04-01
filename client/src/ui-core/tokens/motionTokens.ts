/**
 * Motion tokens — durations, easings, and named motion categories.
 *
 * Rules:
 * - No bouncy motion on operational surfaces
 * - Avoid simultaneous competing animations
 * - Prefer 120ms/180ms/240ms durations
 */

export const durations = {
  fast: '120ms',
  default: '180ms',
  slow: '240ms',
  overlay: '300ms',
} as const;

export const easings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const motionCategories = {
  subtle: {
    description: 'hover, fade, scale 1.01-1.02',
    duration: durations.fast,
    easing: easings.default,
  },
  ambient: {
    description: 'visualizer, glow, background drift',
    duration: durations.slow,
    easing: easings.out,
  },
  transitional: {
    description: 'overlay open/close, card enter',
    duration: durations.overlay,
    easing: easings.out,
  },
} as const;

export const transition = {
  subtle: `${durations.fast} ${easings.default}`,
  default: `${durations.default} ${easings.default}`,
  slow: `${durations.slow} ${easings.out}`,
  overlay: `${durations.overlay} ${easings.out}`,
} as const;
