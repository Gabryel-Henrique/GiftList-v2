// Shared by gifts and date ideas. Stored as text in the DB, so sorting by
// priority must use this rank — ORDER BY on the text would be alphabetical.
export type Priority = 'Low' | 'Medium' | 'High';

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  High: 'Alta',
  Medium: 'Média',
  Low: 'Baixa',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  High: 'var(--color-rose)',
  Medium: 'var(--color-amber)',
  Low: 'var(--color-muted)',
};

const RANK: Record<Priority, number> = { Low: 0, Medium: 1, High: 2 };

// Priority desc, then newest first — the old lists' order.
export function byPriorityThenNewest<T extends { priority: Priority; createdAt?: string }>(
  a: T,
  b: T
): number {
  return RANK[b.priority] - RANK[a.priority] || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
}

export function byNewest<T extends { createdAt?: string }>(a: T, b: T): number {
  return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
}
