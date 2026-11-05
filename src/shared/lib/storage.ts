// ============================================================
// DATA LAYER
// ============================================================
// Every screen (features/*) talks to a `Repository<T>` (plain tables) or to
// the RPC helper in rpc.ts (multi-step rules) — never to supabase directly.
//
// Unlike Finza, there's no localStorage repository for `npm run dev`: most
// of the app depends on two linked accounts and on RLS/RPCs that only exist
// in the database, so dev also talks to Supabase.
// ============================================================

import { createSupabaseRepository } from './supabaseRepository';

export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Omit<T, 'id'>): Promise<T>;
  remove(id: string): Promise<void>;
}

// What every feature's repository.ts calls. `name` is the Supabase table.
export function createRepository<T extends { id: string }>(name: string): Repository<T> {
  return createSupabaseRepository<T>(name);
}
