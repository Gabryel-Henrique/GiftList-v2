import { EmptyState, LinkButton } from './ui';

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Página não encontrada."
      action={<LinkButton to="/">Voltar ao início</LinkButton>}
    />
  );
}
