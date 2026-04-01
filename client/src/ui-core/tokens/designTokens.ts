/**
 * AI OS Design Tokens — Single source of truth for spacing, radius, shadow, color, and typography.
 *
 * These tokens back Tailwind CSS variables and Sovereign wrappers.
 * Agents must import from here or from `@/config/brand` — never hardcode hex/px values.
 */

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.06)',
  md: '0 8px 24px rgba(15,23,42,0.10)',
  lg: '0 16px 40px rgba(15,23,42,0.14)',
  glow: '0 0 0 1px rgba(16,185,129,0.18), 0 0 30px rgba(16,185,129,0.12)',
} as const;

export const colors = {
  bg: {
    shell: '#081120',
    canvas: '#F5F7F7',
    panel: '#FFFFFF',
    panelAlt: '#F8FAFC',
    overlay: 'rgba(8,17,32,0.68)',
  },
  brand: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  text: {
    strong: '#0F172A',
    body: '#334155',
    muted: '#64748B',
    inverse: '#F8FAFC',
  },
  border: {
    soft: '#E2E8F0',
    strong: '#CBD5E1',
    inverse: 'rgba(255,255,255,0.14)',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export const typography = {
  fontSans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  sizes: {
    xs: ['12px', '16px'] as const,
    sm: ['14px', '20px'] as const,
    base: ['16px', '24px'] as const,
    lg: ['18px', '28px'] as const,
    xl: ['20px', '30px'] as const,
    '2xl': ['24px', '32px'] as const,
    '3xl': ['32px', '40px'] as const,
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export type DesignTokenColors = typeof colors;
export type DesignTokenSpacing = typeof spacing;
export type DesignTokenRadius = typeof radius;
export type DesignTokenShadow = typeof shadow;
export type DesignTokenTypography = typeof typography;
