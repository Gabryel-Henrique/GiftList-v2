import { createRepository } from '../../shared/lib/storage';
import type { DateIdea, DateIdeaReview } from './types';

// Deleting an idea cascades to its reviews and to agenda plans that point
// at it (FKs in supabase/migration.sql).
export const dateIdeaRepo = createRepository<DateIdea>('date_ideas');
export const dateIdeaReviewRepo = createRepository<DateIdeaReview>('date_idea_reviews');
