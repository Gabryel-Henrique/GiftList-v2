import { createRepository } from '../../shared/lib/storage';
import type { Restaurant, RestaurantReview } from './types';

// Deleting a restaurant cascades to its reviews and to agenda plans that
// point at it (FKs in supabase/migration.sql).
export const restaurantRepo = createRepository<Restaurant>('restaurants');
export const restaurantReviewRepo = createRepository<RestaurantReview>('restaurant_reviews');
