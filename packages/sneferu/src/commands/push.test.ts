import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init';
import { runBuild } from './build';
import { runPush } from './push';
import { writeCredentials } from '../credentials';
import { startFakeApi, ok, DEV_KEY, type FakeApi } from '../test-utils/fake-api';

const EVIL = '\u001b[2J\u001b]8;;https://evil.example\u0007click\u001b]8;;\u0007\u009b31m\r';
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;
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
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, token: '', env: { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-cfg-')) } });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('Not logged in. Run sneferu login, or set HEKANA_TOKEN');
    expect(seen).toHaveLength(0);
  });

  it('refuses to run with no token and no saved login', async () => {
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: base, env: { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-cfg-')) } });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('Not logged in. Run sneferu login, or set HEKANA_TOKEN');
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

describe('sneferu push with a developer key', () => {
  let api: FakeApi;
  let env: NodeJS.ProcessEnv;
  const pushed = ok({ versionId: 'v-9', version: '0.1.0', status: 'in_review', contentHash: 'b'.repeat(64), diagnostics: [] }, 201);
  beforeEach(async () => {
    api = await startFakeApi();
    env = { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-cfg-')) };
  });
  afterEach(async () => { await api.close(); });
  const save = () => writeCredentials({ apiUrl: api.base, key: DEV_KEY, email: 'dev@example.com', createdAt: new Date().toISOString() }, env);

  it('uses the saved key and URL and pushes to the developer route', async () => {
    save();
    api.routes.set('POST /developer/themes/my-shop/versions', pushed);
    const r = await runPush(dir, { pkg: 'my-shop', env });
    expect(r.ok).toBe(true);
    expect(r.versionId).toBe('v-9');
    expect(r.output).toContain('✔ pushed my-shop@0.1.0 → version v-9 (in_review');
    expect(r.output).not.toContain(DEV_KEY);
    expect(api.seen).toHaveLength(1);
    expect(api.seen[0]).toMatchObject({ method: 'POST', url: '/api/v1/developer/themes/my-shop/versions', auth: `Bearer ${DEV_KEY}` });
  });

  it('HEKANA_TOKEN beats the saved key and keeps the admin route', async () => {
    save();
    api.routes.set('POST /admin/hk2/packages/my-shop/versions', pushed);
    const r = await runPush(dir, { pkg: 'my-shop', env: { ...env, HEKANA_TOKEN: 'admin-tok' } });
    expect(r.ok).toBe(true);
    expect(api.seen[0]).toMatchObject({ url: '/api/v1/admin/hk2/packages/my-shop/versions', auth: 'Bearer admin-tok' });
  });

  it('an explicit hk_dev_ token also goes to the developer route', async () => {
    api.routes.set('POST /developer/themes/my-shop/versions', pushed);
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: api.base, token: DEV_KEY, env });
    expect(r.ok).toBe(true);
    expect(api.seen[0]!.url).toBe('/api/v1/developer/themes/my-shop/versions');
  });

  it('--dev-store publishes the pushed version on the dev store', async () => {
    save();
    api.routes.set('POST /developer/themes/my-shop/versions', pushed);
    api.routes.set('POST /developer/dev-store/theme', ok({ publicationId: 'p1', revision: 3, storeUrl: 'https://dev-0a1b2c3d.hekana.com' }));
    const r = await runPush(dir, { pkg: 'my-shop', devStore: true, env });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('Published on your dev store: https://dev-0a1b2c3d.hekana.com');
    expect(api.seen).toHaveLength(2);
    expect(api.seen[1]).toMatchObject({ method: 'POST', url: '/api/v1/developer/dev-store/theme', auth: `Bearer ${DEV_KEY}`, body: { versionId: 'v-9' } });
  });

  it('--dev-store refuses an admin token before uploading anything', async () => {
    const r = await runPush(dir, { pkg: 'my-shop', apiUrl: api.base, token: 'admin-tok', devStore: true, env });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('--dev-store needs a developer key');
    expect(api.seen).toHaveLength(0);
  });

  it('--dev-store reports a failed publish after a good push', async () => {
    save();
    api.routes.set('POST /developer/themes/my-shop/versions', pushed);
    api.routes.set('POST /developer/dev-store/theme', { status: 409, body: { success: false, code: 'DEV_STORE_MISSING', message: 'enable developer access first' } });
    const r = await runPush(dir, { pkg: 'my-shop', devStore: true, env });
    expect(r.ok).toBe(false);
    expect(r.versionId).toBe('v-9');
    expect(r.output).toContain('✔ pushed my-shop@0.1.0');
    expect(r.output).toContain('409 DEV_STORE_MISSING');
    expect(r.output).toContain('enable developer access first');
  });

  it('never sends the saved key to another origin (HEKANA_API_URL or --api-url)', async () => {
    save();
    const other = await startFakeApi();
    try {
      for (const r of [
        await runPush(dir, { pkg: 'my-shop', env: { ...env, HEKANA_API_URL: other.base.replace('127.0.0.1', 'localhost') } }),
        await runPush(dir, { pkg: 'my-shop', apiUrl: other.base.replace('127.0.0.1', 'localhost'), env }),
      ]) {
        expect(r.ok).toBe(false);
        expect(r.output).toContain(`Your saved key is for ${new URL(api.base).origin}. Set HEKANA_TOKEN to use http://localhost:`);
      }
      expect(other.seen).toHaveLength(0);
      expect(api.seen).toHaveLength(0);
    } finally { await other.close(); }
  });

  it('HEKANA_TOKEN still pushes to another origin', async () => {
    save();
    const other = await startFakeApi();
    try {
      other.routes.set('POST /admin/hk2/packages/my-shop/versions', pushed);
      const r = await runPush(dir, { pkg: 'my-shop', env: { ...env, HEKANA_API_URL: other.base, HEKANA_TOKEN: 'ci-tok' } });
      expect(r.ok).toBe(true);
      expect(other.seen[0]!.auth).toBe('Bearer ci-tok');
    } finally { await other.close(); }
  });

  it('strips terminal control characters from server strings', async () => {
    save();
    api.routes.set('POST /developer/themes/my-shop/versions', ok({ versionId: `v-9${EVIL}`, version: '0.1.0', status: 'in_review', contentHash: 'b'.repeat(64), diagnostics: [{ code: `X${EVIL}`, severity: 'warning', message: `hi${EVIL}\nforged line` }] }, 201));
    api.routes.set('POST /developer/dev-store/theme', ok({ storeUrl: `https://dev.hekana.com${EVIL}` }));
    const r = await runPush(dir, { pkg: 'my-shop', devStore: true, env });
    expect(r.ok).toBe(true);
    expect(r.output).not.toMatch(CONTROL);
    expect(r.output.split('\n')).toHaveLength(3);
    expect(r.output).toContain('Published on your dev store: https://dev.hekana.com[2J');
  });

  it('reads error code/message nested under error', async () => {
    save();
    api.routes.set('POST /developer/themes/my-shop/versions', { status: 403, body: { success: false, error: { code: 'HK2_SLUG_TAKEN', message: 'slug belongs to someone else' } } });
    const r = await runPush(dir, { pkg: 'my-shop', env });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('✖ push rejected (403 HK2_SLUG_TAKEN): slug belongs to someone else');
  });
});
