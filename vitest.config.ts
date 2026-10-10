import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const src = (p: string) => fileURLToPath(new URL(`./packages/${p}/src/index.ts`, import.meta.url));
export default defineConfig({
  resolve: { alias: {
    '@hekana/sneferu-core': src('core'), '@hekana/sneferu-compiler': src('compiler'),
    '@hekana/sneferu-runtime': src('runtime'), '@hekana/sneferu-components': src('components'),
  } },
  test: { include: ['packages/*/src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
