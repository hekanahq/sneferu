import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

describe('bundle size budget', () => {
  it('index bundle is <= 12 KB min+gzip, with no banned APIs', async () => {
    const req = createRequire(import.meta.url);
    const esbuild = req(req.resolve('esbuild', { paths: [req.resolve('tsup')] }));
    const out = await esbuild.build({
      entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
      bundle: true, minify: true, format: 'esm', write: false, target: 'es2020',
    });
    const code: string = out.outputFiles[0].text;
    expect(gzipSync(code).length).toBeLessThanOrEqual(12 * 1024);
    for (const banned of ['eval(', 'new Function', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'fetch(', 'XMLHttpRequest']) {
      expect(code.includes(banned), banned).toBe(false);
    }
  });
});
