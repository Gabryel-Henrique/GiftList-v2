import { useState } from 'react';
import { formatStars, MAX_STARS, MIN_STARS } from './stars';

const STAR_PATH = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z';

// One star filled `fill` (0–1) from the left: an outline underneath and the
// gold star clipped to that width on top.
function PartialStar({ fill, size }: { fill: number; size: number }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" className="absolute inset-0" aria-hidden="true">
        <path d={STAR_PATH} fill="transparent" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR_PATH} fill="var(--color-amber)" stroke="var(--color-amber)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

function fillFor(star: number, rating: number): number {
  return Math.max(0, Math.min(1, rating - (star - 1)));
}

export function HalfStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${formatStars(rating)} de 5 estrelas`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <PartialStar key={i} fill={fillFor(i + 1, rating)} size={size} />
      ))}
    </span>
  );
}

// Each star has two hit areas: the left half picks x − 0,5 and the right
// half picks x. Hovering previews the value.
export function HalfStarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  // Bumped on each pick, so the picked star replays its "pop".
  const [pops, setPops] = useState(0);
  const shown = hover ?? value;
  const size = 34;

  return (
    <div className="flex items-center gap-3" onMouseLeave={() => setHover(null)}>
      <div className="flex gap-1" role="radiogroup" aria-label="Nota">
        {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((star) => (
          <span key={star} className="relative">
            <span key={Math.ceil(value) === star ? `pop-${pops}` : star} className={`inline-block ${Math.ceil(value) === star && pops ? 'anim-star-pop' : ''}`}>
              <PartialStar fill={fillFor(star, shown)} size={size} />
            </span>
            {/* The first star's left half would be 0,5 — below the minimum, so it picks 1. */}
            {[Math.max(MIN_STARS, star - 0.5), star].map((option, half) => (
              <button
                key={half}
                type="button"
                role="radio"
                aria-checked={value === option && (half === 1 || option !== star)}
                aria-label={`${formatStars(option)} estrela${option > 1 ? 's' : ''}`}
                onClick={() => {
                  onChange(option);
                  setPops((p) => p + 1);
                }}
                onMouseEnter={() => setHover(option)}
                className={`absolute inset-y-0 w-1/2 ${half === 0 ? 'left-0' : 'right-0'}`}
              />
            ))}
          </span>
        ))}
      </div>
      <span className="tabular-nums text-sm font-semibold text-[var(--color-ink)]">{formatStars(shown)} / 5</span>
    </div>
  );
}
