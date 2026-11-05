import { useEffect, useState } from 'react';
import { dismissToast, subscribeToasts, type Toast } from '../lib/toast';

// Mounted once in Layout, so any failed save/load anywhere in the app
// surfaces here instead of failing silently in the console.
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 sm:max-w-sm left-4 sm:left-auto"
      style={{ bottom: 'calc(1rem + var(--safe-bottom) + var(--bottom-nav))', right: 'calc(1rem + var(--safe-right))' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`anim-fade-up flex items-start gap-2 bg-[var(--color-surface)] border rounded-xl px-4 py-3 shadow-[var(--shadow-md)] ${
            toast.type === 'success'
              ? 'border-[var(--color-teal)]/50'
              : 'border-[var(--color-rose)]/40'
          }`}
        >
          {toast.type === 'success' && (
            <span className="anim-pop text-[var(--color-teal)] shrink-0 mt-0.5">
              <SuccessIcon />
            </span>
          )}
          <p className="text-sm text-[var(--color-ink)] flex-1">{toast.message}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors shrink-0"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
