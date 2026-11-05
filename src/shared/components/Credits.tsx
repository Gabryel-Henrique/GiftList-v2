import { GitHubIcon } from './icons';

// Author credit. Only on Login and Perfil, so it doesn't eat screen space
// at the bottom of every page on the phone.
export function Credits() {
  return (
    <footer className="mt-10 flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]/80">
      <span>
        Desenvolvido por <span className="font-medium text-[var(--color-muted)]">Gabryel Henrique</span>
      </span>
      <a
        href="https://github.com/Gabryel-Henrique"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub de Gabryel Henrique"
        title="GitHub de Gabryel Henrique"
        className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
      >
        <GitHubIcon />
      </a>
    </footer>
  );
}
