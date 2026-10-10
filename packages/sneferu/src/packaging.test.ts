import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../${name}/package.json`, import.meta.url)), 'utf8'));

describe('library packages ship ESM and CommonJS (the Hekana API is CommonJS)', () => {
  it.each(['core', 'compiler', 'runtime', 'components'])('%s declares both entry points', (name) => {
    const p = pkg(name);
    expect(p.main).toBe('./dist/index.cjs');
    expect(p.module).toBe('./dist/index.js');
    expect(p.types).toBe('./dist/index.d.ts');
    expect(p.exports['.'].import).toEqual({ types: './dist/index.d.ts', default: './dist/index.js' });
    expect(p.exports['.'].require).toEqual({ types: './dist/index.d.cts', default: './dist/index.cjs' });
    expect(p.scripts.build).toBe('tsup src/index.ts --format esm,cjs --dts --clean');
  });
});
