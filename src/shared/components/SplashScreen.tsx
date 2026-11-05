import { useEffect, useState } from 'react';

// Full-screen logo shown while the session/app is loading. Waits a moment
// before appearing, so a fast load doesn't flash it on screen.
export default function SplashScreen({ delay = 300 }: { delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4"
      role="status"
      aria-label="Carregando"
    >
      {visible && (
        <div className="anim-fade-up flex flex-col items-center">
          <div className="relative">
            <div
              aria-hidden="true"
              className="anim-breathe absolute -inset-8 rounded-full bg-[var(--color-primary)]/20 blur-2xl"
            />
            <img
              src="/icon-192.png"
              alt=""
              className="anim-logo-pulse relative w-20 h-20 rounded-2xl shadow-lg shadow-black/20 ring-1 ring-[var(--color-primary)]/30"
            />
          </div>
          <p className="font-display text-xl font-bold text-brand mt-6">Gifts of Love</p>
          <div className="flex gap-1.5 mt-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="anim-logo-pulse w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/70"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
