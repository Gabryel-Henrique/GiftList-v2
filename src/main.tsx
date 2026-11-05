import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyTheme, getStoredTheme } from './shared/lib/theme.ts';
import './index.css';

// Before the first render, so the page never flashes the wrong theme.
applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
