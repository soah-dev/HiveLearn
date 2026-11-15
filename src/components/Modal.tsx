'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Accessible dialog: closes on Escape and backdrop click, locks page scroll,
 * moves focus into the dialog on open and returns it on close. On phones it
 * rises from the bottom edge as a sheet.
 */
export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Callers usually pass an inline arrow; read it through a ref so the
  // open/close effect doesn't re-run (and re-focus) on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first form control, falling back to the panel itself
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-modal-close])'
    );
    (focusable || panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'max-h-[92vh] w-full animate-sheet-up overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-pop outline-none sm:animate-enter sm:rounded-2xl sm:p-6',
          size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md'
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 id={titleId} className="font-display text-xl font-bold text-ink">{title}</h3>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-muted hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
