export function formatCurrency(value: number): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "yyyy-mm-dd" (a `date` column) → "dd/mm/yyyy". Parsed by hand: going
// through new Date() would shift it a day back in UTC-3.
export function formatShortDate(isoDate: string | undefined): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

// A timestamptz (created_at, purchased_at) → local "dd/mm/yyyy".
export function formatTimestampDate(timestamp: string | undefined): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Local date, not UTC: toISOString() would already be "tomorrow" from 21h on
// in Brasília (UTC-3).
export function toISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

// "yyyy-mm-dd" → a local Date at midnight (no UTC shift).
export function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// yyyy-mm of a date or timestamp, in local time — used to group by month.
export function monthRef(dateOrTimestamp: string): string {
  return dateOrTimestamp.length <= 10
    ? dateOrTimestamp.slice(0, 7)
    : toISODate(new Date(dateOrTimestamp)).slice(0, 7);
}

export function monthName(ref: string, style: 'long' | 'short' = 'long'): string {
  const [year, month] = ref.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const name =
    style === 'long'
      ? date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return capitalize(name);
}

// Optional text fields: trimmed, and empty becomes undefined (→ null in the
// DB), the same normalization the old domain applied everywhere.
export function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// Money typed in a text field: "1.234,56", "12,5" or "12.50"; empty →
// undefined, garbage → NaN (so the form can flag it).
export function parseMoney(value: string): number | undefined {
  let text = value.trim().replace(/^R\$\s*/, '');
  if (!text) return undefined;
  // With a comma, it's the decimal separator and dots are thousands.
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

// Shows a stored amount back in the text field ("12,5").
export function moneyInput(value: number | undefined): string {
  return value == null ? '' : String(value).replace('.', ',');
}
