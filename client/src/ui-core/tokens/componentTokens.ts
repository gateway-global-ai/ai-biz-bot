/**
 * Component-level tokens — sizes, variants, and constraints for Sovereign wrappers.
 *
 * These complement designTokens.ts with component-specific dimensions.
 */

export const buttonSizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
  ptt: 'h-14 min-w-[180px] px-6 rounded-2xl text-sm',
  icon: 'h-10 w-10',
} as const;

export const buttonVariants = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_0_30px_rgba(16,185,129,0.12)]',
  secondary: 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent',
  danger: 'bg-red-500 text-white hover:bg-red-400',
  icon: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
} as const;

export const cardVariants = {
  default: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-md',
  soft: 'rounded-2xl border border-slate-100 bg-slate-50 p-6',
  inset: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
  glass: 'rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-lg backdrop-blur-xl',
} as const;

export const tableRowHeight = {
  compact: 44,
  default: 48,
  comfortable: 52,
} as const;

export const modalMaxWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

export type ButtonSize = keyof typeof buttonSizes;
export type ButtonVariant = keyof typeof buttonVariants;
export type CardVariant = keyof typeof cardVariants;
