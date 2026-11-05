import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Spinner, Textarea } from '../../shared/components/ui';
import { CardGridSkeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { ExternalImage } from '../../shared/components/ExternalImage';
import { ImagePicker } from '../../shared/components/ImagePicker';
import { imageValueOf, removeStoredImage, saveWithImage, useSignedImageUrls, type ImageValue } from '../../shared/lib/itemImages';
import { EditIcon, TrashIcon } from '../../shared/components/icons';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { formatShortDate, optionalText, todayISO } from '../../shared/lib/format';
import { byNewest } from '../../shared/lib/priority';
import { askConfirm } from '../../shared/lib/confirm';
import { useFocusFormFromQuery } from '../../shared/lib/focus';
import { movieRepo, movieReviewRepo } from './repository';
import { HalfStarInput, HalfStars } from './HalfStarRating';
import { DEFAULT_STARS, formatStars } from './stars';
import type { Movie, MovieReview } from './types';

type ReviewFields = Pick<MovieReview, 'rating' | 'review' | 'watchedDate' | 'isFirstWatch'>;

export default function Movies() {
  return (
    <NeedsCouple title="Filmes e Séries 🎬">
      <Board />
    </NeedsCouple>
  );
}

function Board() {
  const movies = useRepository(movieRepo);
  const reviews = useRepository(movieReviewRepo);
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(() => params.has('novo'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const { couple } = useCouple();
  const imageUrls = useSignedImageUrls(movies.items.map((m) => m.imagePath));
  useFocusFormFromQuery();
  const imageSrc = (m: Movie) => (m.imagePath ? imageUrls.get(m.imagePath) : m.imageUrl);

  const list = [...movies.items].sort(byNewest);

  async function remove(movie: Movie) {
    const ok = await askConfirm({
      title: 'Excluir filme ou série',
      message: `Excluir "${movie.name}"? As avaliações de vocês dois também serão apagadas.`,
      actions: [{ label: 'Excluir', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    try {
      await movies.remove(movie.id);
      await removeStoredImage(movie.imagePath);
      await reviews.reload();
    } catch {
      // the repository already showed why
    }
  }

  async function saveReview(movieId: string, fields: ReviewFields, existing?: MovieReview) {
    if (existing) await reviews.update(existing.id, { ...existing, ...fields });
    else await reviews.create({ movieId, ...fields });
  }

  return (
    <>
      <PageHeader
        title="Filmes e Séries 🎬"
        action={!adding && <Button onClick={() => { setAdding(true); setEditingId(null); }}>+ Adicionar</Button>}
      />

      {adding && (
        <div className="mb-6 max-w-2xl">
          <MovieForm
            title="Novo filme ou série"
            onCancel={() => setAdding(false)}
            onSave={async ({ image, ...fields }) => {
              await saveWithImage(image, undefined, couple!.id, 'movies', (columns) =>
                movies.create({ ...fields, ...columns })
              );
              setAdding(false);
            }}
          />
        </div>
      )}

      {movies.loading || reviews.loading ? (
        <CardGridSkeleton cards={3} />
      ) : list.length === 0 ? (
        !adding && (
          <EmptyState
            icon="🎬"
            title="Nenhum filme ou série ainda"
            description="Adicione o que vocês assistiram e cada um dá sua nota, de meia em meia estrela."
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {list.map((movie, index) =>
            editingId === movie.id ? (
              <div key={movie.id} className="md:col-span-2 lg:col-span-3 max-w-2xl w-full">
                <MovieForm
                  title="Editar filme ou série"
                  initial={movie}
                  initialImage={imageValueOf(movie, imageSrc(movie))}
                  onCancel={() => setEditingId(null)}
                  onSave={async ({ image, ...fields }) => {
                    await saveWithImage(image, movie.imagePath, couple!.id, 'movies', (columns) =>
                      movies.update(movie.id, { ...movie, ...fields, ...columns })
                    );
                    setEditingId(null);
                  }}
                />
              </div>
            ) : (
              <MovieCard
                key={movie.id}
                movie={movie}
                imageSrc={imageSrc(movie)}
                reviews={reviews.items.filter((r) => r.movieId === movie.id)}
                index={index}
                onEdit={() => { setEditingId(movie.id); setAdding(false); }}
                onDelete={() => remove(movie)}
                onSaveReview={(fields, existing) => saveReview(movie.id, fields, existing)}
                onDeleteReview={(review) => reviews.remove(review.id)}
              />
            )
          )}
        </div>
      )}
    </>
  );
}

function MovieCard({
  movie,
  imageSrc,
  reviews,
  index,
  onEdit,
  onDelete,
  onSaveReview,
  onDeleteReview,
}: {
  movie: Movie;
  imageSrc?: string;
  reviews: MovieReview[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onSaveReview: (fields: ReviewFields, existing?: MovieReview) => Promise<void>;
  onDeleteReview: (review: MovieReview) => Promise<void>;
}) {
  const { me, nameOf } = useCouple();
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = reviews.find((r) => r.userId === me.id);
  const sorted = [...reviews].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

  async function removeMine() {
    if (!mine) return;
    const ok = await askConfirm({
      title: 'Remover avaliação',
      message: 'Remover a sua avaliação?',
      actions: [{ label: 'Remover', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    setBusy(true);
    try {
      await onDeleteReview(mine);
    } catch {
      // the repository already showed why
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="anim-fade-up overflow-hidden" style={{ animationDelay: `${index * 40}ms` }}>
      <ExternalImage src={imageSrc} alt={movie.name} className="w-full h-[180px] object-cover" />
      <div className="p-4">
        <h3 className="font-display font-semibold text-[var(--color-ink)] leading-snug break-words">{movie.name}</h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">Adicionado por {nameOf(movie.createdByUserId)}</p>

        {sorted.length > 0 && (
          <ul className="space-y-2 mt-3">
            {sorted.map((review) => (
              <li key={review.id} className="rounded-xl bg-[var(--color-surface-alt)] px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-ink)]">{nameOf(review.userId)}</span>
                  <Badge color={review.isFirstWatch ? 'var(--color-accent)' : 'var(--color-sky)'}>
                    {review.isFirstWatch ? '🎬 Primeira vez' : '🔁 Já tinha visto'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <HalfStars rating={review.rating} />
                  <span className="tabular-nums text-xs text-[var(--color-muted)]">{formatStars(review.rating)} / 5</span>
                </div>
                {review.watchedDate && (
                  <p className="text-xs text-[var(--color-muted)] mt-1">Visto em {formatShortDate(review.watchedDate)}</p>
                )}
                {review.review && (
                  <p className="text-sm text-[var(--color-ink)]/90 mt-1.5 whitespace-pre-line break-words">{review.review}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          {reviewing ? (
            <MovieReviewForm
              initial={mine}
              onCancel={() => setReviewing(false)}
              onSave={async (fields) => {
                await onSaveReview(fields, mine);
                setReviewing(false);
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={mine ? 'soft' : 'primary'} onClick={() => setReviewing(true)} disabled={busy}>
                {mine ? 'Editar minha avaliação' : 'Avaliar'}
              </Button>
              {mine && (
                <Button size="sm" variant="danger" onClick={removeMine} disabled={busy}>
                  Remover minha avaliação
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <EditIcon /> Editar
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Excluir ${movie.name}`}>
            <TrashIcon />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MovieReviewForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: MovieReview;
  onSave: (fields: ReviewFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? DEFAULT_STARS);
  const [review, setReview] = useState(initial?.review ?? '');
  const [watchedDate, setWatchedDate] = useState(initial?.watchedDate ?? '');
  const [isFirstWatch, setIsFirstWatch] = useState(initial?.isFirstWatch ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ rating, review: optionalText(review), watchedDate: watchedDate || undefined, isFirstWatch });
    } catch {
      // the repository already showed why; keep the form open
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="anim-fade-up rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-surface-alt)]/50 p-3 sm:p-4"
    >
      <div className="mb-3">
        <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">Sua nota</span>
        <HalfStarInput value={rating} onChange={setRating} />
      </div>
      <Field label="Resenha">
        <Textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={2000} />
      </Field>
      <Field label="Quando viu">
        <Input type="date" value={watchedDate} max={todayISO()} onChange={(e) => setWatchedDate(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 mb-4 text-sm text-[var(--color-ink)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isFirstWatch}
          onChange={(e) => setIsFirstWatch(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        Primeira vez que vi
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Spinner size={12} />}
          Salvar avaliação
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function MovieForm({
  title,
  initial,
  initialImage,
  onSave,
  onCancel,
}: {
  title: string;
  initial?: Movie;
  initialImage?: ImageValue;
  onSave: (fields: { name: string; image: ImageValue }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [image, setImage] = useState<ImageValue>(initialImage ?? { kind: 'none' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do filme ou série é obrigatório.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ name: name.trim(), image });
    } catch {
      // the repository already showed why; keep the form open
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="anim-fade-up p-5 border-[var(--color-primary)]/40">
      <h2 className="font-display font-semibold text-[var(--color-ink)] mb-4">{title}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Nome *" error={error}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <ImagePicker value={image} onChange={setImage} />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            Salvar
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
