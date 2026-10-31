import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localizeDevImages, resolveDevImage } from './dev-images';
import { safeImageSrc } from '@hekana/sneferu-components';

function project() {
  const root = mkdtempSync(join(tmpdir(), 'snf-img-'));
  mkdirSync(join(root, '.sneferu-dev', 'images'), { recursive: true });
  mkdirSync(join(root, 'photos'));
  writeFileSync(join(root, '.sneferu-dev', 'images', 'a.png'), 'x');
  writeFileSync(join(root, 'photos', 'b.jpg'), 'x');
  writeFileSync(join(root, 'secret.txt'), 'x');
  return { root, dataDir: join(root, '.sneferu-dev') };
}

describe('dev images', () => {
  it('rewrites project files to the dev route and warns for what would be dropped', () => {
    const p = project();
    const warns: string[] = [];
    const out = localizeDevImages({
      products: [{ image: { url: 'images/a.png' } }, { image: 'photos/b.jpg' }, { image: 'http://x.test/a.png' }, { image: 'missing.png' }, { image: 'https://ok.test/a.png' }, { image: '/root.png' }, { image: '../../etc/a.png' }],
    }, p, (m) => warns.push(m)) as { products: { image: unknown }[] };
    const imgs = out.products.map((x) => (typeof x.image === 'string' ? x.image : (x.image as { url: string }).url));
    expect(imgs.slice(0, 2)).toEqual(['/__dev-images/.sneferu-dev/images/a.png', '/__dev-images/photos/b.jpg']);
    expect(imgs.slice(4, 6)).toEqual(['https://ok.test/a.png', '/root.png']);
    expect(warns).toHaveLength(3);
    expect(warns[0]).toContain('http://x.test/a.png');
    expect(warns[1]).toContain('missing.png');
    // every rewritten value passes the unchanged production check
    expect(safeImageSrc(imgs[0]!)).toBe(true);
    // production check stays strict
    expect(safeImageSrc('images/a.png')).toBe(false);
    expect(safeImageSrc('http://x.test/a.png')).toBe(false);
  });
  it('serves only image files inside the project', () => {
    const p = project();
    expect(resolveDevImage(p.root, 'photos/b.jpg')).toBe(join(p.root, 'photos', 'b.jpg'));
    expect(resolveDevImage(p.root, '.sneferu-dev/images/a.png')).toBeDefined();
    expect(resolveDevImage(p.root, 'secret.txt')).toBeUndefined();
    expect(resolveDevImage(p.root, '../x.png')).toBeUndefined();
    expect(resolveDevImage(p.root, '%2e%2e/x.png')).toBeUndefined();
    expect(resolveDevImage(p.root, 'photos%5c..%5cx.png')).toBeUndefined();
  });
});
