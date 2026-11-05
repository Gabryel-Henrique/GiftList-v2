// Read-only look at the project: current accounts and legacy row counts.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data: users, error } = await db.auth.admin.listUsers();
if (error) throw error;
console.log('auth users:', users.users.map((u) => u.email));
const { data: profiles } = await db.from('profiles').select('username, name');
console.log('profiles:', profiles);

for (const t of ['Users', 'Couples', 'Gifts', 'GiftImages', 'Restaurants', 'RestaurantReviews', 'DateIdeas', 'DateIdeaReviews', 'Movies', 'MovieReviews', 'Availabilities', 'AgendaEntries']) {
  const { count, error: e } = await db.from(t).select('*', { count: 'exact', head: true });
  console.log(t.padEnd(18), e ? `ERRO ${e.message}` : count);
}
const { data: legacyUsers } = await db.from('Users').select('Username, Name, Gender');
console.log('legacy users:', legacyUsers);
