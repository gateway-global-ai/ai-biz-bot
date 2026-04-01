import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface SovereignLoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'dots';
  className?: string;
}

function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 w-full max-w-sm mx-auto', className)}>
      <div className="h-4 w-full rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-4 w-3/4 rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded-lg bg-slate-200 animate-pulse" />
    </div>
  );
}

function Dots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function SovereignLoadingState({
  message,
  variant = 'spinner',
  className,
}: SovereignLoadingStateProps) {
  const Renderer = variant === 'skeleton' ? Skeleton : variant === 'dots' ? Dots : Spinner;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-3', className)}>
      <Renderer />
      {message && (
        <p className="text-sm text-slate-500">{message}</p>
      )}
    </div>
  );
}
