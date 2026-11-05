import { useCallback, useEffect, useState } from 'react';
import { giftApi } from './repository';
import type { Gift } from './types';

// Like useRepository, for the gifts' custom API: loads once, and reload()
// after a change refreshes without flipping back to the loading state.
export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setGifts(await giftApi.list());
    } catch {
      // the repository already showed a toast; keep what's on screen
    }
  }, []);

  useEffect(() => {
    let current = true;
    giftApi
      .list()
      .then((list) => current && setGifts(list))
      .catch(() => undefined)
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, []);

  return { gifts, loading, reload };
}
