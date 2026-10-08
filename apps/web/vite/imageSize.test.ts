import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageSize } from './imageSize.ts';

const bytes = (...parts: Array<string | number[]>): Uint8Array =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );
const u16be = (n: number): number[] => [n >> 8, n & 0xff];
const u16le = (n: number): number[] => [n & 0xff, n >> 8];
const u24le = (n: number): number[] => [n & 0xff, (n >> 8) & 0xff, n >> 16];
const u32be = (n: number): number[] => [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const u32le = (n: number): number[] => u32be(n).reverse();
const text = (s: string): Uint8Array => new TextEncoder().encode(s);

const png = (w: number, h: number) =>
  bytes([0x89], 'PNG\r\n', [0x1a, 0x0a], u32be(13), 'IHDR', u32be(w), u32be(h), [8, 2, 0, 0, 0]);

// SOI, an APP0 segment to skip, then a start-of-frame marker carrying the size.
const jpeg = (sof: number, w: number, h: number) =>
  bytes(
    [0xff, 0xd8],
    [0xff, 0xe0],
    u16be(16),
    'JFIF',
    [0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    [0xff, sof],
    u16be(17),
    [8],
    u16be(h),
    u16be(w),
    [3],
  );

const riff = (chunk: string, body: number[]) =>
  bytes('RIFF', u32le(4 + 8 + body.length), 'WEBP', chunk, u32le(body.length), body);

describe('imageSize', () => {
  it('reads a PNG header', () => {
    expect(imageSize(png(640, 480), 'a.png')).toEqual({ width: 640, height: 480 });
  });

  it('reads a baseline and a progressive JPEG past other segments', () => {
    expect(imageSize(jpeg(0xc0, 1280, 800), 'a.jpg')).toEqual({ width: 1280, height: 800 });
    expect(imageSize(jpeg(0xc2, 390, 3600), 'b.jpg')).toEqual({ width: 390, height: 3600 });
  });

  it('reads a GIF header', () => {
    expect(imageSize(bytes('GIF89a', u16le(300), u16le(200)), 'a.gif')).toEqual({
      width: 300,
      height: 200,
    });
  });

  it('reads lossy, lossless, and extended (animated) WebP', () => {
    const vp8 = [0, 0, 0, 0x9d, 0x01, 0x2a, ...u16le(800), ...u16le(600)];
    expect(imageSize(riff('VP8 ', vp8), 'a.webp')).toEqual({ width: 800, height: 600 });
    // VP8L packs width-1 and height-1 in 14 bits each after a 0x2f signature.
    const w = 1919;
    const h = 599;
    const bits = w | (h << 14);
    const vp8l = [0x2f, bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, bits >>> 24];
    expect(imageSize(riff('VP8L', vp8l), 'b.webp')).toEqual({ width: 1920, height: 600 });
    const vp8x = [0x12, 0, 0, 0, ...u24le(959), ...u24le(607)];
    expect(imageSize(riff('VP8X', vp8x), 'c.webp')).toEqual({ width: 960, height: 608 });
  });

  it('reads an SVG from width and height, or from its viewBox', () => {
    expect(
      imageSize(
        text(
          '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1201px" height="581px" viewBox="-0.5 -0.5 1201 581">',
        ),
        'a.svg',
      ),
    ).toEqual({ width: 1201, height: 581 });
    expect(imageSize(text('<svg viewBox="0 0 1200 564" width="100%">'), 'b.svg')).toEqual({
      width: 1200,
      height: 564,
    });
    expect(imageSize(text('<svg content="&lt;b&gt; > c" viewBox="0,0,24,12">'), 'c.svg')).toEqual({
      width: 24,
      height: 12,
    });
  });

  it('reads a real fixture file', () => {
    const file = new URL(
      '../fixtures/content/posts/2026/09-18-hello-placeholder/hero.png',
      import.meta.url,
    );
    expect(imageSize(readFileSync(file), 'hero.png')).toEqual({ width: 64, height: 40 });
  });

  it('names the file it cannot read', () => {
    expect(() => imageSize(text('not an image'), 'posts/x/broken.png')).toThrowError(
      /posts\/x\/broken\.png/,
    );
    expect(() => imageSize(text('<svg width="100%">'), 'd.svg')).toThrowError(/d\.svg/);
    expect(() => imageSize(bytes([0xff, 0xd8, 0xff, 0xe0], u16be(400)), 'cut.jpg')).toThrowError(
      /cut\.jpg/,
    );
  });
});
