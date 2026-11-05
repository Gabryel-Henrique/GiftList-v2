import type { Gender } from './useCouple';

export interface PartnerLabels {
  he: string; // "Ela" / "Ele" / "Ele(a)"
  his: string; // "Dela" / "Dele" / "Dele(a)"
  heLower: string; // "ela" / "ele" / "ele(a)"
  link: string; // menu entry for the partner page
}

// The old app's gendered wording, picked from the partner's gender; the
// neutral forms are used while the account isn't linked yet.
export function partnerLabels(gender: Gender | undefined): PartnerLabels {
  if (gender === 'Female') {
    return { he: 'Ela', his: 'Dela', heLower: 'ela', link: 'Minha companheira' };
  }
  if (gender === 'Male') {
    return { he: 'Ele', his: 'Dele', heLower: 'ele', link: 'Meu companheiro' };
  }
  return { he: 'Ele(a)', his: 'Dele(a)', heLower: 'ele(a)', link: 'Vincular parceiro(a)' };
}
