import { createContext, useContext } from 'react';

export type Gender = 'Male' | 'Female';

export interface Profile {
  id: string;
  name: string;
  username: string;
  gender: Gender;
}

export interface Couple {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
}

export interface CoupleState {
  me: Profile;
  partner: Profile | null;
  couple: Couple | null;
  // Every profile this user can see (self, partner, pending requests),
  // to resolve ids into names. Unknown ids show "?", like the old DTOs.
  nameOf: (userId: string | undefined) => string;
  reload: () => Promise<void>;
}

export const CoupleContext = createContext<CoupleState | null>(null);

// Loaded once by CoupleProvider (inside Layout) and shared with every page,
// like the old MainLayout did — pages only render after it's ready.
export function useCouple(): CoupleState {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within a CoupleProvider');
  return ctx;
}
