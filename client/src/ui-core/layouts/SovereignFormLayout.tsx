import * as React from 'react';
import { cn } from '@/lib/utils';
import { SovereignSectionHeader } from './SovereignSectionHeader';

export interface SovereignFormLayoutProps {
  children: React.ReactNode;
  title?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  className?: string;
}

export const SovereignFormLayout = React.forwardRef<
  HTMLFormElement,
  SovereignFormLayoutProps
>(({ children, title, onSubmit, className }, ref) => (
  <form
    ref={ref}
    onSubmit={onSubmit}
    className={cn('max-w-xl mx-auto space-y-6', className)}
  >
    {title && <SovereignSectionHeader title={title} />}
    {children}
  </form>
));
SovereignFormLayout.displayName = 'SovereignFormLayout';
