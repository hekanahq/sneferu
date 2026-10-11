import { describe, it, expect } from 'vitest';
import { pickVariant, srcsetOf } from './image-src';

const img = { url: 'https://cdn.x/p.png', srcset: 'https://cdn.x/p.w400.webp 400w, https://cdn.x/p.w800.webp 800w, https://cdn.x/p.w1600.webp 1600w' };

describe('srcsetOf', () => {
  it('passes the image srcset through', () => {
    expect(srcsetOf(img)).toBe(img.srcset);
    expect(srcsetOf({ url: '/hk2/a/x.png', srcset: '/hk2/a/x.w400.webp 400w' })).toBe('/hk2/a/x.w400.webp 400w');
  });
  it('is empty without a srcset, for a bare url and for junk', () => {
    for (const r of [{ url: 'https://cdn.x/p.png' }, 'https://cdn.x/p.png', null, undefined, 5, { srcset: 7 }]) expect(srcsetOf(r)).toBe('');
  });
  it('drops unsafe and malformed candidates', () => {
    const bad = { url: 'https://cdn.x/p.png', srcset: 'javascript:alert(1) 400w, http://cdn.x/a.webp 500w, https://cdn.x/ok.webp 800w, https://cdn.x/z.webp 0w, https://cdn.x/z.webp 4001w, https://cdn.x/n.webp 12x, https://cdn.x/q.webp' };
    expect(srcsetOf(bad)).toBe('https://cdn.x/ok.webp 800w');
    expect(srcsetOf({ srcset: 'data:image/png;base64,AAAA 400w' })).toBe('');
  });
});

describe('pickVariant', () => {
  it('takes the smallest variant that is wide enough', () => {
    expect(pickVariant(img, 300)).toBe('https://cdn.x/p.w400.webp');
    expect(pickVariant(img, 400)).toBe('https://cdn.x/p.w400.webp');
    expect(pickVariant(img, 401)).toBe('https://cdn.x/p.w800.webp');
    expect(pickVariant(img, 900)).toBe('https://cdn.x/p.w1600.webp');
  });
  it('takes the largest variant when the width is beyond all of them', () => {
    expect(pickVariant(img, 5000)).toBe('https://cdn.x/p.w1600.webp');
  });
  it('falls back to the image url without a srcset or without a width, never inventing one', () => {
    expect(pickVariant({ url: 'https://cdn.x/p.png' }, 400)).toBe('https://cdn.x/p.png');
    expect(pickVariant('https://cdn.x/p.png', 400)).toBe('https://cdn.x/p.png');
    expect(pickVariant(img)).toBe('https://cdn.x/p.png');
    expect(pickVariant(null, 400)).toBe('');
  });
  it('orders candidates whatever order the host listed them in', () => {
    expect(pickVariant({ url: 'u', srcset: '/b.webp 800w, /a.webp 400w' }, 500)).toBe('/b.webp');
  });
  it('every result is one of the urls in the image object', () => {
    const urls = new Set([img.url, ...img.srcset.split(', ').map((s) => s.split(' ')[0])]);
    for (const w of [1, 100, 400, 640, 1000, 1600, 3000, NaN]) expect(urls.has(pickVariant(img, w))).toBe(true);
  });
});
