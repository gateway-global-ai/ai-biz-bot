import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sovereignBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-emerald-500/10 text-emerald-700',
        secondary:
          'border-transparent bg-slate-100 text-slate-700',
        danger:
          'border-transparent bg-red-500/10 text-red-700',
        warning:
          'border-transparent bg-amber-500/10 text-amber-700',
        info: 'border-transparent bg-blue-500/10 text-blue-700',
        outline: 'border border-slate-200 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type SovereignBadgeVariant = NonNullable<
  VariantProps<typeof sovereignBadgeVariants>['variant']
>;

export interface SovereignBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof sovereignBadgeVariants> {}

export const SovereignBadge = React.forwardRef<
  HTMLSpanElement,
  SovereignBadgeProps
>(({ className, variant, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(sovereignBadgeVariants({ variant, className }))}
    {...props}
  />
));
SovereignBadge.displayName = 'SovereignBadge';
