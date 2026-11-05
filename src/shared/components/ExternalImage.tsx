import { useState } from 'react';

// An image from a URL someone pasted (restaurants, movies). Hidden if the
// link is broken, instead of showing the browser's broken-image icon. No
// referrer, since many sites block hotlinking based on it.
export function ExternalImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
