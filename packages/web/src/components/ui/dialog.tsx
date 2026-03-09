'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  // Prevent body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>,
    document.body
  );
}

interface DialogOverlayProps {
  className?: string;
}

export function DialogOverlay({ className }: DialogOverlayProps) {
  const { onOpenChange } = useDialogContext();

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
        'animate-in fade-in-0 duration-200',
        className
      )}
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
    />
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function DialogContent({
  children,
  className,
  showCloseButton = true,
}: DialogContentProps) {
  const { onOpenChange } = useDialogContext();

  return (
    <>
      <DialogOverlay />
      <div
        className={cn(
          'fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[calc(100dvh-2rem)]',
          'translate-x-[-50%] translate-y-[-50%]',
          'bg-white rounded-xl shadow-xl border border-gray-200',
          'dark:bg-gray-800 dark:border-gray-700',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'overflow-y-auto',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showCloseButton && (
          <button
            onClick={() => onOpenChange(false)}
            className={cn(
              'absolute right-4 top-4 p-1 rounded-md',
              'text-gray-400 hover:text-gray-600',
              'hover:bg-gray-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700',
              'dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800'
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </>
  );
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)}
      {...props}
    />
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <h2
      className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  );
}

interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps) {
  return <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} />;
}

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return <div className={cn('p-6', className)} {...props} />;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn('flex justify-end gap-3 p-6 pt-0', className)}
      {...props}
    />
  );
}
