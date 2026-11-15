'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

// One quiet surface for every toast; the icon carries the type
const icons = { success: CircleCheck, error: TriangleAlert, info: Info };
const iconColors: Record<ToastType, string> = {
  success: 'text-good-text',
  error: 'text-bad-text',
  info: 'text-honey-text',
};

/**
 * Lightweight transient notifications for actions whose result isn't
 * otherwise visible on screen (e.g. resending an invite).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Sits above the mobile tab bar */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-24 left-4 right-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 lg:bottom-6"
      >
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full animate-enter items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-ink shadow-pop sm:w-auto sm:max-w-sm"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColors[t.type]}`} aria-hidden="true" />
              <span className="flex-1 text-sm font-medium">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-m-1 rounded-md p-1 text-ink-subtle hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
