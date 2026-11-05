import { createRepository } from '../../shared/lib/storage';
import type { Movie, MovieReview } from './types';

export const movieRepo = createRepository<Movie>('movies');
export const movieReviewRepo = createRepository<MovieReview>('movie_reviews');
