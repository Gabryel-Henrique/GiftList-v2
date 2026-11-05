import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Scrolls to the screen's form and focuses its first field. Used by the
// "add" buttons on empty states, since the forms sit at the top of each page.
export function focusFirstField(): boolean {
  const field = document.querySelector<HTMLElement>(
    'main form input:not([type="hidden"]), main form select, main form textarea'
  );
  if (!field) return false;
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  field.focus({ preventScroll: true });
  return true;
}

// Pages opened from the phone's "+" button come with ?novo=1: once the form
// is on screen (data may still be loading), jump to it, then drop the flag
// so going back/forward doesn't refocus it.
export function useFocusFormFromQuery() {
  const [params, setParams] = useSearchParams();
  const requested = params.has('novo');

  useEffect(() => {
    if (!requested) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (focusFirstField() || tries > 40) {
        clearInterval(timer);
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('novo');
            return next;
          },
          { replace: true }
        );
      }
    }, 100);
    return () => clearInterval(timer);
  }, [requested, setParams]);
}
