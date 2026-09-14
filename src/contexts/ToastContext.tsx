'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

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

const styles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-900 dark:bg-gray-700 text-white',
};

const icons: Record<ToastType, string> = { success: '✓', error: '!', info: 'i' };

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
      <div
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up ${styles[t.type]}`}
          >
            <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-white/20 text-xs font-bold" aria-hidden="true">
              {icons[t.type]}
            </span>
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-white/70 hover:text-white text-lg leading-none -mt-0.5"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
