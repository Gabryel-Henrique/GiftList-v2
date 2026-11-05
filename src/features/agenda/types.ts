export type EntryStatus = 'Proposed' | 'Confirmed' | 'Declined' | 'Cancelled';

// One person's availability on a day. Never deleted: withdrawing flips isOpen.
export interface Availability {
  id: string;
  userId: string;
  date: string; // yyyy-mm-dd
  isOpen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// A plan proposed for a day, linked to a date idea or a restaurant (one of).
export interface AgendaEntry {
  id: string;
  date: string; // yyyy-mm-dd
  proposedByUserId: string;
  dateIdeaId?: string;
  restaurantId?: string;
  note?: string;
  status: EntryStatus;
  statusNote?: string;
  wasDone: boolean;
  createdAt?: string;
  respondedAt?: string;
}
