// Deletes the test accounts used while building the app, with everything
// they created: deleting the auth user cascades to the profile → couple →
// all couple data (gifts, restaurants, agenda, notices...). Storage files
// aren't rows, so they're removed here through the Storage API first.
//
// Usage: node scripts/cleanup-test-data.mjs   (needs scripts/.env)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Only these usernames can ever be deleted by this script.
const TEST_USERNAMES = ['testeee', 'teste2'];
const BUCKETS = ['gift-images', 'item-images'];

const env = Object.fromEntries(
  readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function listAll(bucket, prefix) {
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const files = [];
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    // Folders come back without an id.
    if (item.id) files.push(path);
    else files.push(...(await listAll(bucket, path)));
  }
  return files;
}

const { data: profiles, error } = await db.from('profiles').select('id, username').in('username', TEST_USERNAMES);
if (error) throw error;
if (profiles.length === 0) {
  console.log('Nenhuma conta de teste encontrada. Nada a fazer.');
  process.exit(0);
}
const ids = profiles.map((p) => p.id);

const { data: couples } = await db.from('couples').select('id, user_a_id, user_b_id');
const testCouples = (couples ?? []).filter((c) => ids.includes(c.user_a_id) || ids.includes(c.user_b_id));
for (const couple of testCouples) {
  // Refuse to touch a couple that also has a real (non-test) account.
  if (!ids.includes(couple.user_a_id) || !ids.includes(couple.user_b_id)) {
    throw new Error(`O casal ${couple.id} tem uma conta que não é de teste — abortando.`);
  }
  for (const bucket of BUCKETS) {
    const files = await listAll(bucket, couple.id);
    if (files.length) {
      const { error: rmError } = await db.storage.from(bucket).remove(files);
      if (rmError) throw rmError;
    }
    console.log(`Storage ${bucket}: ${files.length} arquivo(s) removido(s)`);
  }
}

for (const profile of profiles) {
  const { error: delError } = await db.auth.admin.deleteUser(profile.id);
  if (delError) throw delError;
  console.log(`Conta "${profile.username}" excluída (com todos os dados dela).`);
}
console.log('Limpeza concluída.');
