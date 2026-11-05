import { Card } from '../../shared/components/ui';
import { dayBadgeColor, ME_COLOR, monthGrid, monthTitle, PARTNER_COLOR, WEEKDAYS } from './calendar';
import type { AgendaEntry } from './types';

export function MonthCalendar({
  year,
  month,
  today,
  selected,
  onSelect,
  onMonthChange,
  isOpen,
  entriesOn,
  entryLabel,
  partnerName,
}: {
  year: number;
  month: number; // 0–11
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  isOpen: (who: 'me' | 'partner', date: string) => boolean;
  entriesOn: (date: string) => AgendaEntry[];
  entryLabel: (entry: AgendaEntry) => string;
  partnerName: string;
}) {
  const days = monthGrid(year, month);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Mês anterior"
          className="w-9 h-9 rounded-xl text-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-[var(--color-ink)]">{monthTitle(year, month)}</h2>
          <button
            type="button"
            onClick={() => {
              const [y, m] = today.split('-').map(Number);
              onMonthChange(y, m - 1);
              onSelect(today);
            }}
            className="text-xs font-medium px-2 py-1 rounded-lg bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
          >
            Hoje
          </button>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Próximo mês"
          className="w-9 h-9 rounded-xl text-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-[11px] font-medium pb-1 ${i === 0 || i === 6 ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
          >
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          const weekend = index % 7 === 0 || index % 7 === 6;
          const inMonth = date.startsWith(monthPrefix);
          const isToday = date === today;
          const isSelected = date === selected;
          const entries = entriesOn(date);
          const meOpen = isOpen('me', date);
          const partnerOpen = isOpen('partner', date);
          // Named inside the cell on wide screens: only plans still on.
          const openEntries = entries.filter((e) => e.status === 'Confirmed' || e.status === 'Proposed');
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${Number(date.slice(8))}${entries.length ? `, ${entries.length} plano(s)` : ''}`}
              className={`relative aspect-square sm:aspect-auto sm:h-20 rounded-xl flex flex-col items-center justify-start pt-1.5 transition-colors ${
                isSelected
                  ? 'bg-brand text-white'
                  : isToday
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-ink)] ring-1 ring-[var(--color-primary)]/50'
                    : `hover:bg-[var(--color-surface-alt)] text-[var(--color-ink)] ${weekend ? 'bg-[var(--color-accent)]/[0.03]' : ''}`
              } ${inMonth ? '' : 'opacity-35'}`}
            >
              <span className={`text-sm leading-none ${isToday ? 'font-bold' : 'font-medium'}`}>
                {Number(date.slice(8))}
              </span>
              <span className="flex gap-1 mt-1.5 h-1.5">
                {meOpen && <Dot color={ME_COLOR} ring={isSelected} />}
                {partnerOpen && <Dot color={PARTNER_COLOR} ring={isSelected} />}
              </span>
              <span className="hidden sm:flex flex-col gap-0.5 w-full px-1 mt-1">
                {openEntries.slice(0, 2).map((entry) => (
                  <span
                    key={entry.id}
                    className={`truncate text-[10px] leading-tight rounded px-1 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-ink)]'
                    }`}
                  >
                    {entryLabel(entry)}
                  </span>
                ))}
              </span>
              {entries.length > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-white"
                  style={{ backgroundColor: dayBadgeColor(entries) }}
                >
                  {entries.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <Dot color={ME_COLOR} /> Você disponível
        </span>
        <span className="flex items-center gap-1.5">
          <Dot color={PARTNER_COLOR} /> {partnerName} disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--color-teal)]" /> Confirmado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--color-amber)]" /> Proposto
        </span>
      </div>
    </Card>
  );
}

function Dot({ color, ring = false }: { color: string; ring?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full ${ring ? 'w-2 h-2 ring-2 ring-white' : 'w-1.5 h-1.5'}`}
      style={{ backgroundColor: color }}
    />
  );
}
