// Uploads the old app's gift photos (bytea in "GiftImages") to the private
// `gift-images` bucket, at the paths supabase/import_legacy.sql recorded in
// gift_images. Run it AFTER that SQL. Safe to run again (it overwrites).
//
// Usage: node scripts/import-legacy-images.mjs   (needs scripts/.env)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data: rows, error } = await db.from('gift_images').select('id, path').like('path', '%/legacy-%');
if (error) throw error;
if (!rows.length) {
  console.log('Nenhuma foto antiga registrada. Rode primeiro supabase/import_legacy.sql no SQL Editor.');
  process.exit(1);
}

let sent = 0;
for (const row of rows) {
  // The gift_images id is the old "GiftImages" id (kept by the import).
  const { data: legacy, error: legacyError } = await db
    .from('GiftImages')
    .select('Data, ContentType')
    .eq('Id', row.id)
    .single();
  if (legacyError) throw legacyError;

  // PostgREST returns bytea as a "\x…" hex string.
  const bytes = Buffer.from(String(legacy.Data).replace(/^\\x/, ''), 'hex');
  const { error: uploadError } = await db.storage
    .from('gift-images')
    .upload(row.path, bytes, { contentType: legacy.ContentType || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;
  sent += 1;
  console.log(`✓ ${sent}/${rows.length}  ${row.path} (${Math.round(bytes.length / 1024)} KB)`);
}
console.log(`Pronto: ${sent} foto(s) enviada(s).`);
