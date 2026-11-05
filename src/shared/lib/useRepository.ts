import { useCallback, useEffect, useState } from 'react';
import type { Repository } from './storage';

// Generic hook: connects any Repository<T> to React state,
// with loading and create/update/remove operations ready to use.
// Used by the feature pages backed by a plain table (restaurants, dates, movies...).
export function useRepository<T extends { id: string }>(repo: Repository<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-fetches without touching `loading`. Deliberately doesn't flip the
  // screen back to its loading state on every create/update/remove — most
  // callers already have data on display, and swapping it out for
  // "Carregando…" would unmount every list item (losing local UI state like
  // an expanded card or a selected month) just to redraw the same list.
  const reload = useCallback(async () => {
    try {
      const data = await repo.list();
      setItems(data);
    } catch {
      // supabaseRepository already surfaced a toast; here we just make sure
      // stale data stays on screen instead of the list going blank.
    }
  }, [repo]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = useCallback(
    async (item: Omit<T, 'id'>) => {
      await repo.create(item);
      await reload();
    },
    [repo, reload]
  );

  const update = useCallback(
    async (id: string, item: Omit<T, 'id'>) => {
      await repo.update(id, item);
      await reload();
    },
    [repo, reload]
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await reload();
    },
    [repo, reload]
  );

  return { items, loading, reload, create, update, remove };
}
