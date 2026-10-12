import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, renameSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { startDev } from '../../../sneferu/src/commands/dev';
import { startProxy, INSPECT_SCRIPT } from './proxy';
import { manifestOf, portFromOutput, resolveCli, sourceFor, templateOfPath } from './reveal';
import { DevServer, freePort } from './dev-server';
import { previewHtml } from './preview-html';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const STARTER = join(repo, 'packages/vscode-sneferu/test/fixtures/starter');
const ARCADE = join(repo, 'examples/themes/arcade');
const BUNDLED_CLI = fileURLToPath(new URL('../../dist/cli/cli.mjs', import.meta.url));

const get = (port: number, path: string) => fetch(`http://127.0.0.1:${port}${path}`).then(async (r) => ({ status: r.status, type: r.headers.get('content-type') ?? '', body: await r.text() }));

describe('click to source', () => {
  it('maps the dev server section ids to section files', () => {
    expect(sourceFor(STARTER, { section: 'default-0', path: '/' }).file).toBe(join(STARTER, 'sections/hero.snf'));
    expect(sourceFor(STARTER, { section: 'default-1', block: null, path: '/' }).file).toBe(join(STARTER, 'sections/featured.snf'));
    expect(sourceFor(ARCADE, { section: 'default-4', path: '/' }).file).toBe(join(ARCADE, 'sections/arcade-faq.snf'));
    expect(sourceFor(STARTER, { section: null, path: '/' }).file).toBe(join(STARTER, 'layout/theme.snf'));
    expect(sourceFor(STARTER, { section: 'default-9', path: '/' }).file).toBe(join(STARTER, 'templates/index.snf'));
    expect(templateOfPath('/__template/product')).toBe('product');
    expect(templateOfPath('/')).toBe('index');
  });
  it('opens a .sneferu file when the theme still uses the old extension', () => {
    const d = mkdtempSync(join(tmpdir(), 'snf-reveal-'));
    try {
      cpSync(STARTER, d, { recursive: true });
      renameSync(join(d, 'sections/hero.snf'), join(d, 'sections/hero.sneferu'));
      renameSync(join(d, 'layout/theme.snf'), join(d, 'layout/theme.sneferu'));
      expect(sourceFor(d, { section: 'default-0', path: '/' }).file).toBe(join(d, 'sections/hero.sneferu'));
      expect(sourceFor(d, { section: 'default-1', path: '/' }).file).toBe(join(d, 'sections/featured.snf'));
      expect(sourceFor(d, { section: null, path: '/' }).file).toBe(join(d, 'layout/theme.sneferu'));
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
  it('reads the port the CLI prints, and the manifest', () => {
    expect(portFromOutput('Sneferu dev → http://127.0.0.1:4101  (en · /?locale=ar)')).toBe(4101);
    expect(manifestOf(ARCADE)).toMatchObject({ id: 'arcade', defaultLocale: 'ar', locales: expect.arrayContaining(['ar', 'en']) });
  });
  it('prefers the theme-local CLI, then the bundled one', () => {
    const d = mkdtempSync(join(tmpdir(), 'snf-cli-'));
    expect(resolveCli(d, '/bundled/cli.mjs')).toEqual({ path: '/bundled/cli.mjs', origin: 'bundled' });
    mkdirSync(join(d, 'node_modules/@hekana/sneferu/dist'), { recursive: true });
    writeFileSync(join(d, 'node_modules/@hekana/sneferu/dist/cli.js'), '');
    expect(resolveCli(join(d), '/bundled/cli.mjs').origin).toBe('theme');
  });
});

describe('inspect proxy in front of sneferu dev', () => {
  it('injects the inspect script into pages and passes everything else through, live reload included', async () => {
    const port = await freePort(4300);
    const dev = await startDev(ARCADE, port);
    const proxy = await startProxy(port);
    try {
      const page = await get(proxy.port, '/?locale=en');
      expect(page.status).toBe(200);
      expect(page.body).toContain('data-hk-section="default-0"');
      expect(page.body).toContain(INSPECT_SCRIPT);
      expect(page.body.indexOf(INSPECT_SCRIPT)).toBeLessThan(page.body.indexOf('</body>'));
      expect(page.body).toContain('lang="en"');
      const css = await get(proxy.port, '/__assets/theme.css');
      expect(css.type).toContain('text/css');
      expect(css.body).not.toContain('<script>');
      // the reload event stream stays open through the proxy
      const first = await new Promise<string>((resolve, reject) => {
        const r = request({ host: '127.0.0.1', port: proxy.port, path: '/__events' }, (res) => { res.once('data', (b: Buffer) => { resolve(b.toString()); r.destroy(); }); });
        r.on('error', reject); r.end();
      });
      expect(first).toContain(': ok');
    } finally { proxy.close(); dev.close(); }
  });
  it('reports a stopped dev server instead of hanging', async () => {
    const proxy = await startProxy(await freePort(4350));
    try { expect((await get(proxy.port, '/')).status).toBe(502); } finally { proxy.close(); }
  });
});

describe.skipIf(!existsSync(BUNDLED_CLI))('the bundled CLI as a child process (needs pnpm build)', () => {
  it('starts, serves through the proxy and stops', async () => {
    const lines: string[] = [];
    const dev = new DevServer(process.execPath, (l) => lines.push(l));
    const states: string[] = [];
    dev.onState((s) => states.push(s.s));
    const s = await dev.start(STARTER, BUNDLED_CLI, { port: 4400 });
    try {
      expect(s.s).toBe('running');
      if (s.s !== 'running') return;
      const page = await get(s.proxyPort, '/?locale=ar');
      expect(page.body).toContain('dir="rtl"');
      expect(page.body).toContain('sneferu-reveal');
    } finally { dev.stop(); }
    expect(states).toEqual(['starting', 'running', 'stopped']);
    expect(lines.join('\n')).toMatch(/Sneferu dev → http:\/\/127\.0\.0\.1:\d+/);
  }, 30_000);
});

describe('preview panel page', () => {
  it('has a strict CSP, the toolbar and the iframe origin', () => {
    const html = previewHtml({ origin: 'http://127.0.0.1:5555', locales: ['ar', 'en'], locale: 'ar', templates: ['index', 'product'], nonce: 'abc', cspSource: 'vscode-resource:' });
    expect(html).toContain("frame-src http://127.0.0.1:5555; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-abc'");
    for (const s of ['data-width="desktop"', 'data-width="tablet"', 'data-width="phone"', 'data-locale="ar"', 'data-locale="en"', '<option value="product"', 'id="inspect"']) expect(html).toContain(s);
    expect(html).not.toMatch(/purple|violet|#[89a-f][0-9a-f]00ff/i);
  });
});
