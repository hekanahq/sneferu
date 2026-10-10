import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init';
import { runBuild } from './build';
import { runPush } from './push';

interface Seen { method?: string; url?: string; auth?: string; body?: { files: { path: string; contentBase64: string }[] } }

let server: Server;
let base = '';
let seen: Seen[] = [];
let reply: { status: number; body: unknown } = { status: 201, body: {} };
let dir: string;

beforeEach(async () => {
  seen = [];
  reply = {
    status: 201,
    body: { success: true, data: { versionId: 'v-123', version: '0.1.0', status: 'approved', contentHash: 'a'.repeat(64), diagnostics: [] } },
  };
  server = createServer((req: IncomingMessage, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined });
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/api/v1`;
  dir = join(mkdtempSync(join(tmpdir(), 'snf-push-')), 'my-shop');
  runInit(dir, {});
});
afterEach(async () => { await new Promise<void>((r) => server.close(() => r())); });

describe('sneferu push', () => {
  it('uploads the source files with the bearer token and prints the version id', async () => {
    runBuild(dir); // leaves dist/my-shop-0.1.0.sneferu.json behind — must never be uploaded
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, token: 'tok' });
    expect(r.ok).toBe(true);
    expect(r.versionId).toBe('v-123');
    expect(r.output).toContain('✔ pushed my-shop@0.1.0 → version v-123 (approved');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ method: 'POST', url: '/api/v1/admin/hk2/packages/my-shop/versions', auth: 'Bearer tok' });
    const paths = seen[0]!.body!.files.map((f) => f.path);
    expect(paths).toContain('theme.json');
    expect(paths).toContain('sections/hero.sneferu');
    expect(paths.some((p) => p.startsWith('dist/') || p.endsWith('.sneferu.json'))).toBe(false);
    const manifest = seen[0]!.body!.files.find((f) => f.path === 'theme.json')!;
    expect(JSON.parse(Buffer.from(manifest.contentBase64, 'base64').toString('utf8')).id).toBe('my-shop');
  });

  it('refuses to run without a token and sends nothing', async () => {
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, token: '' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('HEKANA_TOKEN is not set');
    expect(seen).toHaveLength(0);
  });

  it('does not upload a theme that fails to compile locally', async () => {
    writeFileSync(join(dir, 'sections', 'hero.sneferu'), '<hk-grid mobile-colums="1"></hk-grid><hk-schema>{"name":{"ar":"ب","en":"H"},"version":1,"settings":{}}</hk-schema>');
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, token: 'tok' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('SN2004');
    expect(r.output).toContain('not pushed');
    expect(seen).toHaveLength(0);
  });

  it('refuses a package slug that does not match theme.json id', async () => {
    const r = await runPush(dir, { pkg: 'other-shop', apiUrl: base, token: 'tok' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('does not match --package');
    expect(seen).toHaveLength(0);
  });

  it('prints the server diagnostics and code when the server rejects the push', async () => {
    reply = {
      status: 422,
      body: { statusCode: 422, code: 'HK2_COMPILE_FAILED', message: '1 error', diagnostics: [{ code: 'SN3003', severity: 'error', message: 'nope', file: 'x.txt' }] },
    };
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, token: 'tok' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('x.txt error SN3003 nope');
    expect(r.output).toContain('✖ push rejected (422 HK2_COMPILE_FAILED): 1 error');
  });

  it('only talks plain http to localhost', async () => {
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: 'http://api.example.com/api/v1', token: 'tok' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('must be https');
  });

  it('rejects a malformed package slug', async () => {
    const r = await runPush(dir, { pkg: 'My Shop', apiUrl: base, token: 'tok' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('--package');
  });
});
