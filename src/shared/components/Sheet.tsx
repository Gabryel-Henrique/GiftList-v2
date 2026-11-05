import { useEffect, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// A dialog that slides up from the bottom on phones (within thumb reach)
// and shows as a centered card from the `sm` breakpoint up. Closes on the
// backdrop or Esc, unless `onClose` is omitted (e.g. while saving).
export function Sheet({
  onClose,
  children,
  className = '',
  ...props
}: {
  onClose?: () => void;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Portaled to <body> so it's never clipped/offset by a transformed
  // ancestor (a row being swiped); touch events are stopped so a gesture
  // inside the sheet doesn't also swipe the row it was opened from.
  const stop = (e: React.TouchEvent) => e.stopPropagation();
  return createPortal(
    <div
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      className="anim-page fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={onClose}
    >
      <div
        {...props}
        className={`anim-sheet relative w-full max-h-[88vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-2xl sm:rounded-2xl shadow-[var(--shadow-md)] pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="sm:hidden mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        {children}
      </div>
    </div>,
    document.body
  );
}
