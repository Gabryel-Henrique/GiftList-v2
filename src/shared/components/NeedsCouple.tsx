import type { ReactNode } from 'react';
import { useCouple } from '../lib/useCouple';
import { EmptyState, LinkButton, PageHeader } from './ui';

// Almost every feature needs a linked couple (the database refuses the
// writes otherwise). Pages render this instead of their content until then;
// `title` keeps the page heading visible when the page's own header lives
// inside the gated content.
export function NeedsCouple({ title, children }: { title?: ReactNode; children: ReactNode }) {
  const { couple } = useCouple();
  if (couple) return <>{children}</>;
  return (
    <>
      {title && <PageHeader title={title} />}
      <EmptyState
        icon="💞"
        title="Vincule sua conta primeiro"
        description="Você ainda não está vinculado(a) com seu parceiro(a). Vincule sua conta para liberar as funcionalidades do casal."
        action={<LinkButton to="/partner">Vincular parceiro(a)</LinkButton>}
      />
    </>
  );
}
