import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { fromRow } from './supabaseRepository';

// "Avisos": what the partner did (rows written by DB triggers — see
// supabase/003_activity_and_profile.sql), plus how many plans wait for my
// answer. Module-level store like toast.ts: Layout starts it once, and the
// menu badges / Avisos page read it from anywhere.

export type NoticeKind =
  | 'gift_added'
  | 'restaurant_added'
  | 'date_idea_added'
  | 'movie_added'
  | 'restaurant_reviewed'
  | 'date_idea_reviewed'
  | 'movie_reviewed'
  | 'availability_opened'
  | 'availability_closed'
  | 'entry_proposed'
  | 'entry_confirmed'
  | 'entry_declined'
  | 'entry_cancelled'
  | 'entry_done'
  | 'couple_linked';

export interface Notice {
  id: string;
  actorUserId: string;
  kind: NoticeKind;
  refId?: string;
  refDate?: string;
  title?: string;
  createdAt: string;
  readAt?: string;
}

interface State {
  notices: Notice[];
  pendingProposals: number;
  loaded: boolean;
}

let state: State = { notices: [], pendingProposals: 0, loaded: false };
const listeners = new Set<() => void>();
let userId: string | null = null;
let channel: RealtimeChannel | null = null;
let onArrive: ((notice: Notice) => void) | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export async function refreshNotices() {
  if (!userId) return;
  const [notices, pending] = await Promise.all([
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(60),
    supabase
      .from('agenda_entries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Proposed')
      .neq('proposed_by_user_id', userId),
  ]);
  // Silent on failure: badges are a nice-to-have, never worth an error toast.
  set({
    notices: notices.error ? state.notices : (notices.data ?? []).map((row) => fromRow<Notice>(row)),
    pendingProposals: pending.error ? state.pendingProposals : pending.count ?? 0,
    loaded: true,
  });
}

function onFocus() {
  if (document.visibilityState === 'visible') refreshNotices();
}

// Called by Layout once the couple is known; returns the cleanup.
export function startNotices(me: string, arrive: (notice: Notice) => void): () => void {
  userId = me;
  onArrive = arrive;
  refreshNotices();
  channel = supabase
    .channel(`activity-${me}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity', filter: `recipient_user_id=eq.${me}` },
      (payload) => {
        onArrive?.(fromRow<Notice>(payload.new as Record<string, unknown>));
        refreshNotices();
      }
    )
    .subscribe();
  document.addEventListener('visibilitychange', onFocus);
  return () => {
    document.removeEventListener('visibilitychange', onFocus);
    if (channel) supabase.removeChannel(channel);
    channel = null;
    userId = null;
    onArrive = null;
    state = { notices: [], pendingProposals: 0, loaded: false };
  };
}

export async function markNoticesRead(ids?: string[]) {
  const unread = state.notices.filter((n) => !n.readAt && (!ids || ids.includes(n.id)));
  if (unread.length === 0) return;
  const now = new Date().toISOString();
  // Optimistic: the badge drops right away.
  set({ notices: state.notices.map((n) => (unread.includes(n) ? { ...n, readAt: now } : n)) });
  await supabase.from('activity').update({ read_at: now }).in('id', unread.map((n) => n.id));
}

export function useNotices(): State & { unread: number } {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
  return { ...snapshot, unread: snapshot.notices.filter((n) => !n.readAt).length };
}
