import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { modalMaxWidths } from '../tokens/componentTokens';

export interface SovereignModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: keyof typeof modalMaxWidths;
  footer?: React.ReactNode;
  className?: string;
}

export const SovereignModal = React.forwardRef<
  HTMLDivElement,
  SovereignModalProps
>(
  (
    {
      open,
      onClose,
      title,
      description,
      children,
      maxWidth = 'md',
      footer,
      className,
    },
    ref,
  ) => (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        ref={ref}
        className={cn(
          'rounded-2xl border border-slate-200 bg-white p-0 shadow-lg',
          modalMaxWidths[maxWidth],
          className,
        )}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="px-6 py-4">{children}</div>

        {footer && (
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  ),
);
SovereignModal.displayName = 'SovereignModal';
