import type { ReactNode } from 'react';

// Replaces the browser's confirm(). Works like the toast store: call
// `await askConfirm(...)` from anywhere and ConfirmHost (in Layout) shows it.
export interface ConfirmAction<T> {
  label: string;
  value: T;
  variant?: 'primary' | 'ghost' | 'destructive';
}

export interface ConfirmOptions<T> {
  title: string;
  message: ReactNode;
  // Shown in a red "ATENÇÃO" box, for actions that erase history.
  warning?: ReactNode;
  actions: ConfirmAction<T>[];
  cancelLabel?: string;
}

export interface PendingConfirm {
  options: ConfirmOptions<unknown>;
  resolve: (value: unknown) => void;
}

type Listener = (pending: PendingConfirm | null) => void;

let pending: PendingConfirm | null = null;
let listeners: Listener[] = [];

function emit() {
  for (const listener of listeners) listener(pending);
}

// Resolves with the chosen action's value, or null if cancelled.
export function askConfirm<T>(options: ConfirmOptions<T>): Promise<T | null> {
  pending?.resolve(null);
  return new Promise<T | null>((resolve) => {
    pending = { options: options as ConfirmOptions<unknown>, resolve: resolve as (v: unknown) => void };
    emit();
  });
}

// Replaces alert(): just a message and an "Entendi" button.
export async function showNotice(title: string, message: ReactNode): Promise<void> {
  await askConfirm({ title, message, actions: [], cancelLabel: 'Entendi' });
}

// Shortcut for the common "Excluir X?" question.
export async function confirmDelete(title: string, message: ReactNode): Promise<boolean> {
  const ok = await askConfirm({
    title,
    message,
    actions: [{ label: 'Excluir', value: true, variant: 'destructive' }],
  });
  return ok === true;
}

export function settleConfirm(value: unknown) {
  if (!pending) return;
  const current = pending;
  pending = null;
  emit();
  current.resolve(value);
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.push(listener);
  listener(pending);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
