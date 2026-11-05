import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { pushToast } from './toast';
import { userMessage } from './errors';

// Photos for restaurants and movies (supabase/002_item_images.sql): either a
// pasted URL (image_url) or a file picked from the device, stored in the
// private `item-images` bucket (image_path). The picker edits an ImageValue;
// the page turns it into those two columns when saving.

const BUCKET = 'item-images';
const SIGNED_URL_SECONDS = 60 * 60;

export type ImageValue =
  | { kind: 'none' }
  | { kind: 'url'; url: string }
  | { kind: 'stored'; path: string; url?: string }
  | { kind: 'file'; blob: Blob; preview: string };

export function imageValueOf(item?: { imagePath?: string; imageUrl?: string }, signedUrl?: string): ImageValue {
  if (item?.imagePath) return { kind: 'stored', path: item.imagePath, url: signedUrl };
  if (item?.imageUrl) return { kind: 'url', url: item.imageUrl };
  return { kind: 'none' };
}

// Uploads a newly picked file (if any) and returns the columns to save.
// Call before saving the row; then cleanupReplacedImage after it succeeds.
export async function prepareImageColumns(
  value: ImageValue,
  coupleId: string,
  folder: 'restaurants' | 'movies'
): Promise<{ imageUrl?: string; imagePath?: string }> {
  switch (value.kind) {
    case 'none':
      return { imageUrl: undefined, imagePath: undefined };
    case 'url':
      return { imageUrl: value.url.trim() || undefined, imagePath: undefined };
    case 'stored':
      return { imageUrl: undefined, imagePath: value.path };
    case 'file': {
      const path = `${coupleId}/${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, value.blob, { contentType: 'image/jpeg' });
      if (error) {
        pushToast(userMessage(error, 'Não foi possível enviar a imagem. Tente novamente.'));
        throw error;
      }
      return { imageUrl: undefined, imagePath: path };
    }
  }
}

// Deletes a stored file that's no longer used. Best effort: a leftover file
// only costs storage, so a failure here isn't worth bothering the user.
export async function removeStoredImage(path: string | undefined, keepPath?: string) {
  if (!path || path === keepPath) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

// Uploads the picked file, saves the row with the image columns, then drops
// the photo it replaced. If saving fails, the just-uploaded file goes too.
export async function saveWithImage(
  value: ImageValue,
  previousPath: string | undefined,
  coupleId: string,
  folder: 'restaurants' | 'movies',
  save: (columns: { imageUrl?: string; imagePath?: string }) => Promise<void>
) {
  const columns = await prepareImageColumns(value, coupleId, folder);
  try {
    await save(columns);
  } catch (error) {
    await removeStoredImage(columns.imagePath, previousPath);
    throw error;
  }
  await removeStoredImage(previousPath, columns.imagePath);
}

// Signed URLs survive across re-renders and list reloads until near expiry,
// so editing a card doesn't re-sign every photo on the screen.
const cache = new Map<string, { url: string; expiresAt: number }>();

export function useSignedImageUrls(paths: (string | undefined)[]): Map<string, string> {
  const key = [...new Set(paths.filter((p): p is string => !!p))].sort().join('|');
  const [, setVersion] = useState(0);

  useEffect(() => {
    const missing = key
      .split('|')
      .filter((p) => p && (cache.get(p)?.expiresAt ?? 0) < Date.now() + 60_000);
    if (missing.length === 0) return;
    const request = { active: true };
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(missing, SIGNED_URL_SECONDS)
      .then(({ data }) => {
        for (const item of data ?? []) {
          if (item.path && item.signedUrl) {
            cache.set(item.path, { url: item.signedUrl, expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000 });
          }
        }
        if (request.active) setVersion((v) => v + 1);
      });
    return () => {
      request.active = false;
    };
  }, [key]);

  const urls = new Map<string, string>();
  for (const path of key.split('|')) {
    const hit = path && cache.get(path);
    if (hit) urls.set(path, hit.url);
  }
  return urls;
}
