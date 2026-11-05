export interface MemoryPhoto {
  id: string;
  agendaEntryId: string;
  path: string; // in the item-images bucket: <couple_id>/memories/<entry_id>/<uuid>.jpg
  createdByUserId?: string;
  createdAt?: string;
}

export type MomentKind = 'linked' | 'date' | 'restaurant' | 'idea' | 'movie';

// One person's take on a moment: 0–10 for places/dates, 1–5 stars for movies.
export interface MomentReview {
  userId?: string;
  rating: number;
  scale: 10 | 5;
  comment?: string;
}

export interface Moment {
  key: string;
  kind: MomentKind;
  date: string; // yyyy-mm-dd (local)
  title: string;
  linkedTo?: 'restaurant' | 'idea'; // for dates: what the plan was
  reviews: MomentReview[];
  entryId?: string; // dates only: where photos attach
}
