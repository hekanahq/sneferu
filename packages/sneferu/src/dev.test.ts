import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { request } from 'node:http';
import { devPage, tokenCss } from './dev-page';
import { pickLocale, resolveAsset, startDev } from './commands/dev';
import { readFileSync } from 'node:fs';

const artifact = { manifest: { id: 'esports', defaultLocale: 'ar', tokens: { colors: { primary: '#A3E635', secondary: '#2E1065', accent: '#B45309', background: '#120A1F', text: '#F5F3FF' }, layout: { contentWidth: '1200px' } } } };

describe('dev page', () => {
  it('emits token variables mapped onto the platform names', () => {
    const css = tokenCss(artifact.manifest as never);
    expect(css).toContain('[data-hk-theme="esports"]{');
    expect(css).toContain('--hk-color-primary:#A3E635');
    expect(css).toContain('--hk-content-width:1200px');
    expect(css).toContain('--color-primary:var(--hk-color-primary)');
    expect(css).toContain('background:var(--hk-color-background);color:var(--hk-color-text)');
  });
  it('builds a full RTL document with reload script only in dev', () => {
    const html = devPage(artifact as never, { body: '<div data-hk-theme="esports">x</div>', locale: 'ar', css: '.a{}', themeCss: '.b{}', reloadScript: true });
    expect(html.startsWith('<!doctype html><html lang="ar" dir="rtl">')).toBe(true);
    expect(html).toContain('<style>.a{}</style>');
    expect(html).toContain("new EventSource('/__events')");
    expect(devPage(artifact as never, { body: '', locale: 'en', css: '', themeCss: '', reloadScript: false })).not.toContain('EventSource');
  });
});

describe('asset path resolution', () => {
  const assets = resolve('/tmp/x/assets');
  it('accepts plain paths', () => expect(resolveAsset(assets, 'a/b.css')).toBe(join(assets, 'a/b.css')));
  it.each(['../secret', '%2e%2e/secret', '%2E%2E%2Fsecret', 'a/../../b', '..\\b', 'a%5c..%5cb', '%00x', '/etc/passwd', '%zz'])('rejects %s', (p) => {
    expect(resolveAsset(assets, p)).toBeUndefined();
  });
});

function get(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((ok, bad) => {
    const r = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => ok({ status: res.statusCode ?? 0, body: b }));
    });
    r.on('error', bad); r.end();
  });
}

describe('dev server', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snf-dev-'));
  const here = dirname(fileURLToPath(import.meta.url));
  const starter = resolve(here, '../starter');
  cpSync(starter, dir, { recursive: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'assets', 'a.css'), '.z{}');
  writeFileSync(join(dirname(dir), 'snf-secret.txt'), 'secret');
  let server: Server;
  let port = 0;
  afterAll(() => server?.close());
  it('serves pages, locale, assets, and rejects traversal', async () => {
    const s = await startDev(dir, 0);
    server = s.server; port = (server.address() as { port: number }).port;
    expect((await get(port, '/')).body).toContain('dir="ltr"');
    expect((await get(port, '/?locale=ar')).body).toContain('dir="rtl"');
    expect((await get(port, '/__assets/a.css')).body).toBe('.z{}');
    expect((await get(port, '/__assets/%2e%2e/%2e%2e/snf-secret.txt')).status).toBe(404);
    expect((await get(port, '/__assets/..%5c..%5csnf-secret.txt')).status).toBe(404);
    const bad = await get(port, '/__template/__proto__');
    expect(bad.status).toBe(200);
    expect(bad.body).toContain('<pre');
    expect((await get(port, '/__template/constructor')).body).toContain('<pre');
    s.close();
  });
});

describe('dev locale', () => {
  it('uses ?locale= only when the theme ships it', () => {
    const both = { defaultLocale: 'ar' as const, locales: ['ar', 'en'] };
    const en = { defaultLocale: 'en' as const, locales: ['en'] };
    expect(pickLocale(null, both)).toBe('ar');
    expect(pickLocale('en', both)).toBe('en');
    expect(pickLocale('fr', both)).toBe('ar');
    expect(pickLocale(null, en)).toBe('en');
    expect(pickLocale('ar', en)).toBe('en');
  });
});

describe('dev server, English-only theme', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snf-dev-en-'));
  const here = dirname(fileURLToPath(import.meta.url));
  const put = (p: string, text: string) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); };
  const m = JSON.parse(readFileSync(resolve(here, '../starter/theme.json'), 'utf8'));
  put('theme.json', JSON.stringify({ ...m, id: 'english', name: 'English', description: { en: 'An English-only theme' }, defaultLocale: 'en', locales: ['en'], settings: { accent: { type: 'color', label: 'Accent', default: '#B45309' } } }));
  put('layout/theme.sneferu', '<header>{{ store.name }}</header><main><hk-slot name="content" /></main>');
  put('templates/index.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"featured","settings":{"title":"Featured"}}]}</hk-schema>');
  put('sections/featured.sneferu', '<hk-section><hk-heading text="{{ section.settings.title }}" level="h2" /><hk-button label="{{ t(\'shop_now\') }}" href="/products" /><hk-product-grid products="{{ collection(\'featured\').products }}" limit="6" /></hk-section><hk-schema>{"name":"Featured products","settings":{"title":{"type":"text","label":"Title","default":"Featured"}}}</hk-schema>');
  put('locales/en.json', '{"shop_now":"Shop now"}');
  let server: Server | undefined;
  afterAll(() => server?.close());
  it('renders an LTR English page with English sample data, even for ?locale=ar', async () => {
    const s = await startDev(dir, 0);
    server = s.server;
    const port = (server.address() as { port: number }).port;
    for (const path of ['/', '/?locale=ar']) {
      const { status, body } = await get(port, path);
      expect(status).toBe(200);
      expect(body.startsWith('<!doctype html><html lang="en" dir="ltr">')).toBe(true);
      expect(body).toContain('dir="ltr" lang="en"');
      expect(body).toContain('PlayStation gift card');
      expect(body).toContain('Shop now');
      expect(body).toContain('Sample store');
      expect(body).not.toMatch(/[\u0600-\u06FF]/);
    }
    s.close();
  });
  it('gives the bilingual starter English sample data by default and Arabic for ?locale=ar', async () => {
    const d2 = mkdtempSync(join(tmpdir(), 'snf-dev-both-'));
    cpSync(resolve(here, '../starter'), d2, { recursive: true });
    const s = await startDev(d2, 0);
    const port = (s.server.address() as { port: number }).port;
    const en = (await get(port, '/')).body;
    expect(en).toContain('PlayStation gift card');
    expect(en).not.toMatch(/[\u0600-\u06FF]/);
    expect((await get(port, '/?locale=en')).body).toBe(en);
    expect((await get(port, '/?locale=ar')).body).toContain('كارت بلايستيشن');
    s.close(); s.server.close();
  });
});
