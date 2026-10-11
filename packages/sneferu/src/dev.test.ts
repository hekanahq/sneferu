import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { request } from 'node:http';
import { devPage, tokenCss } from './dev-page';
import { resolveAsset, startDev } from './commands/dev';

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
    expect((await get(port, '/')).body).toContain('dir="rtl"');
    expect((await get(port, '/?locale=en')).body).toContain('dir="ltr"');
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
