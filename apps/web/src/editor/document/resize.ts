/* Client-side downscale before commit. Phone photos are 4–6 MB; posts need ~250 KB. */

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
export const MAX_EDGE = 1600;
const MAX_BYTES = 5 * 1024 * 1024;

export function targetSize(
  width: number,
  height: number,
  maxEdge = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export class UnsupportedImageError extends Error {
  constructor(type: string) {
    super(
      `That file type isn't supported. Use JPEG, PNG, WebP, or AVIF. (got ${type || 'unknown'})`,
    );
    this.name = 'UnsupportedImageError';
  }
}
export class ImageTooLargeError extends Error {
  constructor() {
    super('Image is over 5 MB after resizing.');
    this.name = 'ImageTooLargeError';
  }
}

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  type: string;
  name: string;
};

/** GIFs are passed through (canvas would flatten animation); everything else is drawn to a canvas at ≤ MAX_EDGE. */
export async function resizeImage(file: File, maxEdge = MAX_EDGE): Promise<ResizedImage> {
  if (!IMAGE_TYPES.has(file.type)) throw new UnsupportedImageError(file.type);
  if (file.type === 'image/gif') {
    if (file.size > MAX_BYTES) throw new ImageTooLargeError();
    return { blob: file, width: 0, height: 0, type: file.type, name: file.name };
  }
  const bitmap = await createImageBitmap(file);
  const { width, height } = targetSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  if (!blob) throw new Error('Could not encode image');
  if (blob.size > MAX_BYTES) throw new ImageTooLargeError();
  const ext = type === 'image/png' ? 'png' : 'jpg';
  const base =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .toLowerCase() || 'image';
  return { blob, width, height, type, name: `${base}.${ext}` };
}
