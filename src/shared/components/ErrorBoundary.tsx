import { Component, type ReactNode } from 'react';
import { Button } from './ui';

// Catches a render error in one page so it shows a message instead of
// blanking the whole app. Layout keys it on the route, so navigating to
// another page clears the error.
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Page crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="text-center px-4 py-12 sm:py-16 border border-dashed border-[var(--color-border)] rounded-2xl">
        <p className="font-display text-[var(--color-ink)] text-sm font-medium">
          Algo deu errado nesta tela
        </p>
        <p className="text-[var(--color-muted)] text-sm mt-1 max-w-xs mx-auto">
          Seus dados estão salvos. Tente de novo ou recarregue a página.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => this.setState({ error: null })}>
            Tentar de novo
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      </div>
    );
  }
}
