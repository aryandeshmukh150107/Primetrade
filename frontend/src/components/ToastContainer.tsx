import { useEffect } from 'react';
import { Toast as ToastType } from '../types';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse justify-end gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-l-trade-buy',
          icon: (
            <svg className="w-5 h-5 text-trade-buy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      case 'error':
        return {
          border: 'border-l-trade-sell',
          icon: (
            <svg className="w-5 h-5 text-trade-sell" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        };
      default:
        return {
          border: 'border-l-trade-accent',
          icon: (
            <svg className="w-5 h-5 text-trade-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const { border, icon } = getConfig(toast.type);

  return (
    <div
      className={`pointer-events-auto animate-slide-down bg-trade-bg border border-trade-border ${border} border-l-[3px] rounded shadow-sm px-4 py-3 flex items-start gap-3`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-trade-text">{toast.title}</p>
        <p className="text-xs text-trade-text-secondary mt-0.5 line-clamp-2">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-trade-text-light hover:text-trade-text-secondary transition-colors text-sm"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}
