import { describe, it, expect } from 'vitest';
import { sampleContext, sampleProduct } from './sample-data';

describe('responsive sample images', () => {
  it('carry a srcset in the dev preview and none by default (the 0.2 golden)', () => {
    expect((sampleProduct('en', 0, true).image as { srcset?: string }).srcset).toContain('400w');
    expect(sampleProduct('en', 0).image).toEqual({ url: 'https://placehold.co/600x600/png?text=1' });
  });
  it('imageUrl picks a listed variant', () => {
    const ctx = sampleContext('en', {}, 'en', { responsive: true });
    const image = sampleProduct('en', 0, true).image;
    expect(ctx.imageUrl(image, 300)).toBe('https://placehold.co/400x400/png?text=1');
    expect(ctx.imageUrl(image, 9000)).toBe('https://placehold.co/1600x1600/png?text=1');
    expect(ctx.imageUrl({ url: 'https://x/a.png' }, 400)).toBe('https://x/a.png?w=400');
  });
});
