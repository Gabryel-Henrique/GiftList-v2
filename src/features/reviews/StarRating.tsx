import { useState } from 'react';
import { MAX_RATING, ratingLabel } from './rating';

export function Star({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"
        fill={filled ? 'var(--color-amber)' : 'transparent'}
        stroke={filled ? 'var(--color-amber)' : 'var(--color-muted)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 10 clickable stars with a hover preview, plus a separate "zero" button
// (a star row can't express 0 on its own).
export function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  // Bumped on each pick, so the picked star replays its "pop".
  const [pops, setPops] = useState(0);
  const shown = hover ?? value;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-0.5" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Nota">
        {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${ratingLabel(n)}`}
            onClick={() => {
              onChange(n);
              setPops((p) => p + 1);
            }}
            onMouseEnter={() => setHover(n)}
            className="p-0.5 transition-transform active:scale-90"
          >
            <span key={n === value ? `pop-${pops}` : n} className={`inline-block ${n === value && pops ? 'anim-star-pop' : ''}`}>
              <Star filled={n <= shown} />
            </span>
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-[var(--color-ink)] tabular-nums">
          {shown} — {ratingLabel(shown)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onChange(0)}
        aria-pressed={value === 0}
        className={`mt-1.5 text-xs font-medium rounded-lg px-2 py-1 transition-colors ${
          value === 0
            ? 'bg-[var(--color-rose)]/15 text-[var(--color-rose)]'
            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
        }`}
      >
        Nenhuma estrela (0 – Péssimo)
      </button>
    </div>
  );
}
