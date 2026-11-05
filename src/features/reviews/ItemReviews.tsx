import { useState, type FormEvent } from 'react';
import { Badge, Button, Field, Spinner, Textarea } from '../../shared/components/ui';
import { useCouple } from '../../shared/lib/useCouple';
import { optionalText } from '../../shared/lib/format';
import { askConfirm } from '../../shared/lib/confirm';
import { DEFAULT_RATING, ratingColor, ratingLabel } from './rating';
import { StarRatingInput } from './StarRating';
import type { AgainVerb, ReviewInput, ReviewView } from './types';

export function RatingBadge({ rating }: { rating: number }) {
  return (
    <Badge color={ratingColor(rating)}>
      {rating} — {ratingLabel(rating)}
    </Badge>
  );
}

// Each person's review of an item, in the order they were written.
export function ReviewList({ reviews, verb }: { reviews: ReviewView[]; verb: AgainVerb }) {
  const { nameOf } = useCouple();
  if (reviews.length === 0) return null;
  const sorted = [...reviews].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  return (
    <ul className="space-y-2">
      {sorted.map((review) => (
        <li key={review.id} className="rounded-xl bg-[var(--color-surface-alt)] px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">{nameOf(review.userId)}</span>
            <RatingBadge rating={review.rating} />
          </div>
          {review.comment && (
            <p className="text-sm text-[var(--color-ink)]/90 mt-1 whitespace-pre-line break-words">{review.comment}</p>
          )}
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {review.again ? `🔁 Pretende ${verb}` : `🚫 Não pretende ${verb}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ReviewForm({
  initial,
  verb,
  onSave,
  onCancel,
}: {
  initial?: ReviewView;
  verb: AgainVerb;
  onSave: (input: ReviewInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? DEFAULT_RATING);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [again, setAgain] = useState(initial?.again ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ rating, comment: optionalText(comment), again });
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
        <span className="block text-xs font-medium text-[var(--color-muted)] mb-1">Sua nota</span>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>
      <Field label="Comentário">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      </Field>
      <label className="flex items-center gap-2 mb-4 text-sm text-[var(--color-ink)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={again}
          onChange={(e) => setAgain(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        Pretendemos {verb}
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

// The reviews block of a card: everyone's reviews, plus the buttons to
// write / edit / remove your own (one per person, upserted).
export function ItemReviews({
  reviews,
  verb,
  firstReviewLabel,
  onSave,
  onDelete,
  startEditing = false,
}: {
  reviews: ReviewView[];
  verb: AgainVerb;
  firstReviewLabel: string; // "Já fomos! Avaliar" / "Já fizemos! Avaliar"
  startEditing?: boolean; // open the form right away (agenda, after "Encontro feito?")
  onSave: (input: ReviewInput, existing?: ReviewView) => Promise<void>;
  onDelete: (review: ReviewView) => Promise<void>;
}) {
  const { me } = useCouple();
  const [editing, setEditing] = useState(startEditing);
  const [busy, setBusy] = useState(false);
  const mine = reviews.find((r) => r.userId === me.id);

  async function remove() {
    if (!mine) return;
    const ok = await askConfirm({
      title: 'Remover avaliação',
      message: 'Remover a sua avaliação?',
      actions: [{ label: 'Remover', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    setBusy(true);
    try {
      await onDelete(mine);
    } catch {
      // the repository already showed why
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ReviewList reviews={reviews} verb={verb} />
      {editing ? (
        <ReviewForm
          initial={mine}
          verb={verb}
          onCancel={() => setEditing(false)}
          onSave={async (input) => {
            await onSave(input, mine);
            setEditing(false);
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={mine ? 'soft' : 'primary'} onClick={() => setEditing(true)} disabled={busy}>
            {mine ? 'Editar minha avaliação' : firstReviewLabel}
          </Button>
          {mine && (
            <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
              Remover avaliação
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
