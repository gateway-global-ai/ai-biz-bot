import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sovereignAlertVariants = cva(
  'relative w-full rounded-xl border p-4 text-sm',
  {
    variants: {
      variant: {
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

export type SovereignAlertVariant = NonNullable<
  VariantProps<typeof sovereignAlertVariants>['variant']
>;

export interface SovereignAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sovereignAlertVariants> {
  title?: string;
}

export const SovereignAlert = React.forwardRef<
  HTMLDivElement,
  SovereignAlertProps
>(({ variant, title, className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(sovereignAlertVariants({ variant, className }))}
    {...props}
  >
    {title && <h5 className="mb-1 font-semibold leading-none">{title}</h5>}
    <div className="text-sm leading-relaxed">{children}</div>
  </div>
));
SovereignAlert.displayName = 'SovereignAlert';
