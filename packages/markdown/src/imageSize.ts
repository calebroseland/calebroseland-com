export type ImageSize = { width: number; height: number };

const ascii = (b: Uint8Array, at: number, length: number): string =>
  String.fromCharCode(...b.subarray(at, at + length));

const pngSize = (b: Uint8Array, v: DataView): ImageSize | null => {
  if (b.length < 24 || ascii(b, 1, 3) !== 'PNG' || ascii(b, 12, 4) !== 'IHDR') {
    return null;
  }
  return { width: v.getUint32(16), height: v.getUint32(20) };
};

const gifSize = (b: Uint8Array, v: DataView): ImageSize | null => {
  if (b.length < 10 || ascii(b, 0, 3) !== 'GIF') {
    return null;
  }
  return { width: v.getUint16(6, true), height: v.getUint16(8, true) };
};

// Start-of-frame markers; C4 (DHT), C8 (JPG) and CC (DAC) share the range but carry no size.
const isFrame = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

const APP1 = 0xe1;
const ORIENTATION = 0x0112;

/** The Exif orientation in an APP1 segment starting at `at`, or 1 (as stored). */
const exifOrientation = (b: Uint8Array, v: DataView, at: number): number => {
  if (ascii(b, at + 4, 4) !== 'Exif') {
    return 1;
  }
  const tiff = at + 10;
  const little = ascii(b, tiff, 2) === 'II';
  const ifd = tiff + v.getUint32(tiff + 4, little);
  const count = v.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (v.getUint16(entry, little) === ORIENTATION) {
      return v.getUint16(entry + 8, little);
    }
  }
  return 1;
};

const jpegSize = (b: Uint8Array, v: DataView): ImageSize | null => {
  if (b[0] !== 0xff || b[1] !== 0xd8) {
    return null;
  }
  let orientation = 1;
  let at = 2;
  while (at + 9 <= b.length) {
    if (b[at] !== 0xff) {
      return null;
    }
    const marker = b[at + 1] ?? 0;
    if (marker === APP1) {
      try {
        orientation = exifOrientation(b, v, at);
      } catch {
        // A damaged Exif block says nothing about the size; read the frame as stored.
      }
    }
    if (isFrame(marker)) {
      const width = v.getUint16(at + 7);
      const height = v.getUint16(at + 5);
      // Orientations 5–8 turn the image on its side, and browsers draw it that way.
      return orientation >= 5 ? { width: height, height: width } : { width, height };
    }
    at += 2 + v.getUint16(at + 2);
  }
  return null;
};

const webpSize = (b: Uint8Array, v: DataView): ImageSize | null => {
  if (b.length < 16 || ascii(b, 0, 4) !== 'RIFF' || ascii(b, 8, 4) !== 'WEBP') {
    return null;
  }
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8X') {
    const u24 = (at: number) => v.getUint16(at, true) | ((b[at + 2] ?? 0) << 16);
    return { width: u24(24) + 1, height: u24(27) + 1 };
  }
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  }
  return null;
};

const svgLength = (value: string | undefined): number | null => {
  const m = value?.trim().match(/^(\d+(?:\.\d+)?)(px)?$/);
  return m?.[1] ? Number(m[1]) : null;
};

const svgSize = (b: Uint8Array): ImageSize | null => {
  // The root element's attributes are near the top; draw.io embeds the whole diagram in one of them.
  const head = new TextDecoder().decode(b.subarray(0, 64 * 1024));
  const start = head.match(/<svg\b((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/);
  if (!start?.[1]) {
    return null;
  }
  const attrs = new Map<string, string>();
  for (const a of start[1].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs.set(a[1] ?? '', a[2] ?? a[3] ?? '');
  }
  const width = svgLength(attrs.get('width'));
  const height = svgLength(attrs.get('height'));
  if (width && height) {
    return { width, height };
  }
  const box = attrs
    .get('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length === 4 && box[2] && box[3]) {
    return { width: box[2], height: box[3] };
  }
  return null;
};

/** An image's intrinsic size from its file header, without decoding it; throws naming the file it can't read. */
export const imageSize = (bytes: Uint8Array, name: string): ImageSize => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let size: ImageSize | null = null;
  try {
    size =
      pngSize(bytes, view)
      ?? jpegSize(bytes, view)
      ?? gifSize(bytes, view)
      ?? webpSize(bytes, view)
      ?? svgSize(bytes);
  } catch {
    // A header cut short reads past the end; that is the same as no header.
  }
  if (!size || !(size.width > 0 && size.height > 0)) {
    throw new Error(`can't read the size of image ${name}`);
  }
  return size;
};
