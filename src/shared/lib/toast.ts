// Minimal toast store — plain module-level pub/sub, no Provider needed, so
// it can be triggered from anywhere (hooks, plain repository code) and not
// just from inside a component tree wrapped in a specific context.
export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success';
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function pushToast(message: string, type: Toast['type'] = 'error') {
  const toast: Toast = { id: crypto.randomUUID(), message, type };
  toasts = [...toasts, toast];
  emit();
  setTimeout(() => dismissToast(toast.id), 5000);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
