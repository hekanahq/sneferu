// Bundles the extension (client), the language server and the Sneferu CLI with esbuild.
//   dist/extension.js   the VS Code side (CommonJS, vscode external)
//   dist/server.js      the language server (Node, IPC)
//   dist/cli/cli.mjs    the CLI used for preview, build, format, push and login
// The SDK packages are bundled from source, so the extension always matches this checkout.
import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const src = (p) => join(pkg, '..', p, 'src', 'index.ts');
const alias = {
  '@hekana/sneferu-core': src('core'), '@hekana/sneferu-compiler': src('compiler'),
  '@hekana/sneferu-runtime': src('runtime'), '@hekana/sneferu-components': src('components'),
  '@hekana/prettier-plugin-sneferu': src('prettier-plugin-sneferu'),
};
/** Bare `prettier` (the plugin's `doc` builders) → the standalone build, which bundles cleanly. */
const standalonePrettier = {
  name: 'standalone-prettier',
  setup(b) { b.onResolve({ filter: /^prettier$/ }, (args) => b.resolve('prettier/standalone', { kind: args.kind, resolveDir: args.resolveDir })); },
};
const watch = process.argv.includes('--watch');
const common = { bundle: true, platform: 'node', mainFields: ['module', 'main'], target: 'node20', sourcemap: false, minify: !watch, legalComments: 'none', logLevel: 'info' };
const configs = [
  { ...common, entryPoints: [join(pkg, 'src/client/extension.ts')], outfile: join(pkg, 'dist/extension.js'), format: 'cjs', external: ['vscode'], alias },
  // the server formats in-process with Prettier's standalone build: no dynamic plugin loading
  { ...common, entryPoints: [join(pkg, 'src/server/server.ts')], outfile: join(pkg, 'dist/server.js'), format: 'cjs', alias, plugins: [standalonePrettier] },
  {
    ...common, entryPoints: [join(pkg, '..', 'sneferu', 'src', 'cli.ts')], outfile: join(pkg, 'dist/cli/cli.mjs'), format: 'esm', alias,
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  },
];
if (watch) for (const c of configs) await (await context(c)).watch();
else await Promise.all(configs.map((c) => build(c)));
