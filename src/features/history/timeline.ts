import { toISODate } from '../../shared/lib/format';
import type { AgendaEntry } from '../agenda/types';
import type { DateIdea, DateIdeaReview } from '../dateIdeas/types';
import type { Movie, MovieReview } from '../movies/types';
import type { Restaurant, RestaurantReview } from '../restaurants/types';
import type { Moment, MomentReview } from './types';

// Builds "Nossa história" from what the couple already records — nothing
// here is typed in twice:
//   * the day the accounts were linked ("dia 1");
//   * every plan that was confirmed and happened (with both reviews);
//   * restaurants / date ideas reviewed without going through the agenda
//     (dated by the first review, so they aren't counted twice);
//   * movies, dated by "Quando viu" (or the first review).
// Gifts stay out on purpose: they'd spoil surprises.

interface Sources {
  coupleCreatedAt: string;
  entries: AgendaEntry[];
  restaurants: Restaurant[];
  restaurantReviews: RestaurantReview[];
  ideas: DateIdea[];
  ideaReviews: DateIdeaReview[];
  movies: Movie[];
  movieReviews: MovieReview[];
}

const localDay = (timestamp?: string) => (timestamp ? toISODate(new Date(timestamp)) : '');

function earliest(dates: string[]): string {
  return dates.filter(Boolean).sort()[0] ?? '';
}

export function buildTimeline(s: Sources): Moment[] {
  const moments: Moment[] = [{ key: 'linked', kind: 'linked', date: localDay(s.coupleCreatedAt), title: 'Vocês vincularam as contas', reviews: [] }];

  const restaurantReviews = (id: string): MomentReview[] =>
    s.restaurantReviews.filter((r) => r.restaurantId === id).map((r) => ({ userId: r.userId, rating: r.rating, scale: 10, comment: r.comment }));
  const ideaReviews = (id: string): MomentReview[] =>
    s.ideaReviews.filter((r) => r.dateIdeaId === id).map((r) => ({ userId: r.userId, rating: r.rating, scale: 10, comment: r.comment }));

  const done = s.entries.filter((e) => e.status === 'Confirmed' && e.wasDone);
  const viaAgenda = new Set(done.map((e) => e.restaurantId ?? e.dateIdeaId));

  for (const entry of done) {
    const restaurant = entry.restaurantId ? s.restaurants.find((r) => r.id === entry.restaurantId) : undefined;
    const idea = entry.dateIdeaId ? s.ideas.find((i) => i.id === entry.dateIdeaId) : undefined;
    moments.push({
      key: `date-${entry.id}`,
      kind: 'date',
      date: entry.date,
      title: restaurant?.name ?? idea?.name ?? '?',
      linkedTo: restaurant ? 'restaurant' : 'idea',
      reviews: restaurant ? restaurantReviews(restaurant.id) : idea ? ideaReviews(idea.id) : [],
      entryId: entry.id,
    });
  }

  for (const restaurant of s.restaurants) {
    const reviews = s.restaurantReviews.filter((r) => r.restaurantId === restaurant.id);
    if (reviews.length === 0 || viaAgenda.has(restaurant.id)) continue;
    moments.push({
      key: `restaurant-${restaurant.id}`,
      kind: 'restaurant',
      date: earliest(reviews.map((r) => localDay(r.createdAt))),
      title: restaurant.name,
      reviews: restaurantReviews(restaurant.id),
    });
  }

  for (const idea of s.ideas) {
    const reviews = s.ideaReviews.filter((r) => r.dateIdeaId === idea.id);
    if (reviews.length === 0 || viaAgenda.has(idea.id)) continue;
    moments.push({
      key: `idea-${idea.id}`,
      kind: 'idea',
      date: earliest(reviews.map((r) => localDay(r.createdAt))),
      title: idea.name,
      reviews: ideaReviews(idea.id),
    });
  }

  for (const movie of s.movies) {
    const reviews = s.movieReviews.filter((r) => r.movieId === movie.id);
    if (reviews.length === 0) continue;
    moments.push({
      key: `movie-${movie.id}`,
      kind: 'movie',
      date: earliest(reviews.map((r) => r.watchedDate ?? localDay(r.createdAt))),
      title: movie.name,
      reviews: reviews.map((r) => ({ userId: r.userId, rating: r.rating, scale: 5, comment: r.review })),
    });
  }

  // Newest first; the "dia 1" always closes the list on its day.
  return moments
    .filter((m) => m.date)
    .sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'linked' ? 1 : b.kind === 'linked' ? -1 : 0));
}
