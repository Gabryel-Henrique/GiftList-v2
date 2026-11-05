import type { Priority } from '../../shared/lib/priority';

export interface DateIdea {
  id: string;
  name: string;
  description?: string;
  estimatedCost?: number;
  videoLink?: string;
  priority: Priority;
  createdByUserId?: string; // set by the DB (auth.uid()) on insert
  createdAt?: string;
}

export interface DateIdeaReview {
  id: string;
  dateIdeaId: string;
  userId?: string; // set by the DB (auth.uid()) on insert
  rating: number; // 0–10
  comment?: string;
  wouldRepeat: boolean;
  createdAt?: string;
  updatedAt?: string;
}
