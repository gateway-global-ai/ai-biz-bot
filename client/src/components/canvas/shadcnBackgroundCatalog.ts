/**
 * shadcn.io React Backgrounds — catalog metadata for governed canvas picker.
 * Design-time install: `npx shadcn@latest add https://shadcn.io/r/<slug>.json`
 * Runtime uses CanvasBackgroundLayer renderers (token-safe CSS/canvas), not live MCP.
 */

export type BackgroundCategoryId =
  | 'particles_floating'
  | 'space_sky'
  | 'weather_nature'
  | 'grids_patterns'
  | 'gradients_color'
  | 'waves_flow'
  | 'light_beams'
  | 'tech_digital';

export interface BackgroundCatalogItem {
  id: string;
  label: string;
  description: string;
  categoryId: BackgroundCategoryId;
  /** Slug for shadcn.io CLI (documentation / promotion path) */
  cliSlug: string;
  /**
   * Internal visual profile for CanvasBackgroundLayer (governed runtime).
   * Multiple catalog rows may share a profile with different tints.
   */
  effectProfile: string;
}

export const SHADCN_BACKGROUND_CATEGORIES: Array<{
  id: BackgroundCategoryId;
  title: string;
  blurb: string;
}> = [
  {
    id: 'particles_floating',
    title: 'Particles & Floating',
    blurb: 'Floating elements that drift, sparkle, and create depth.',
  },
  {
    id: 'space_sky',
    title: 'Space & Sky',
    blurb: 'Cosmic effects from starfields to auroras.',
  },
  {
    id: 'weather_nature',
    title: 'Weather & Nature',
    blurb: 'Rain, snow, fog, underwater — bring nature to screen.',
  },
  {
    id: 'grids_patterns',
    title: 'Grids & Patterns',
    blurb: 'Structured backgrounds from minimal dots to retro perspective grids.',
  },
  {
    id: 'gradients_color',
    title: 'Gradients & Color',
    blurb: 'Flowing colors and smooth transitions.',
  },
  {
    id: 'waves_flow',
    title: 'Waves & Flow',
    blurb: 'Smooth flowing lines and organic motion.',
  },
  {
    id: 'light_beams',
    title: 'Light & Beams',
    blurb: 'Light effects from subtle glows to dramatic beams.',
  },
  {
    id: 'tech_digital',
    title: 'Tech & Digital',
    blurb: 'Cyberpunk and digital aesthetics.',
  },
];

export const SHADCN_BACKGROUND_ITEMS: BackgroundCatalogItem[] = [
  // Particles & Floating
  { id: 'particles', label: 'Particles', description: 'Floating particle system', categoryId: 'particles_floating', cliSlug: 'particles.json', effectProfile: 'particles' },
  { id: 'sparkles', label: 'Sparkles', description: 'Twinkling star particles', categoryId: 'particles_floating', cliSlug: 'sparkles.json', effectProfile: 'sparkles' },
  { id: 'fireflies', label: 'Fireflies', description: 'Glowing summer night', categoryId: 'particles_floating', cliSlug: 'fireflies.json', effectProfile: 'fireflies' },
  { id: 'bokeh', label: 'Bokeh', description: 'Soft out-of-focus lights', categoryId: 'particles_floating', cliSlug: 'bokeh.json', effectProfile: 'bokeh' },
  { id: 'bubble', label: 'Bubble', description: 'Rising floating bubbles', categoryId: 'particles_floating', cliSlug: 'bubble.json', effectProfile: 'bubbles' },
  { id: 'confetti', label: 'Confetti', description: 'Celebration particles', categoryId: 'particles_floating', cliSlug: 'confetti.json', effectProfile: 'confetti' },
  // Space & Sky
  { id: 'starfield', label: 'Starfield', description: 'Flying through space', categoryId: 'space_sky', cliSlug: 'starfield.json', effectProfile: 'starfield' },
  { id: 'aurora', label: 'Aurora', description: 'Northern lights effect', categoryId: 'space_sky', cliSlug: 'aurora.json', effectProfile: 'aurora' },
  { id: 'meteors', label: 'Meteors', description: 'Falling meteor trails', categoryId: 'space_sky', cliSlug: 'meteors.json', effectProfile: 'meteors' },
  { id: 'shooting_stars', label: 'Shooting Stars', description: 'Streaking stars', categoryId: 'space_sky', cliSlug: 'shooting-stars.json', effectProfile: 'shooting_stars' },
  { id: 'constellation', label: 'Constellation', description: 'Connected star network', categoryId: 'space_sky', cliSlug: 'constellation.json', effectProfile: 'constellation' },
  { id: 'orbits', label: 'Orbits', description: 'Orbital ring paths', categoryId: 'space_sky', cliSlug: 'orbits.json', effectProfile: 'orbits' },
  // Weather & Nature
  { id: 'rain', label: 'Rain', description: 'Rainfall with lightning', categoryId: 'weather_nature', cliSlug: 'rain.json', effectProfile: 'rain' },
  { id: 'snow', label: 'Snow', description: 'Gentle snowfall', categoryId: 'weather_nature', cliSlug: 'snow.json', effectProfile: 'snow' },
  { id: 'fog', label: 'Fog', description: 'Atmospheric mist', categoryId: 'weather_nature', cliSlug: 'fog.json', effectProfile: 'fog' },
  { id: 'underwater', label: 'Underwater', description: 'Caustic light patterns', categoryId: 'weather_nature', cliSlug: 'underwater.json', effectProfile: 'underwater' },
  { id: 'fireworks', label: 'Fireworks', description: 'Explosive celebration', categoryId: 'weather_nature', cliSlug: 'fireworks.json', effectProfile: 'fireworks' },
  // Grids & Patterns
  { id: 'grid_pattern', label: 'Grid Pattern', description: 'Clean line grid', categoryId: 'grids_patterns', cliSlug: 'grid-pattern.json', effectProfile: 'grid_pattern' },
  { id: 'dot_pattern', label: 'Dot Pattern', description: 'Subtle dot grid', categoryId: 'grids_patterns', cliSlug: 'dot-pattern.json', effectProfile: 'dot_pattern' },
  { id: 'hexagon', label: 'Hexagon', description: 'Honeycomb pattern', categoryId: 'grids_patterns', cliSlug: 'hexagon.json', effectProfile: 'hexagon' },
  { id: 'flickering_grid', label: 'Flickering Grid', description: 'Animated matrix grid', categoryId: 'grids_patterns', cliSlug: 'flickering-grid.json', effectProfile: 'flickering_grid' },
  { id: 'retro_grid', label: 'Retro Grid', description: '80s perspective grid', categoryId: 'grids_patterns', cliSlug: 'retro-grid.json', effectProfile: 'retro_grid' },
  { id: 'interactive_grid', label: 'Interactive Grid', description: 'Mouse-reactive grid', categoryId: 'grids_patterns', cliSlug: 'interactive-grid.json', effectProfile: 'interactive_grid' },
  // Gradients & Color
  { id: 'mesh_gradient', label: 'Mesh Gradient', description: 'Stripe/Linear style blobs', categoryId: 'gradients_color', cliSlug: 'mesh-gradient.json', effectProfile: 'mesh_gradient' },
  { id: 'gradient', label: 'Gradient', description: 'Flowing gradient shapes', categoryId: 'gradients_color', cliSlug: 'gradient.json', effectProfile: 'gradient' },
  { id: 'gradient_animation', label: 'Gradient Animation', description: 'Animated color shifts', categoryId: 'gradients_color', cliSlug: 'gradient-animation.json', effectProfile: 'gradient_animation' },
  { id: 'vortex', label: 'Vortex', description: 'Spiral color flow', categoryId: 'gradients_color', cliSlug: 'vortex.json', effectProfile: 'vortex' },
  // Waves & Flow
  { id: 'wavy', label: 'Wavy', description: 'Flowing wave lines', categoryId: 'waves_flow', cliSlug: 'wavy.json', effectProfile: 'wavy' },
  { id: 'light_waves', label: 'Light Waves', description: 'Ambient wave animation', categoryId: 'waves_flow', cliSlug: 'light-waves.json', effectProfile: 'light_waves' },
  { id: 'wave_grid', label: 'Wave Grid', description: '3D wave mesh surface', categoryId: 'waves_flow', cliSlug: 'wave-grid.json', effectProfile: 'wave_grid' },
  { id: 'topography', label: 'Topography', description: 'Contour line map', categoryId: 'waves_flow', cliSlug: 'topography.json', effectProfile: 'topography' },
  { id: 'paths', label: 'Paths', description: 'Animated path lines', categoryId: 'waves_flow', cliSlug: 'paths.json', effectProfile: 'paths' },
  // Light & Beams
  { id: 'beams', label: 'Beams', description: 'Light beam rays', categoryId: 'light_beams', cliSlug: 'beams.json', effectProfile: 'beams' },
  { id: 'beams_collision', label: 'Beams Collision', description: 'Colliding light beams', categoryId: 'light_beams', cliSlug: 'beams-collision.json', effectProfile: 'beams_collision' },
  { id: 'spotlight', label: 'Spotlight', description: 'Cursor-following glow', categoryId: 'light_beams', cliSlug: 'spotlight.json', effectProfile: 'spotlight' },
  { id: 'ripple', label: 'Ripple', description: 'Expanding light rings', categoryId: 'light_beams', cliSlug: 'ripple.json', effectProfile: 'ripple' },
  { id: 'circles', label: 'Circles', description: 'Animated circle patterns', categoryId: 'light_beams', cliSlug: 'circles.json', effectProfile: 'circles' },
  // Tech & Digital
  { id: 'matrix', label: 'Matrix', description: 'Digital code rain', categoryId: 'tech_digital', cliSlug: 'matrix.json', effectProfile: 'matrix' },
  { id: 'glitch', label: 'Glitch', description: 'RGB split distortion', categoryId: 'tech_digital', cliSlug: 'glitch.json', effectProfile: 'glitch' },
  { id: 'neon', label: 'Neon', description: 'Glowing neon rings', categoryId: 'tech_digital', cliSlug: 'neon.json', effectProfile: 'neon' },
  { id: 'warp', label: 'Warp', description: 'Hyperspace tunnel', categoryId: 'tech_digital', cliSlug: 'warp.json', effectProfile: 'warp' },
  { id: 'boxes', label: 'Boxes', description: 'Floating 3D boxes', categoryId: 'tech_digital', cliSlug: 'boxes.json', effectProfile: 'boxes' },
];

export function getBackgroundItemById(id: string | null): BackgroundCatalogItem | undefined {
  if (!id) return undefined;
  return SHADCN_BACKGROUND_ITEMS.find((x) => x.id === id);
}

export const CANVAS_BG_FAVORITES_STORAGE_KEY = 'gateway_canvas_bg_favorites_v1';
