import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, Input, Spinner } from './ui';
import { resizeImage } from '../lib/imageResize';
import { pushToast } from '../lib/toast';
import type { ImageValue } from '../lib/itemImages';

// One image for an item: a photo from the device (resized in the browser,
// like gift photos) or a pasted link. The page uploads on save.
export function ImagePicker({ value, onChange }: { value: ImageValue; onChange: (value: ImageValue) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [showLink, setShowLink] = useState(value.kind === 'url');

  // Free the local preview when it's replaced or the form closes.
  const preview = value.kind === 'file' ? value.preview : null;
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProcessing(true);
    try {
      const blob = await resizeImage(file);
      onChange({ kind: 'file', blob, preview: URL.createObjectURL(blob) });
      setShowLink(false);
    } catch {
      pushToast('Não foi possível processar a imagem selecionada. Tente outro arquivo.');
    } finally {
      setProcessing(false);
    }
  }

  const src =
    value.kind === 'file' ? value.preview : value.kind === 'stored' ? value.url : value.kind === 'url' ? value.url.trim() : '';

  return (
    <div className="mb-4">
      <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">Imagem</span>

      {src && (
        <div className="relative w-full max-w-xs h-32 rounded-xl overflow-hidden bg-[var(--color-surface-alt)] mb-2">
          <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => {
              onChange({ kind: 'none' });
              setShowLink(false);
            }}
            aria-label="Remover imagem"
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white leading-none flex items-center justify-center hover:bg-black/80"
          >
            ×
          </button>
        </div>
      )}

      {processing ? (
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Spinner /> Processando imagem...
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <Button variant="soft" size="sm" onClick={() => fileInput.current?.click()}>
            📷 {value.kind === 'file' || value.kind === 'stored' ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {!showLink && (
            <Button variant="ghost" size="sm" onClick={() => setShowLink(true)}>
              🔗 Colar link
            </Button>
          )}
        </div>
      )}

      {showLink && (
        <Input
          type="url"
          inputMode="url"
          className="mt-2"
          value={value.kind === 'url' ? value.url : ''}
          onChange={(e) => onChange({ kind: 'url', url: e.target.value })}
          placeholder="https://... (link da imagem)"
          maxLength={2000}
        />
      )}
    </div>
  );
}
