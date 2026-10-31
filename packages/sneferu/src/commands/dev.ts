import { createServer, type Server, type ServerResponse } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { watch } from 'chokidar';
import { APP_BLOCKS, escapeText, formatDiagnostic } from '@hekana/sneferu-core';
import { compileTheme, type Artifact } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';
import { DEV_IMAGE_ROUTE, DEV_IMAGE_TYPES, localizeDevImages, resolveDevImage } from '../dev-images';
import { pickSampleData, sampleContext, withSampleData } from '../sample-data';
import { appBlockPlaceholder, checkoutEmbedPlaceholder, devPage } from '../dev-page';
import { controllersBundle, devHostScript } from '../dev-controllers';
import { RELATED_COLLECTION, plainNotFound, relatedProducts, resolveDevRoute, splitLocale } from '../dev-routes';

const TYPES: Record<string, string> = { '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };

/** Resolve a URL-supplied asset path inside `assets`; undefined when unsafe. */
export function resolveAsset(assets: string, raw: string): string | undefined {
  let rel = raw;
  // decode repeatedly so double-encoded dots cannot slip through
  for (let i = 0; i < 3 && /%/.test(rel); i++) {
    try { rel = decodeURIComponent(rel); } catch { return undefined; }
  }
  if (/%/.test(rel) || rel.includes('\0') || rel.includes('\\') || rel.startsWith('/')) return undefined;
  if (rel.split('/').some((s) => s === '..')) return undefined;
  const base = resolve(assets);
  const file = resolve(base, rel);
  return file.startsWith(base + sep) ? file : undefined;
}

/** ?locale= when the theme ships it, otherwise the theme's default locale. */
export function pickLocale(requested: string | null, manifest: { defaultLocale: 'ar' | 'en'; locales: readonly string[] }): 'ar' | 'en' {
  return (requested === 'ar' || requested === 'en') && manifest.locales.includes(requested) ? requested : manifest.defaultLocale;
}

/** The sample data file for this run: `--data` when given, else `.sneferu-dev/data.json` when it exists. */
export function sampleDataPath(root: string, data?: string): string | undefined {
  if (data) return resolve(data);
  const p = join(root, '.sneferu-dev', 'data.json');
  return existsSync(p) ? p : undefined;
}

/** Read on every request, so editing the file and reloading the page shows it. A bad file is reported, not fatal. */
export function readSampleData(path: string | undefined): { raw: unknown; error?: string } {
  if (!path) return { raw: undefined };
  try { return { raw: JSON.parse(readFileSync(path, 'utf8')) }; } catch (e) { return { raw: undefined, error: `${path}: ${(e as Error).message}` }; }
}

export async function startDev(dir: string, port: number, opts: { data?: string } = {}): Promise<{ server: Server; close: () => void }> {
  const root = resolve(dir);
  const dataPath = sampleDataPath(root, opts.data);
  const registry = createDefaultRegistry();
  let artifact: Artifact | undefined;
  let problems = '';
  const clients = new Set<ServerResponse>();
  const warned = new Set<string>();
  const warnOnce = (m: string) => { if (!warned.has(m)) { warned.add(m); console.warn(`Sneferu dev: ${m}`); } };
  const compile = () => {
    try {
      const r = compileTheme(loadTheme(root), registry);
      artifact = r.artifact;
      problems = r.artifact ? '' : r.diagnostics.map(formatDiagnostic).join('\n');
    } catch (e) { artifact = undefined; problems = (e as Error).message; }
  };
  compile();
  const themeCss = () => (existsSync(join(root, 'assets')) ? readdirSync(join(root, 'assets')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(root, 'assets', f), 'utf8')).join('\n') : '');
  const errorPage = (msg: string) => `<!doctype html><meta charset="utf-8"><title>Sneferu: errors</title><pre style="padding:24px;font:14px/1.5 monospace;white-space:pre-wrap">${escapeText(msg)}</pre><script>new EventSource('/__events').onmessage=e=>{if(e.data==='reload')location.reload()}</script>`;

  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/__events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
        res.write(': ok\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      // WHATWG URL folds %2e%2e dot-segments, so take the raw path for assets
      const rawPath = (req.url ?? '/').split(/[?#]/)[0] ?? '/';
      if (rawPath.startsWith('/__assets/')) {
        const file = resolveAsset(join(root, 'assets'), rawPath.slice('/__assets/'.length));
        if (!file || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(file)); return;
      }
      if (rawPath.startsWith(DEV_IMAGE_ROUTE)) {
        const file = resolveDevImage(root, rawPath.slice(DEV_IMAGE_ROUTE.length));
        if (!file || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': DEV_IMAGE_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(readFileSync(file)); return;
      }
      if (rawPath === '/__controllers.js') { const js = controllersBundle(); if (!js) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': 'text/javascript' }).end(js); return; }
      if (rawPath === '/checkout/embed' || rawPath === '/en/checkout/embed' || rawPath === '/ar/checkout/embed') {
        const loc = rawPath.startsWith('/en/') ? 'en' : rawPath.startsWith('/ar/') ? 'ar' : (artifact?.manifest.defaultLocale ?? 'ar');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(checkoutEmbedPlaceholder(loc)); return;
      }
      const framed = /^(?:\/(en|ar))?(\/hk2\/app-block\/[a-z0-9-]+\/[a-z0-9-]+)$/.exec(rawPath);
      const framedDef = framed ? APP_BLOCKS.find((d) => d.path === framed[2]) : undefined;
      if (framed && framedDef) {
        const loc = (framed[1] as 'en' | 'ar' | undefined) ?? artifact?.manifest.defaultLocale ?? 'ar';
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(appBlockPlaceholder(loc, framedDef.name)); return;
      }
      if (!artifact) { res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' }).end(errorPage(problems)); return; }
      if (rawPath === '/favicon.ico') { res.writeHead(404).end(); return; }
      const split = splitLocale(url.pathname);
      const cookie = /(?:^|;\s*)sn_locale=(ar|en)\b/.exec(req.headers.cookie ?? '')?.[1];
      const explicit = url.searchParams.get('locale') ?? split.locale;
      // an unprefixed link follows the language of the page you came from (cookie), else the theme's default
      const locale = pickLocale(explicit ?? cookie ?? null, artifact.manifest);
      const sample = readSampleData(dataPath);
      if (sample.error) { res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' }).end(errorPage(`sample data: ${sample.error}`)); return; }
      let ctx = withSampleData(sampleContext(locale, artifact.locales, artifact.manifest.defaultLocale, { responsive: true, devLinks: true }), pickSampleData(dataPath ? localizeDevImages(sample.raw, { root, dataDir: dirname(dataPath) }, warnOnce) : sample.raw, locale));
      let template = 'index';
      let status = 200;
      let scope: Record<string, unknown> = {};
      let path = split.path;
      if (url.pathname.startsWith('/__template/')) {
        try { template = decodeURIComponent(url.pathname.slice('/__template/'.length)); } catch { template = ''; }
      } else {
        const route = resolveDevRoute({ path: split.path, query: url.searchParams, locale, defaultLocale: artifact.manifest.defaultLocale, products: ctx.products, collections: ctx.collections });
        if (plainNotFound(route, artifact.templates)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not found'); return; }
        ({ template, status, scope, path } = route);
        // like the host: on a product page `collection('related')` is the product's category minus itself
        if (scope.product && !Object.hasOwn(ctx.collections, RELATED_COLLECTION)) {
          ctx = { ...ctx, collections: { ...ctx.collections, [RELATED_COLLECTION]: { products: relatedProducts(scope.product, ctx.products) } } };
        }
      }
      const other = locale === 'ar' ? 'en' : 'ar';
      const keep = new URLSearchParams(url.searchParams); keep.delete('locale');
      const alternateUrl = artifact.manifest.locales.includes(other) ? `/${other}${path === '/' ? '' : path}${keep.size ? `?${keep}` : ''}` : '';
      const r = renderPage(artifact, { template, ctx, registry, scope, request: { path }, localization: { alternateUrl } });
      const body = r.html || `<pre style="padding:24px;white-space:pre-wrap">${escapeText(r.diagnostics.map(formatDiagnostic).join('\n') || 'empty page')}</pre>`;
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...(explicit ? { 'set-cookie': `sn_locale=${locale}; Path=/; SameSite=Lax` } : {}) })
        .end(devPage(artifact, { body, locale, css: r.css, themeCss: themeCss(), reloadScript: true, ...(r.controllers.length ? { hostScript: devHostScript(locale) } : {}) }));
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
      res.end(errorPage((e as Error).message));
    }
  });

  let timer: NodeJS.Timeout | undefined;
  const watcher = watch(root, { ignored: (p) => /(^|[/\\])(node_modules|dist|\.git|\.sneferu-dev)([/\\]|$)/.test(p), ignoreInitial: true })
    .on('all', () => { clearTimeout(timer); timer = setTimeout(() => { compile(); for (const c of clients) c.write('data: reload\n\n'); }, 120); });

  await new Promise<void>((ok) => server.listen(port, '127.0.0.1', ok));
  const addr = server.address();
  const actual = typeof addr === 'object' && addr ? addr.port : port;
  const other = artifact?.manifest.locales.filter((l) => l !== artifact?.manifest.defaultLocale) ?? [];
  const hint = artifact ? `  (${[artifact.manifest.defaultLocale, ...other.map((l) => `/?locale=${l}`)].join(' · ')})` : '';
  console.log(`Sneferu dev → http://127.0.0.1:${actual}${hint}${dataPath ? `\nSample data: ${dataPath}` : ''}${artifact ? '' : '\n' + problems}`);
  return { server, close: () => { clearTimeout(timer); void watcher.close(); for (const c of clients) c.end(); server.close(); } };
}

export async function runDev(dir: string, port: number, opts: { data?: string } = {}): Promise<void> {
  await startDev(dir, port, opts);
}
