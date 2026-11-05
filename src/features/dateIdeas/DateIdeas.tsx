import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented, Spinner, Textarea } from '../../shared/components/ui';
import { CardGridSkeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { EditIcon, LinkIcon, TrashIcon } from '../../shared/components/icons';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { formatCurrency, moneyInput, optionalText, parseMoney } from '../../shared/lib/format';
import { byPriorityThenNewest, PRIORITIES, PRIORITY_COLOR, PRIORITY_LABEL, type Priority } from '../../shared/lib/priority';
import { askConfirm } from '../../shared/lib/confirm';
import { useFocusFormFromQuery } from '../../shared/lib/focus';
import { ItemReviews } from '../reviews/ItemReviews';
import type { ReviewInput, ReviewView } from '../reviews/types';
import { dateIdeaRepo, dateIdeaReviewRepo } from './repository';
import type { DateIdea, DateIdeaReview } from './types';

type Filter = 'all' | 'want' | 'done';

function toView(review: DateIdeaReview): ReviewView {
  return { ...review, again: review.wouldRepeat };
}

export default function DateIdeas() {
  return (
    <NeedsCouple title="Ideias para Dates 💡">
      <Board />
    </NeedsCouple>
  );
}

function Board() {
  const ideas = useRepository(dateIdeaRepo);
  const reviews = useRepository(dateIdeaReviewRepo);
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(() => params.has('novo'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  useFocusFormFromQuery();

  const reviewsOf = (id: string) => reviews.items.filter((r) => r.dateIdeaId === id);
  const list = [...ideas.items].sort(byPriorityThenNewest).filter((idea) => {
    if (filter === 'all') return true;
    const done = reviewsOf(idea.id).length > 0;
    return filter === 'done' ? done : !done;
  });

  async function remove(idea: DateIdea) {
    const ok = await askConfirm({
      title: 'Excluir ideia',
      message: `Excluir "${idea.name}"?`,
      warning: 'As avaliações e os planos da agenda ligados a ela também serão apagados.',
      actions: [{ label: 'Excluir', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    try {
      await ideas.remove(idea.id);
      await reviews.reload();
    } catch {
      // the repository already showed why
    }
  }

  async function saveReview(dateIdeaId: string, input: ReviewInput, existing?: ReviewView) {
    const fields = { rating: input.rating, comment: input.comment, wouldRepeat: input.again };
    if (existing) {
      const current = reviews.items.find((r) => r.id === existing.id)!;
      await reviews.update(existing.id, { ...current, ...fields });
    } else {
      await reviews.create({ dateIdeaId, ...fields });
    }
  }

  return (
    <>
      <PageHeader
        title="Ideias para Dates 💡"
        action={
          !adding && (
            <Button onClick={() => { setAdding(true); setEditingId(null); }}>+ Adicionar ideia</Button>
          )
        }
      />

      {adding && (
        <div className="mb-6 max-w-2xl">
          <DateIdeaForm
            title="Nova ideia de date"
            onCancel={() => setAdding(false)}
            onSave={async (fields) => {
              await ideas.create(fields);
              setAdding(false);
            }}
          />
        </div>
      )}

      {ideas.loading || reviews.loading ? (
        <CardGridSkeleton cards={2} />
      ) : ideas.items.length === 0 ? (
        !adding && (
          <EmptyState
            icon="💡"
            title="Nenhuma ideia ainda"
            description="Anote os programas que vocês querem fazer juntos — depois de fazer, cada um deixa sua avaliação."
          />
        )
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'want', label: 'Queremos fazer' },
                { value: 'done', label: 'Já fizemos' },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Nenhuma ideia nesse filtro.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {list.map((idea, index) =>
                editingId === idea.id ? (
                  <div key={idea.id} className="lg:col-span-2 max-w-2xl w-full">
                    <DateIdeaForm
                      title="Editar ideia de date"
                      initial={idea}
                      onCancel={() => setEditingId(null)}
                      onSave={async (fields) => {
                        await ideas.update(idea.id, { ...idea, ...fields });
                        setEditingId(null);
                      }}
                    />
                  </div>
                ) : (
                  <DateIdeaCard
                    key={idea.id}
                    idea={idea}
                    reviews={reviewsOf(idea.id).map(toView)}
                    index={index}
                    onEdit={() => { setEditingId(idea.id); setAdding(false); }}
                    onDelete={() => remove(idea)}
                    onSaveReview={(input, existing) => saveReview(idea.id, input, existing)}
                    onDeleteReview={(review) => reviews.remove(review.id)}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

function DateIdeaCard({
  idea,
  reviews,
  index,
  onEdit,
  onDelete,
  onSaveReview,
  onDeleteReview,
}: {
  idea: DateIdea;
  reviews: ReviewView[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onSaveReview: (input: ReviewInput, existing?: ReviewView) => Promise<void>;
  onDeleteReview: (review: ReviewView) => Promise<void>;
}) {
  const { nameOf } = useCouple();
  const done = reviews.length > 0;

  return (
    <Card className="anim-fade-up p-4" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-semibold text-[var(--color-ink)] leading-snug break-words min-w-0">{idea.name}</h3>
        <div className="flex flex-wrap justify-end gap-1 mt-0.5">
          <Badge color={done ? 'var(--color-teal)' : 'var(--color-muted)'}>{done ? 'Já fizemos' : 'Queremos fazer'}</Badge>
          <Badge color={PRIORITY_COLOR[idea.priority]}>{PRIORITY_LABEL[idea.priority]}</Badge>
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted)] mt-0.5">Adicionado por {nameOf(idea.createdByUserId)}</p>
      {idea.description && (
        <p className="text-sm text-[var(--color-muted)] mt-2 whitespace-pre-line break-words">{idea.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
        {idea.estimatedCost != null && (
          <span className="text-sm text-[var(--color-ink)]">
            Gasto médio: <span className="tabular-nums font-semibold">{formatCurrency(idea.estimatedCost)}</span>
          </span>
        )}
        {idea.videoLink && (
          <a
            href={idea.videoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)] no-underline"
          >
            Ver referência <LinkIcon />
          </a>
        )}
      </div>

      <div className="mt-4">
        <ItemReviews
          reviews={reviews}
          verb="repetir"
          firstReviewLabel="Já fizemos! Avaliar"
          onSave={onSaveReview}
          onDelete={onDeleteReview}
        />
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <EditIcon /> Editar
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Excluir ${idea.name}`}>
          <TrashIcon />
        </Button>
      </div>
    </Card>
  );
}

interface DateIdeaFields {
  name: string;
  description?: string;
  estimatedCost?: number;
  videoLink?: string;
  priority: Priority;
}

function DateIdeaForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  initial?: DateIdea;
  onSave: (fields: DateIdeaFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [videoLink, setVideoLink] = useState(initial?.videoLink ?? '');
  const [cost, setCost] = useState(moneyInput(initial?.estimatedCost));
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'Medium');
  const [errors, setErrors] = useState<{ name?: string; cost?: string }>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedCost = parseMoney(cost);
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'O nome da ideia é obrigatório.';
    if (parsedCost !== undefined && Number.isNaN(parsedCost)) next.cost = 'Informe um valor válido.';
    else if (parsedCost !== undefined && parsedCost < 0) next.cost = 'O gasto médio não pode ser negativo.';
    setErrors(next);
    if (next.name || next.cost) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: optionalText(description),
        estimatedCost: parsedCost,
        videoLink: optionalText(videoLink),
        priority,
      });
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
        <Field label="Nome *" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Descrição">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </Field>
        <Field label="Link de vídeo (referência)">
          <Input type="url" inputMode="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://..." maxLength={2000} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Gasto médio" error={errors.cost}>
            <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="R$ 0,00" />
          </Field>
          <div className="mb-4">
            <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">Prioridade</span>
            <Segmented
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
            />
          </div>
        </div>
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
