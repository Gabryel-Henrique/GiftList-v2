// The movies' 1–5 scale, in half-star steps.
export const MIN_STARS = 1;
export const MAX_STARS = 5;
export const DEFAULT_STARS = 3;

// "4" for whole numbers, "3,5" for halves.
export function formatStars(rating: number): string {
  return Number.isInteger(rating) ? String(rating) : rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 });
}
