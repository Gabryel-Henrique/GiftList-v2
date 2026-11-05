import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'app:theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#120E1F', light: '#FAF7FF' };

function read<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// The saved choice, or the system preference when the user never picked one
// (same default as the old app).
export function getStoredTheme(): Theme {
  const saved = read(() => localStorage.getItem(THEME_KEY), null);
  if (saved === 'light' || saved === 'dark') return saved;
  return read(() => window.matchMedia('(prefers-color-scheme: light)').matches, false)
    ? 'light'
    : 'dark';
}

let current: Theme = 'dark';
const listeners = new Set<() => void>();

// Sets the data-theme attribute the CSS light-mode overrides key off of
// (see index.css) and the browser's theme-color. Called once in main.tsx
// before the first render, so the page never flashes the wrong theme.
export function applyTheme(theme: Theme) {
  current = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  listeners.forEach((listener) => listener());
}

export function toggleTheme() {
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  read(() => localStorage.setItem(THEME_KEY, next), undefined);
  applyTheme(next);
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current
  );
}
