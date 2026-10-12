// Loads every Sneferu library through require(), resolving by package name the
// way a CommonJS host (the Hekana API) does, then compiles, prepares and renders
// the starter theme. Run after `pnpm build`.
const { createRequire } = require('node:module');
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const req = createRequire(join(__dirname, '..', 'packages', 'sneferu', 'package.json'));
const { formatDiagnostic } = req('@hekana/sneferu-core');
const { compileTheme } = req('@hekana/sneferu-compiler');
const { createDefaultRegistry } = req('@hekana/sneferu-components');
const { prepareArtifact, renderPage, themeTokenCss } = req('@hekana/sneferu-runtime');

const root = join(__dirname, '..', 'packages', 'templates-default', 'theme');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(root).map((p) => ({ path: relative(root, p).split('\\').join('/'), bytes: readFileSync(p) }));

const registry = createDefaultRegistry();
const { artifact, diagnostics } = compileTheme(files, registry);
if (!artifact) {
  console.error(diagnostics.map(formatDiagnostic).join('\n'));
  process.exit(1);
}
const prepared = prepareArtifact(JSON.parse(JSON.stringify(artifact)), registry);
if (!prepared.ok) {
  console.error(prepared.diagnostics.map(formatDiagnostic).join('\n'));
  process.exit(1);
}
const product = { title: 'x', url: '/products/x', price: 1000, compare_at: null, image: { url: 'https://example.com/x.png' } };
const ctx = {
  locale: 'ar', dir: 'rtl', currency: 'EGP', store: { name: 'smoke' }, settings: {}, data: {},
  collections: { featured: { products: [product] } }, products: {},
  translations: artifact.locales.ar || {}, fallbackTranslations: {},
  assetUrl: () => '', imageUrl: (ref) => String(ref),
};
const out = renderPage(prepared.artifact, { template: 'index', ctx, registry });
if (!out.html.includes(`data-hk-theme="${artifact.manifest.id}"`) || !out.html.includes('sf-card') || !themeTokenCss(artifact.manifest)) {
  console.error('cjs smoke: render did not produce the expected markup', out.diagnostics);
  process.exit(1);
}
console.log(`cjs smoke ok: ${artifact.manifest.id}@${artifact.manifest.version} hash ${artifact.hash}`);
