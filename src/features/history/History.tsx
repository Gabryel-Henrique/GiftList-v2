import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Card, EmptyState, LinkButton, PageHeader, Spinner } from '../../shared/components/ui';
import { Skeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { Sheet } from '../../shared/components/Sheet';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { capitalize, monthName, parseISODate, todayISO } from '../../shared/lib/format';
import { useSignedImageUrls } from '../../shared/lib/itemImages';
import { resizeImage } from '../../shared/lib/imageResize';
import { askConfirm } from '../../shared/lib/confirm';
import { pushToast } from '../../shared/lib/toast';
import { agendaEntryRepo } from '../agenda/repository';
import { dateIdeaRepo, dateIdeaReviewRepo } from '../dateIdeas/repository';
import { movieRepo, movieReviewRepo } from '../movies/repository';
import { restaurantRepo, restaurantReviewRepo } from '../restaurants/repository';
import { RatingBadge } from '../reviews/ItemReviews';
import { HalfStars } from '../movies/HalfStarRating';
import { formatStars } from '../movies/stars';
import { addMemoryPhoto, memoryPhotoRepo, removeMemoryPhoto } from './repository';
import { buildTimeline } from './timeline';
import type { MemoryPhoto, Moment } from './types';

const MAX_PHOTOS = 6;

const KIND_STYLE: Record<Moment['kind'], { emoji: string; label: string; color: string }> = {
  linked: { emoji: '💑', label: 'Dia 1', color: 'var(--color-accent)' },
  date: { emoji: '💘', label: 'Date', color: 'var(--color-primary)' },
  restaurant: { emoji: '🍽️', label: 'Restaurante', color: 'var(--color-amber)' },
  idea: { emoji: '💡', label: 'Programa', color: 'var(--color-teal)' },
  movie: { emoji: '🎬', label: 'Filme ou série', color: 'var(--color-sky)' },
};

export default function History() {
  return (
    <NeedsCouple title="Nossa história 📖">
      <Timeline />
    </NeedsCouple>
  );
}

function Timeline() {
  const { couple, partner, me } = useCouple();
  const entries = useRepository(agendaEntryRepo);
  const restaurants = useRepository(restaurantRepo);
  const restaurantReviews = useRepository(restaurantReviewRepo);
  const ideas = useRepository(dateIdeaRepo);
  const ideaReviews = useRepository(dateIdeaReviewRepo);
  const movies = useRepository(movieRepo);
  const movieReviews = useRepository(movieReviewRepo);
  const photos = useRepository(memoryPhotoRepo);
  const hooks = [entries, restaurants, restaurantReviews, ideas, ideaReviews, movies, movieReviews, photos];
  const loading = hooks.some((h) => h.loading);
  const photoUrls = useSignedImageUrls(photos.items.map((p) => p.path));
  const [viewing, setViewing] = useState<string | null>(null);

  const moments = useMemo(
    () =>
      buildTimeline({
        coupleCreatedAt: couple!.createdAt,
        entries: entries.items,
        restaurants: restaurants.items,
        restaurantReviews: restaurantReviews.items,
        ideas: ideas.items,
        ideaReviews: ideaReviews.items,
        movies: movies.items,
        movieReviews: movieReviews.items,
      }),
    [couple, entries.items, restaurants.items, restaurantReviews.items, ideas.items, ideaReviews.items, movies.items, movieReviews.items]
  );

  // Grouped by month, newest first.
  const months = useMemo(() => {
    const groups: { ref: string; moments: Moment[] }[] = [];
    for (const moment of moments) {
      const ref = moment.date.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last?.ref === ref) last.moments.push(moment);
      else groups.push({ ref, moments: [moment] });
    }
    return groups;
  }, [moments]);

  const count = (kind: Moment['kind']) => moments.filter((m) => m.kind === kind).length;
  // From the day the accounts were linked, not the oldest moment: a movie
  // watched before that can be older than "dia 1".
  const dayOne = moments.find((m) => m.kind === 'linked')?.date ?? todayISO();
  const daysTogether = Math.max(
    0,
    Math.round((parseISODate(todayISO()).getTime() - parseISODate(dayOne).getTime()) / 86_400_000)
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Nossa história 📖" />
        <Skeleton className="h-24 mb-6 !rounded-2xl" />
        <Skeleton className="h-40 mb-3 !rounded-2xl" />
        <Skeleton className="h-40 !rounded-2xl" />
      </>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nossa história 📖"
        subtitle={partner ? `Tudo o que você e ${partner.name} já viveram por aqui.` : undefined}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat value={daysTogether} label={daysTogether === 1 ? 'dia desde o dia 1' : 'dias desde o dia 1'} delay={0} />
        <Stat value={count('date') + count('idea')} label="dates" delay={40} />
        <Stat value={count('restaurant') + moments.filter((m) => m.kind === 'date' && m.linkedTo === 'restaurant').length} label="restaurantes" delay={80} />
        <Stat value={count('movie')} label="filmes e séries" delay={120} />
      </div>

      {moments.length <= 1 && (
        <EmptyState
          icon="📖"
          title="A história de vocês começa agora"
          description="Cada encontro feito na agenda, restaurante avaliado e filme assistido vira um capítulo aqui."
          action={<LinkButton to="/agenda">Combinar um date</LinkButton>}
        />
      )}

      <div className="space-y-8 mt-2">
        {months.map((month) => (
          <section key={month.ref}>
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-3">{monthName(month.ref)}</h2>
            <ol className="relative border-l-2 border-[var(--color-border)] ml-3 space-y-4">
              {month.moments.map((moment, index) => (
                <MomentItem
                  key={moment.key}
                  moment={moment}
                  index={index}
                  photos={moment.entryId ? photos.items.filter((p) => p.agendaEntryId === moment.entryId) : []}
                  photoUrl={(path) => photoUrls.get(path)}
                  onView={setViewing}
                  onPhotosChanged={photos.reload}
                  coupleId={couple!.id}
                  meId={me.id}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      {viewing && (
        <Sheet onClose={() => setViewing(null)} className="sm:max-w-2xl p-2 sm:p-3" aria-label="Foto">
          <img src={viewing} alt="" className="w-full max-h-[78vh] object-contain rounded-xl" />
        </Sheet>
      )}
    </div>
  );
}

function Stat({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <Card className="anim-fade-up p-4 text-center" style={{ animationDelay: `${delay}ms` }}>
      <p className="font-display text-2xl sm:text-3xl font-bold text-brand inline-block tabular-nums">{value}</p>
      <p className="text-xs text-[var(--color-muted)] mt-0.5">{label}</p>
    </Card>
  );
}

function MomentItem({
  moment,
  index,
  photos,
  photoUrl,
  onView,
  onPhotosChanged,
  coupleId,
  meId,
}: {
  moment: Moment;
  index: number;
  photos: MemoryPhoto[];
  photoUrl: (path: string) => string | undefined;
  onView: (url: string) => void;
  onPhotosChanged: () => Promise<void>;
  coupleId: string;
  meId: string;
}) {
  const { nameOf } = useCouple();
  const style = KIND_STYLE[moment.kind];
  const day = capitalize(parseISODate(moment.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }));
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const slots = MAX_PHOTOS - photos.length;

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(slots, 0));
    e.target.value = '';
    if (!files.length || !moment.entryId) return;
    setUploading(true);
    try {
      for (const file of files) {
        let blob: Blob;
        try {
          blob = await resizeImage(file);
        } catch {
          pushToast('Não foi possível processar uma das fotos selecionadas. Tente outro arquivo.');
          continue;
        }
        await addMemoryPhoto(blob, coupleId, moment.entryId);
      }
    } catch {
      // the repository already showed why
    } finally {
      await onPhotosChanged();
      setUploading(false);
    }
  }

  async function remove(photo: MemoryPhoto) {
    const ok = await askConfirm({
      title: 'Remover foto',
      message: 'Remover essa foto da história de vocês?',
      actions: [{ label: 'Remover', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    try {
      await removeMemoryPhoto(photo);
    } catch {
      // the repository already showed why
    }
    await onPhotosChanged();
  }

  return (
    <li className="anim-fade-up relative pl-6" style={{ animationDelay: `${index * 40}ms` }}>
      <span
        aria-hidden="true"
        className="absolute -left-[17px] top-3 w-8 h-8 rounded-full flex items-center justify-center text-base ring-4 ring-[var(--color-bg)]"
        style={{ backgroundColor: `color-mix(in srgb, ${style.color} 22%, var(--color-surface))` }}
      >
        {style.emoji}
      </span>

      <Card className={`p-4 ${moment.kind === 'linked' ? 'border-[var(--color-accent)]/40' : ''}`}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: style.color }}>
          {style.label}
          {moment.kind === 'date' && (moment.linkedTo === 'restaurant' ? ' · restaurante' : ' · programa')}
        </p>
        <h3 className="font-display font-semibold text-[var(--color-ink)] mt-0.5 break-words">{moment.title}</h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">{day}</p>

        {moment.reviews.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {moment.reviews.map((review) => (
              <li key={review.userId ?? 'x'} className="text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--color-ink)]">{review.userId === meId ? 'Você' : nameOf(review.userId)}</span>
                  {review.scale === 10 ? (
                    <RatingBadge rating={review.rating} />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <HalfStars rating={review.rating} size={13} />
                      <span className="text-xs text-[var(--color-muted)] tabular-nums">{formatStars(review.rating)}</span>
                    </span>
                  )}
                </span>
                {review.comment && (
                  <span className="block text-[var(--color-muted)] italic mt-0.5 break-words">“{review.comment}”</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {moment.entryId && (
          <div className="mt-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {photos.map((photo) => {
                  const url = photoUrl(photo.path);
                  return (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--color-surface-alt)]">
                      {url && (
                        <button type="button" onClick={() => onView(url)} className="block w-full h-full" aria-label="Ver foto">
                          <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(photo)}
                        aria-label="Remover foto"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-sm leading-none flex items-center justify-center hover:bg-black/80"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {uploading ? (
              <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <Spinner /> Enviando fotos...
              </p>
            ) : (
              slots > 0 && (
                <>
                  <input ref={fileInput} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)]"
                  >
                    📷 {photos.length ? 'Adicionar mais fotos' : 'Adicionar fotos do encontro'}
                  </button>
                </>
              )
            )}
          </div>
        )}
      </Card>
    </li>
  );
}
