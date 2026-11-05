import { createRepository } from '../../shared/lib/storage';
import { callRpc } from '../../shared/lib/rpc';
import type { AgendaEntry, Availability } from './types';

// Read through the tables (RLS: the couple's rows only); every change goes
// through the database functions, which carry the state rules (who may
// confirm, auto-cancel when nobody is available anymore...).
export const availabilityRepo = createRepository<Availability>('availabilities');
export const agendaEntryRepo = createRepository<AgendaEntry>('agenda_entries');

export const agendaApi = {
  setAvailability: (date: string, open: boolean) => callRpc('set_availability', { p_date: date, p_open: open }),
  propose: (date: string, link: { dateIdeaId?: string; restaurantId?: string }, note?: string) =>
    callRpc('propose_agenda_entry', {
      p_date: date,
      p_date_idea_id: link.dateIdeaId ?? null,
      p_restaurant_id: link.restaurantId ?? null,
      p_note: note ?? null,
    }),
  confirm: (entryId: string) => callRpc('confirm_agenda_entry', { entry_id: entryId }),
  decline: (entryId: string, reason?: string) => callRpc('decline_agenda_entry', { entry_id: entryId, reason: reason ?? null }),
  cancel: (entryId: string, reason?: string) => callRpc('cancel_agenda_entry', { entry_id: entryId, reason: reason ?? null }),
  // `today` is the user's local date (see mark_agenda_entry_done).
  markDone: (entryId: string, today: string) => callRpc('mark_agenda_entry_done', { entry_id: entryId, today }),
};
