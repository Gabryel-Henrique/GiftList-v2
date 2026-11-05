import { supabase } from './supabaseClient';
import type { Repository } from './storage';
import { pushToast } from './toast';
import { userMessage } from './errors';

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Shallow mappers: every table here is a flat record, no nested objects.
// `undefined` fields are dropped for inserts, so DB defaults and triggers
// (couple_id, created_by_user_id = auth.uid(), created_at) still kick in.
export function toRow(item: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined) row[camelToSnake(key)] = value;
  }
  return row;
}

// For updates, every call site spreads the *whole* record (never a partial
// patch), so an `undefined` field means the user cleared it — it has to
// become `null` in the row, or PostgREST would leave the old value. Columns
// that must never change (couple_id, created_by, created_at...) are pinned
// by a trigger in the database, so sending them back is harmless.
function toUpdateRow(item: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    row[camelToSnake(key)] = value === undefined ? null : value;
  }
  return row;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const item: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === 'couple_id') continue;
    item[snakeToCamel(key)] = value ?? undefined;
  }
  return item as T;
}

// Every plain-table write funnels through here (directly or via
// useRepository), so this is the one place that makes sure a failed
// save/load never fails silently. Each method still throws after toasting,
// so callers can keep a form open or roll back their own state.
export function createSupabaseRepository<T extends { id: string }>(
  tableName: string
): Repository<T> {
  return {
    async list() {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        pushToast(userMessage(error, 'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.'));
        throw error;
      }
      return (data ?? []).map((row) => fromRow<T>(row));
    },

    async create(item) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(toRow(item as Record<string, unknown>))
        .select()
        .single();
      if (error) {
        pushToast(userMessage(error, 'Não foi possível salvar. Tente novamente.'));
        throw error;
      }
      return fromRow<T>(data);
    },

    async update(id, item) {
      const { data, error } = await supabase
        .from(tableName)
        .update(toUpdateRow(item as Record<string, unknown>))
        .eq('id', id)
        .select()
        .single();
      if (error) {
        pushToast(userMessage(error, 'Não foi possível salvar as alterações. Tente novamente.'));
        throw error;
      }
      return fromRow<T>(data);
    },

    async remove(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) {
        pushToast(userMessage(error, 'Não foi possível excluir. Tente novamente.'));
        throw error;
      }
    },
  };
}
