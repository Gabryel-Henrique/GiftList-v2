import { capitalize, parseISODate, toISODate } from '../../shared/lib/format';
import type { AgendaEntry, EntryStatus } from './types';

// Availability dots: you vs your partner.
export const ME_COLOR = 'var(--color-primary)';
export const PARTNER_COLOR = 'var(--color-accent)';

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// A fixed 6-week grid (42 days) starting on the Sunday on or before the 1st,
// so the calendar never changes height from month to month.
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) =>
    toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  );
}

// "Novembro de 2026"
export function monthTitle(year: number, month: number): string {
  return capitalize(new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
}

// "Quarta-feira, 05 de novembro"
export function dayTitle(isoDate: string): string {
  return capitalize(
    parseISODate(isoDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  );
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  Proposed: 'Proposto',
  Confirmed: 'Confirmado',
  Declined: 'Recusado',
  Cancelled: 'Cancelado',
};

export const STATUS_COLOR: Record<EntryStatus, string> = {
  Proposed: 'var(--color-amber)',
  Confirmed: 'var(--color-teal)',
  Declined: 'var(--color-muted)',
  Cancelled: 'var(--color-muted)',
};

// The day badge: green if any plan is confirmed, yellow if any is still
// proposed, gray otherwise (only declined/cancelled ones).
export function dayBadgeColor(entries: AgendaEntry[]): string {
  if (entries.some((e) => e.status === 'Confirmed')) return 'var(--color-teal)';
  if (entries.some((e) => e.status === 'Proposed')) return 'var(--color-amber)';
  return 'var(--color-muted)';
}
