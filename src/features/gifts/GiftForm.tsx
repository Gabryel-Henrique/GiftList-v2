import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button, Card, Field, Input, Segmented, Spinner, Textarea } from '../../shared/components/ui';
import { moneyInput, optionalText, parseMoney } from '../../shared/lib/format';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/priority';
import { pushToast } from '../../shared/lib/toast';
import { resizeImage } from '../../shared/lib/imageResize';
import { MAX_GIFT_IMAGES, type Gift, type GiftImage, type SaveGiftInput } from './types';

interface NewImage {
  key: string;
  blob: Blob;
  preview: string;
}

export function GiftForm({
  gift,
  prefill,
  title,
  onSave,
  onCancel,
}: {
  gift?: Gift;
  prefill?: { name?: string; link?: string }; // from the Share menu (ShareTarget)
  title: string;
  onSave: (input: SaveGiftInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(gift?.name ?? prefill?.name ?? '');
  const [description, setDescription] = useState(gift?.description ?? '');
  const [link, setLink] = useState(gift?.link ?? prefill?.link ?? '');
  const [price, setPrice] = useState(moneyInput(gift?.price));
  const [priority, setPriority] = useState<Priority>(gift?.priority ?? 'Medium');
  const [removed, setRemoved] = useState<GiftImage[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const kept = (gift?.images ?? []).filter((image) => !removed.some((r) => r.id === image.id));
  const slots = MAX_GIFT_IMAGES - kept.length - newImages.length;

  // Free the in-memory previews when the form goes away.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    previews.current = newImages.map((image) => image.preview);
  }, [newImages]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(slots, 0));
    e.target.value = ''; // lets the same file be picked again
    if (files.length === 0) return;
    setProcessing(true);
    try {
      for (const file of files) {
        try {
          const blob = await resizeImage(file);
          const image = { key: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob) };
          setNewImages((prev) => [...prev, image]);
        } catch {
          pushToast('Não foi possível processar uma das imagens selecionadas. Tente outro arquivo.');
        }
      }
    } finally {
      setProcessing(false);
    }
  }

  function removeNew(key: string) {
    setNewImages((prev) => {
      const image = prev.find((i) => i.key === key);
      if (image) URL.revokeObjectURL(image.preview);
      return prev.filter((i) => i.key !== key);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedPrice = parseMoney(price);
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = 'Informe o nome do presente.';
    if (parsedPrice !== undefined && Number.isNaN(parsedPrice)) nextErrors.price = 'Informe um preço válido.';
    else if (parsedPrice !== undefined && parsedPrice < 0) nextErrors.price = 'O preço não pode ser negativo.';
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.price) return;

    setSaving(true);
    try {
      await onSave({
        name,
        description: optionalText(description),
        link: optionalText(link),
        price: parsedPrice,
        priority,
        newImages: newImages.map((image) => image.blob),
        removeImages: removed,
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
        <Field label="Link da loja">
          <Input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            maxLength={2000}
          />
        </Field>

        <div className="mb-4">
          <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">
            Imagens (até {MAX_GIFT_IMAGES})
          </span>
          {(kept.length > 0 || newImages.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {kept.map((image) => (
                <Thumb
                  key={image.id}
                  src={image.url}
                  onRemove={() => setRemoved((prev) => [...prev, image])}
                />
              ))}
              {newImages.map((image) => (
                <Thumb key={image.key} src={image.preview} onRemove={() => removeNew(image.key)} />
              ))}
            </div>
          )}
          {processing ? (
            <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <Spinner /> Processando imagem...
            </p>
          ) : slots > 0 ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
              />
              <Button variant="soft" size="sm" onClick={() => fileInput.current?.click()}>
                + Adicionar {slots === MAX_GIFT_IMAGES ? 'imagens' : `imagem (mais ${slots})`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Limite de 6 imagens atingido.</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Preço estimado" error={errors.price}>
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="R$ 0,00"
            />
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

        <div className="flex gap-2 mt-1">
          <Button type="submit" disabled={saving || processing}>
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

function Thumb({ src, onRemove }: { src?: string; onRemove: () => void }) {
  return (
    <div className="relative w-[90px] h-[90px] rounded-xl overflow-hidden bg-[var(--color-surface-alt)]">
      {src && <img src={src} alt="" className="w-full h-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover imagem"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center hover:bg-black/80"
      >
        ×
      </button>
    </div>
  );
}
