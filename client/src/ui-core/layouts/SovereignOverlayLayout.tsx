import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface SovereignOverlayLayoutProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function SovereignOverlayLayout({
  open,
  onClose,
  children,
  title,
  className,
}: SovereignOverlayLayoutProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center transition-opacity duration-200',
        open ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(8,17,32,0.68)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* content panel */}
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-lg max-w-2xl w-full mx-4 mt-16 p-6 max-h-[80vh] overflow-y-auto',
          'animate-in fade-in slide-in-from-bottom-4 duration-200',
          className,
        )}
      >
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <h2 className="text-xl font-semibold text-slate-900 pr-10 mb-4">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
}
