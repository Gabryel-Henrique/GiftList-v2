// What the shared review UI needs, whatever the table: restaurant reviews
// call the yes/no "wouldReturn", date idea reviews "wouldRepeat".
export interface ReviewView {
  id: string;
  userId?: string;
  rating: number;
  comment?: string;
  again: boolean;
  createdAt?: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  again: boolean;
}

// "voltar" (restaurants) or "repetir" (dates) — fills the review texts.
export type AgainVerb = 'voltar' | 'repetir';
