import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sovereignCardVariants = cva('', {
  variants: {
    variant: {
      default: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-md',
      soft: 'rounded-2xl border border-slate-100 bg-slate-50 p-6',
      inset: 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
      glass:
        'rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-lg backdrop-blur-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type SovereignCardVariant = NonNullable<
  VariantProps<typeof sovereignCardVariants>['variant']
>;

export interface SovereignCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sovereignCardVariants> {
  title?: string;
}

export const SovereignCard = React.forwardRef<
  HTMLDivElement,
  SovereignCardProps
>(({ variant, title, className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(sovereignCardVariants({ variant, className }))}
    {...props}
  >
    {title && (
      <h3 className="mb-3 text-base font-bold text-slate-900">{title}</h3>
    )}
    {children}
  </div>
));
SovereignCard.displayName = 'SovereignCard';
