// The 0–10 scale shared by restaurants, date ideas and the agenda.
export const MAX_RATING = 10;
export const DEFAULT_RATING = 5;

export function ratingLabel(rating: number): string {
  if (rating <= 0) return 'Péssimo';
  if (rating <= 4) return 'Ruim';
  if (rating === 5) return 'Mais ou menos';
  if (rating <= 9) return 'Bom';
  return 'Maravilhoso';
}

export function ratingColor(rating: number): string {
  if (rating <= 4) return 'var(--color-rose)';
  if (rating === 5) return 'var(--color-amber)';
  if (rating <= 9) return 'var(--color-sky)';
  return 'var(--color-teal)';
}
