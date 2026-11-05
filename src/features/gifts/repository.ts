import { supabase } from '../../shared/lib/supabaseClient';
import { fromRow, toRow } from '../../shared/lib/supabaseRepository';
import { callRpc } from '../../shared/lib/rpc';
import { pushToast } from '../../shared/lib/toast';
import { userMessage } from '../../shared/lib/errors';
import type { Gift, GiftImage, GiftType, SaveGiftInput } from './types';

// Gifts don't fit the generic Repository<T>: they carry images (files in a
// private Storage bucket + rows in gift_images) and a purchase state that
// only the set_gift_purchased RPC may change.

const BUCKET = 'gift-images';
const SIGNED_URL_SECONDS = 60 * 60;

function fail(error: unknown, fallback: string): never {
  pushToast(userMessage(error, fallback));
  throw error;
}

function giftFields(input: SaveGiftInput) {
  // Explicit nulls so clearing a field on edit really clears it.
  return {
    name: input.name.trim(),
    description: input.description ?? null,
    link: input.link ?? null,
    price: input.price ?? null,
    priority: input.priority,
  };
}

async function addImages(giftId: string, coupleId: string, blobs: Blob[], firstOrder: number) {
  for (const [index, blob] of blobs.entries()) {
    const path = `${coupleId}/${giftId}/${crypto.randomUUID()}.jpg`;
    const upload = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (upload.error) fail(upload.error, 'Não foi possível enviar uma das imagens. Tente novamente.');

    const { error } = await supabase
      .from('gift_images')
      .insert({ gift_id: giftId, path, sort_order: firstOrder + index });
    if (error) {
      // e.g. the 6-image limit: don't leave an orphan file behind.
      await supabase.storage.from(BUCKET).remove([path]);
      fail(error, 'Não foi possível salvar uma das imagens. Tente novamente.');
    }
  }
}

// File first, row second: reading/deleting a file is only allowed while
// its gift_images row still exists (see the storage policies).
async function removeImages(images: GiftImage[]) {
  if (images.length === 0) return;
  const files = await supabase.storage.from(BUCKET).remove(images.map((image) => image.path));
  if (files.error) fail(files.error, 'Não foi possível remover as imagens. Tente novamente.');
  const { error } = await supabase
    .from('gift_images')
    .delete()
    .in('id', images.map((image) => image.id));
  if (error) fail(error, 'Não foi possível remover as imagens. Tente novamente.');
}

export const giftApi = {
  // Everything this user may see (RLS): their own gifts of both types and
  // the partner's wishlist — never the partner's surprises.
  async list(): Promise<Gift[]> {
    const { data, error } = await supabase.from('gifts').select('*, gift_images(id, path, sort_order)');
    if (error) fail(error, 'Não foi possível carregar os presentes. Verifique sua conexão e tente novamente.');

    const gifts = (data ?? []).map(({ gift_images, ...row }) => ({
      ...fromRow<Omit<Gift, 'images'>>(row),
      images: ((gift_images ?? []) as Record<string, unknown>[])
        .map((image) => fromRow<GiftImage>(image))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

    // One request for every image URL instead of one per image.
    const paths = gifts.flatMap((gift) => gift.images.map((image) => image.path));
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
      for (const gift of gifts) {
        for (const image of gift.images) image.url = urls.get(image.path) ?? undefined;
      }
    }
    return gifts;
  },

  async create(type: GiftType, input: SaveGiftInput, coupleId: string): Promise<void> {
    const { data, error } = await supabase
      .from('gifts')
      .insert(toRow({ ...giftFields(input), type }))
      .select('id')
      .single();
    if (error) fail(error, 'Não foi possível salvar o presente. Tente novamente.');
    await addImages(data.id, coupleId, input.newImages, 0);
  },

  async update(gift: Gift, input: SaveGiftInput, coupleId: string): Promise<void> {
    const { error } = await supabase.from('gifts').update(giftFields(input)).eq('id', gift.id);
    if (error) fail(error, 'Não foi possível salvar as alterações. Tente novamente.');

    // Removals before additions, so swapping an image works at the limit.
    await removeImages(input.removeImages);
    const removed = new Set(input.removeImages.map((image) => image.id));
    const kept = gift.images.filter((image) => !removed.has(image.id));
    const nextOrder = kept.reduce((max, image) => Math.max(max, image.sortOrder + 1), 0);
    await addImages(gift.id, coupleId, input.newImages, nextOrder);
  },

  async remove(gift: Gift): Promise<void> {
    await removeImages(gift.images);
    const { error } = await supabase.from('gifts').delete().eq('id', gift.id);
    if (error) fail(error, 'Não foi possível excluir o presente. Tente novamente.');
  },

  setPurchased: (giftId: string, purchased: boolean) =>
    callRpc('set_gift_purchased', { gift_id: giftId, purchased }),
};
