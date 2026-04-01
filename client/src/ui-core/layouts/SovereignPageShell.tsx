import * as React from 'react';
import { cn } from '@/lib/utils';

const maxWidthMap = {
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
} as const;

export interface SovereignPageShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof maxWidthMap;
}

export const SovereignPageShell = React.forwardRef<
  HTMLElement,
  SovereignPageShellProps
>(({ children, className, maxWidth = '5xl' }, ref) => (
  <main
    ref={ref}
    className={cn(
      'min-h-screen bg-[#F5F7F7] text-slate-900 px-6 md:px-8 lg:px-12 py-8 mx-auto',
      maxWidthMap[maxWidth],
      className,
    )}
  >
    {children}
  </main>
));
SovereignPageShell.displayName = 'SovereignPageShell';
