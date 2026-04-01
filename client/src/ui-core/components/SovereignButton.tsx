import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sovereignButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      sovereignVariant: {
        primary:
          'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_0_30px_rgba(16,185,129,0.12)]',
        secondary:
          'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200',
        ghost:
          'bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent',
        danger: 'bg-red-500 text-white hover:bg-red-400',
        icon: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-xl',
        md: 'h-10 px-4 text-sm rounded-xl',
        lg: 'h-12 px-5 text-sm rounded-xl',
        ptt: 'h-14 min-w-[180px] px-6 rounded-2xl text-sm',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      sovereignVariant: 'primary',
      size: 'md',
    },
  },
);

export type SovereignButtonVariant = NonNullable<
  VariantProps<typeof sovereignButtonVariants>['sovereignVariant']
>;

export interface SovereignButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sovereignButtonVariants> {
  asChild?: boolean;
}

export const SovereignButton = React.forwardRef<
  HTMLButtonElement,
  SovereignButtonProps
>(({ className, sovereignVariant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(
        sovereignButtonVariants({ sovereignVariant, size, className }),
      )}
      {...props}
    />
  );
});
SovereignButton.displayName = 'SovereignButton';
