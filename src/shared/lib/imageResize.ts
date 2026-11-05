// Photos from a phone are several MB; shrinking them in the browser before
// upload is what keeps saving a gift fast on mobile data. The old app did a
// second pass on the server (1024px, JPEG 75) — with no server here, the
// browser produces that final format directly.

const MAX_SIDE = 1024;
const QUALITY = 0.75;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Some formats (HEIC on iOS Safari) decode through <img> but not
    // createImageBitmap.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function resizeImage(file: File): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) throw new Error('image too large');

  const source = await decode(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  // JPEG has no transparency: without this, a transparent PNG turns black.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ('close' in source && typeof source.close === 'function') source.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', QUALITY)
  );
}
