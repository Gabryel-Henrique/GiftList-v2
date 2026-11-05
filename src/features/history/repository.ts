import { createRepository } from '../../shared/lib/storage';
import { supabase } from '../../shared/lib/supabaseClient';
import { pushToast } from '../../shared/lib/toast';
import { userMessage } from '../../shared/lib/errors';
import type { MemoryPhoto } from './types';

const BUCKET = 'item-images';

export const memoryPhotoRepo = createRepository<MemoryPhoto>('memory_photos');

// File first, then the row (which checks the date really happened and the
// 6-photo limit); if the row is refused, the file goes too.
export async function addMemoryPhoto(blob: Blob, coupleId: string, entryId: string) {
  const path = `${coupleId}/memories/${entryId}/${crypto.randomUUID()}.jpg`;
  const upload = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (upload.error) {
    pushToast(userMessage(upload.error, 'Não foi possível enviar a foto. Tente novamente.'));
    throw upload.error;
  }
  try {
    await memoryPhotoRepo.create({ agendaEntryId: entryId, path });
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function removeMemoryPhoto(photo: MemoryPhoto) {
  await memoryPhotoRepo.remove(photo.id);
  // Best effort: an orphan file only costs storage.
  await supabase.storage.from(BUCKET).remove([photo.path]);
}
