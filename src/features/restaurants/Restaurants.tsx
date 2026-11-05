import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented, Spinner, Textarea } from '../../shared/components/ui';
import { CardGridSkeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { ExternalImage } from '../../shared/components/ExternalImage';
import { ImagePicker } from '../../shared/components/ImagePicker';
import { imageValueOf, removeStoredImage, saveWithImage, useSignedImageUrls, type ImageValue } from '../../shared/lib/itemImages';
import { EditIcon, LinkIcon, TrashIcon } from '../../shared/components/icons';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { optionalText } from '../../shared/lib/format';
import { byNewest } from '../../shared/lib/priority';
import { askConfirm } from '../../shared/lib/confirm';
import { useFocusFormFromQuery } from '../../shared/lib/focus';
import { ItemReviews } from '../reviews/ItemReviews';
import type { ReviewView } from '../reviews/types';
import { restaurantRepo, restaurantReviewRepo } from './repository';
import type { Restaurant, RestaurantReview } from './types';

type Filter = 'all' | 'want' | 'been';

function toView(review: RestaurantReview): ReviewView {
  return { ...review, again: review.wouldReturn };
}

export default function Restaurants() {
  return (
    <NeedsCouple title="Restaurantes 🍽️">
      <Board />
    </NeedsCouple>
  );
}

function Board() {
  const restaurants = useRepository(restaurantRepo);
  const reviews = useRepository(restaurantReviewRepo);
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(() => params.has('novo'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const { couple } = useCouple();
  const imageUrls = useSignedImageUrls(restaurants.items.map((r) => r.imagePath));
  useFocusFormFromQuery();
  const imageSrc = (r: Restaurant) => (r.imagePath ? imageUrls.get(r.imagePath) : r.imageUrl);

  const reviewsOf = (id: string) => reviews.items.filter((r) => r.restaurantId === id);
  const list = [...restaurants.items]
    .sort(byNewest)
    .filter((r) => {
      if (filter === 'all') return true;
      const been = reviewsOf(r.id).length > 0;
      return filter === 'been' ? been : !been;
    });

  async function remove(restaurant: Restaurant) {
    const ok = await askConfirm({
      title: 'Excluir restaurante',
      message: `Excluir "${restaurant.name}"?`,
      warning: 'As avaliações e os planos da agenda ligados a ele também serão apagados.',
      actions: [{ label: 'Excluir', value: true, variant: 'destructive' }],
    });
    if (!ok) return;
    try {
      await restaurants.remove(restaurant.id);
      await removeStoredImage(restaurant.imagePath);
      await reviews.reload();
    } catch {
      // the repository already showed why
    }
  }

  async function saveReview(restaurantId: string, input: { rating: number; comment?: string; again: boolean }, existing?: ReviewView) {
    const fields = { rating: input.rating, comment: input.comment, wouldReturn: input.again };
    if (existing) {
      const current = reviews.items.find((r) => r.id === existing.id)!;
      await reviews.update(existing.id, { ...current, ...fields });
    } else {
      await reviews.create({ restaurantId, ...fields });
    }
  }

  return (
    <>
      <PageHeader
        title="Restaurantes 🍽️"
        action={
          !adding && (
            <Button onClick={() => { setAdding(true); setEditingId(null); }}>+ Adicionar restaurante</Button>
          )
        }
      />

      {adding && (
        <div className="mb-6 max-w-2xl">
          <RestaurantForm
            title="Novo restaurante"
            onCancel={() => setAdding(false)}
            onSave={async ({ image, ...fields }) => {
              await saveWithImage(image, undefined, couple!.id, 'restaurants', (columns) =>
                restaurants.create({ ...fields, ...columns })
              );
              setAdding(false);
            }}
          />
        </div>
      )}

      {restaurants.loading || reviews.loading ? (
        <CardGridSkeleton cards={3} />
      ) : restaurants.items.length === 0 ? (
        !adding && (
          <EmptyState
            icon="🍽️"
            title="Nenhum restaurante ainda"
            description="Adicione os lugares que vocês querem conhecer — depois de ir, cada um deixa sua avaliação."
          />
        )
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'want', label: 'Queremos ir' },
                { value: 'been', label: 'Já fomos' },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Nenhum restaurante nesse filtro.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {list.map((restaurant, index) =>
                editingId === restaurant.id ? (
                  <div key={restaurant.id} className="md:col-span-2 lg:col-span-3 max-w-2xl w-full">
                    <RestaurantForm
                      title="Editar restaurante"
                      initial={restaurant}
                      initialImage={imageValueOf(restaurant, imageSrc(restaurant))}
                      onCancel={() => setEditingId(null)}
                      onSave={async ({ image, ...fields }) => {
                        await saveWithImage(image, restaurant.imagePath, couple!.id, 'restaurants', (columns) =>
                          restaurants.update(restaurant.id, { ...restaurant, ...fields, ...columns }).then(() => undefined)
                        );
                        setEditingId(null);
                      }}
                    />
                  </div>
                ) : (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    imageSrc={imageSrc(restaurant)}
                    reviews={reviewsOf(restaurant.id).map(toView)}
                    index={index}
                    onEdit={() => { setEditingId(restaurant.id); setAdding(false); }}
                    onDelete={() => remove(restaurant)}
                    onSaveReview={(input, existing) => saveReview(restaurant.id, input, existing)}
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

function RestaurantCard({
  restaurant,
  imageSrc,
  reviews,
  index,
  onEdit,
  onDelete,
  onSaveReview,
  onDeleteReview,
}: {
  restaurant: Restaurant;
  imageSrc?: string;
  reviews: ReviewView[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onSaveReview: (input: { rating: number; comment?: string; again: boolean }, existing?: ReviewView) => Promise<void>;
  onDeleteReview: (review: ReviewView) => Promise<void>;
}) {
  const { nameOf } = useCouple();
  const been = reviews.length > 0;

  return (
    <Card className="anim-fade-up overflow-hidden" style={{ animationDelay: `${index * 40}ms` }}>
      <ExternalImage src={imageSrc} alt={restaurant.name} className="w-full h-[180px] object-cover" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-[var(--color-ink)] leading-snug break-words min-w-0">
            {restaurant.name}
          </h3>
          <Badge color={been ? 'var(--color-teal)' : 'var(--color-muted)'} className="mt-0.5">
            {been ? 'Já fomos' : 'Queremos ir'}
          </Badge>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">Adicionado por {nameOf(restaurant.createdByUserId)}</p>
        {restaurant.description && (
          <p className="text-sm text-[var(--color-muted)] mt-2 whitespace-pre-line break-words">{restaurant.description}</p>
        )}
        {restaurant.link && (
          <a
            href={restaurant.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)] no-underline"
          >
            Abrir link <LinkIcon />
          </a>
        )}

        <div className="mt-4">
          <ItemReviews
            reviews={reviews}
            verb="voltar"
            firstReviewLabel="Já fomos! Avaliar"
            onSave={onSaveReview}
            onDelete={onDeleteReview}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <EditIcon /> Editar
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Excluir ${restaurant.name}`}>
            <TrashIcon />
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface RestaurantFields {
  name: string;
  description?: string;
  link?: string;
  image: ImageValue;
}

function RestaurantForm({
  title,
  initial,
  initialImage,
  onSave,
  onCancel,
}: {
  title: string;
  initial?: Restaurant;
  initialImage?: ImageValue;
  onSave: (fields: RestaurantFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [link, setLink] = useState(initial?.link ?? '');
  const [image, setImage] = useState<ImageValue>(initialImage ?? { kind: 'none' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do restaurante é obrigatório.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: optionalText(description),
        link: optionalText(link),
        image,
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
        <Field label="Nome *" error={error}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Descrição / tipo de cozinha">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </Field>
        <Field label="Link (site, mapa, etc.)">
          <Input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." maxLength={2000} />
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
