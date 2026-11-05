import { useEffect, useState } from 'react';
import { settleConfirm, subscribeConfirm, type PendingConfirm } from '../lib/confirm';
import { Button } from './ui';
import { Sheet } from './Sheet';

// When there's a warning, the delete button stays locked for a few seconds
// so the user actually reads it.
const WARNING_LOCK_SECONDS = 3;

export default function ConfirmHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Used as key so the countdown restarts on each new question.
  const [version, setVersion] = useState(0);

  useEffect(
    () =>
      subscribeConfirm((next) => {
        setPending(next);
        setVersion((v) => v + 1);
      }),
    []
  );

  if (!pending) return null;
  return <ConfirmDialog key={version} pending={pending} />;
}

function ConfirmDialog({ pending }: { pending: PendingConfirm }) {
  const { title, message, warning, actions, cancelLabel = 'Cancelar' } = pending.options;
  const [lockLeft, setLockLeft] = useState(warning ? WARNING_LOCK_SECONDS : 0);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const timer = setTimeout(() => setLockLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockLeft]);

  return (
    <Sheet
      onClose={closeConfirm}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="sm:max-w-md px-5 pt-3 sm:p-6"
    >
        <h2
          id="confirm-title"
          className="font-display text-base font-semibold text-[var(--color-ink)] mb-2"
        >
          {title}
        </h2>
        <div className="text-sm text-[var(--color-muted)] leading-relaxed">{message}</div>

        {warning && (
          <div className="mt-4 rounded-xl border-2 border-[var(--color-rose)] bg-[var(--color-rose)]/10 px-4 py-3">
            <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-[var(--color-rose)]">
              <WarningIcon />
              Atenção
            </p>
            <div className="mt-1.5 text-sm text-[var(--color-ink)] leading-relaxed">{warning}</div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 mt-6">
          <Button
            autoFocus
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => settleConfirm(null)}
          >
            {cancelLabel}
          </Button>
          {actions.map((action) => {
            const destructive = action.variant === 'destructive';
            const locked = destructive && lockLeft > 0;
            return (
              <Button
                key={action.label}
                type="button"
                variant={action.variant === 'ghost' ? 'ghost' : 'primary'}
                disabled={locked}
                className={`w-full sm:w-auto ${
                  destructive
                    ? '!bg-none !bg-[var(--color-rose)] !text-white hover:!opacity-90'
                    : ''
                }`}
                onClick={() => settleConfirm(action.value)}
              >
                {locked ? `${action.label} (${lockLeft})` : action.label}
              </Button>
            );
          })}
        </div>
    </Sheet>
  );
}

function closeConfirm() {
  settleConfirm(null);
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
