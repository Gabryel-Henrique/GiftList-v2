import { CELEBRATE_PATTERN, haptic } from './haptics';

// A short burst of confetti or hearts for the moments that matter (gift
// bought, date confirmed, date done, couple linked). Plain DOM + CSS
// animation (see .celebrate-piece in index.css), no library. Skipped when
// the system asks for reduced motion.
const CONFETTI_COLORS = ['#9B5CFF', '#FF4FA3', '#FFC940', '#34D8A8', '#5FB4FF'];
const HEARTS = ['💖', '💕', '💗', '💞'];

export function celebrate(kind: 'confetti' | 'hearts' = 'confetti') {
  haptic(CELEBRATE_PATTERN);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'celebrate-layer';
  const count = kind === 'hearts' ? 18 : 36;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    piece.className = 'celebrate-piece';
    const x = (Math.random() - 0.5) * 2; // -1..1: spread to both sides
    piece.style.setProperty('--x', `${x * 46}vw`);
    piece.style.setProperty('--y', `${-(35 + Math.random() * 45)}vh`);
    piece.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    if (kind === 'hearts') {
      piece.textContent = HEARTS[i % HEARTS.length];
      piece.style.fontSize = `${16 + Math.random() * 14}px`;
    } else {
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.width = `${6 + Math.random() * 5}px`;
      piece.style.height = `${8 + Math.random() * 8}px`;
      piece.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    }
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1800);
}
