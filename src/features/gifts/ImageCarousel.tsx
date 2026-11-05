import { useRef, useState } from 'react';
import type { GiftImage } from './types';

// Native horizontal scroll with snap: swipes with the finger on phones,
// arrows on desktop. Arrows and dots only when there's more than one image.
export function ImageCarousel({ images, alt }: { images: GiftImage[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(next: number) {
    const el = track.current;
    if (!el) return;
    const target = (next + images.length) % images.length;
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="relative h-[180px] bg-[var(--color-surface-alt)] group">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
        className="flex h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <img
            key={image.id}
            src={image.url}
            alt={images.length > 1 ? `${alt} (${i + 1} de ${images.length})` : alt}
            loading="lazy"
            className="w-full h-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <ArrowButton side="left" onClick={() => go(index - 1)} />
          <ArrowButton side="right" onClick={() => go(index + 1)} />
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((image, i) => (
              <span
                key={image.id}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Imagem anterior' : 'Próxima imagem'}
      className={`absolute top-1/2 -translate-y-1/2 ${
        side === 'left' ? 'left-2' : 'right-2'
      } w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d={side === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  );
}
