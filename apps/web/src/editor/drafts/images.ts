import type { Bundle } from '@crc/github-client';
import { ImageTooLargeError, resizeImage, UnsupportedImageError } from '../document/resize.ts';
import type { Buffer, BufferAsset, BufferController } from './buffer.ts';

export type AddedImage =
  | { ok: true; asset: BufferAsset }
  /** `message` explains a file the editor cannot take (wrong type, too large). */
  | { ok: false; reason: 'rejected'; message: string }
  | { ok: false; reason: 'failed'; error: unknown };

/** Resizes an image and adds it to the buffer, waiting for alt text before it can be saved. */
export const addImage = async (controller: BufferController, file: File): Promise<AddedImage> => {
  try {
    const img = await resizeImage(file);
    const asset: BufferAsset = {
      name: img.name,
      type: img.type,
      blob: img.blob,
      objectUrl: URL.createObjectURL(img.blob),
      alt: '',
      width: img.width,
      height: img.height,
    };
    controller.addAsset(asset);
    return { ok: true, asset };
  } catch (error) {
    if (error instanceof UnsupportedImageError || error instanceof ImageTooLargeError) {
      return { ok: false, reason: 'rejected', message: error.message };
    }
    return { ok: false, reason: 'failed', error };
  }
};

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

/** Where the editor can show an image the markdown names relative to its entry: a pending image's
    object URL, else the file as loaded with the bundle. Anything else is shown as written. */
export const previewSrc = (src: string, buffer: Buffer, files: Bundle['files']): string => {
  if (/^([a-z][a-z\d+.-]*:|\/)/i.test(src)) {
    return src;
  }
  const name = src.replace(/^\.\//, '');
  const pending = buffer.assets.find((a) => a.name === name);
  if (pending) {
    return pending.objectUrl;
  }
  const file = files.find((f) => f.path === `${buffer.dir}/${name}`);
  const type = MIME[name.split('.').pop()?.toLowerCase() ?? ''];
  if (!file || !type) {
    return src;
  }
  return file.encoding === 'base64'
    ? `data:${type};base64,${file.content}`
    : `data:${type};charset=utf-8,${encodeURIComponent(file.content)}`;
};
