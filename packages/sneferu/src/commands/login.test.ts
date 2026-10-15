import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLogin, browserCommand } from './login';
import { credentialsPath, readCredentials, writeCredentials } from '../credentials';
import { startFakeApi, ok, DEV_KEY, type FakeApi } from '../test-utils/fake-api';

let api: FakeApi;
let env: NodeJS.ProcessEnv;
let logs: string[];
let opened: string[];
let slept: number[];
let clock: number;

const code = (extra: Record<string, unknown> = {}) => ok({
  deviceCode: 'dc-secret', userCode: 'BCDF-GHJK',
  verificationUri: 'https://hekana.dev/device',
  verificationUriComplete: 'https://hekana.dev/device?code=BCDF-GHJK',
  expiresIn: 600, interval: 5, ...extra,
}, 201);

const baseOpts = () => ({
  apiUrl: api.base, env,
  log: (s: string) => { logs.push(s); },
  openUrl: (u: string) => { opened.push(u); },
  sleep: async (ms: number) => { slept.push(ms); clock += ms; },
  now: () => clock,
});
const EVIL = '\u001b[2J\u001b]8;;https://evil.example\u0007click\u001b]8;;\u0007\u009b31m\r';
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;
const allText = (r: { output: string }) => [r.output, ...logs].join('\n');

beforeEach(async () => {
  api = await startFakeApi();
  env = { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-login-')) };
  logs = []; opened = []; slept = []; clock = 1_000_000;
});
afterEach(async () => { await api.close(); });

describe('sneferu login', () => {
  it('runs the device flow, saves the key 0600 and never prints it', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', (_req, n) =>
      n < 3 ? ok({ status: 'authorization_pending' }) : ok({ status: 'ok', key: DEV_KEY, keyPrefix: 'hk_dev_A1b2C3d4', email: 'dev@example.com' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(logs.join('\n')).toContain('Open https://hekana.dev/device?code=BCDF-GHJK');
    expect(logs.join('\n')).toContain('Code: BCDF-GHJK');
    expect(opened).toEqual(['https://hekana.dev/device?code=BCDF-GHJK']);
    expect(slept).toEqual([5000, 5000, 5000]);
    const path = credentialsPath(env);
    expect(r.output).toBe(`Logged in as dev@example.com. Key hk_dev_A1b2C3d4… saved to ${path}`);
    expect(allText(r)).not.toContain(DEV_KEY);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    const saved = readCredentials(env)!;
    expect(saved).toMatchObject({ apiUrl: api.base, key: DEV_KEY, email: 'dev@example.com' });
    expect(Number.isNaN(Date.parse(saved.createdAt))).toBe(false);
    // request shapes
    const codeReq = api.seen.find((s) => s.url.endsWith('/device/code'))!;
    expect((codeReq.body as { clientName: string }).clientName).toMatch(/^sneferu-cli on [\w.-]{1,40}$/);
    const polls = api.seen.filter((s) => s.url.endsWith('/device/token'));
    expect(polls).toHaveLength(3);
    expect(polls.every((p) => (p.body as { deviceCode: string }).deviceCode === 'dc-secret')).toBe(true);
    expect(polls.every((p) => p.auth === undefined)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8')).key).toBe(DEV_KEY);
  });

  it('backs off by 5 s on slow_down', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', (_req, n) =>
      n === 1 ? ok({ status: 'slow_down' }) : n === 2 ? ok({ status: 'authorization_pending' }) : ok({ status: 'ok', key: DEV_KEY, keyPrefix: 'hk_dev_A1b2C3d4', email: 'a@b.c' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(slept).toEqual([5000, 10000, 10000]);
  });

  it('fails clearly when the login is denied, and saves nothing', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'access_denied' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('Login was denied');
    expect(readCredentials(env)).toBeNull();
  });

  it('fails when the server says the code expired', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'expired_token' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('The code expired. Run sneferu login again');
  });

  it('stops polling at the expiresIn deadline', async () => {
    api.routes.set('POST /developer/device/code', code({ expiresIn: 30 }));
    api.routes.set('POST /developer/device/token', ok({ status: 'authorization_pending' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('The code expired. Run sneferu login again');
    expect(api.seen.filter((s) => s.url.endsWith('/device/token')).length).toBeLessThanOrEqual(6);
    expect(slept.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(30_000);
  });

  it('notes that HEKANA_TOKEN takes precedence when it is set', async () => {
    env.HEKANA_TOKEN = 'admin-tok';
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'ok', key: DEV_KEY, keyPrefix: 'hk_dev_A1b2C3d4', email: 'a@b.c' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(allText(r)).toContain('HEKANA_TOKEN is set');
    expect(allText(r)).toContain('takes precedence');
  });

  it('reports a server error on the code request with its code', async () => {
    api.routes.set('POST /developer/device/code', { status: 429, body: { success: false, error: { code: 'TOO_MANY', message: 'slow down' } } });
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('429');
    expect(r.output).toContain('TOO_MANY');
    expect(r.output).toContain('slow down');
  });

  it('only talks plain http to localhost', async () => {
    const r = await runLogin({ ...baseOpts(), apiUrl: 'http://api.example.com/api/v1' });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('must be https');
    expect(api.seen).toHaveLength(0);
  });

  it('does not open a verification URL that is not https', async () => {
    api.routes.set('POST /developer/device/code', code({ verificationUriComplete: 'file:///etc/passwd' }));
    api.routes.set('POST /developer/device/token', ok({ status: 'access_denied' }));
    await runLogin(baseOpts());
    expect(opened).toEqual([]);
  });

  it('a failing browser opener does not stop the login', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'ok', key: DEV_KEY, keyPrefix: 'hk_dev_A1b2C3d4', email: 'a@b.c' }));
    const r = await runLogin({ ...baseOpts(), openUrl: () => { throw new Error('no browser'); } });
    expect(r.ok).toBe(true);
  });
});

describe('browserCommand (no shell, https only)', () => {
  it('builds the exact argv per platform', () => {
    const u = 'https://hekana.dev/device?code=BCDF-GHJK';
    expect(browserCommand(u, 'linux')).toEqual({ cmd: 'xdg-open', args: [u] });
    expect(browserCommand(u, 'darwin')).toEqual({ cmd: 'open', args: [u] });
    expect(browserCommand(u, 'win32')).toEqual({ cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', u] });
  });
  it('never routes a URL through cmd on Windows, shell metacharacters stay inside one argument', () => {
    const c = browserCommand('https://x/?a|calc&b', 'win32')!;
    expect(c.cmd).toBe('rundll32');
    expect(c.args).toHaveLength(2);
    expect(c.args[1]).toBe(new URL('https://x/?a|calc&b').href);
  });
  it('refuses anything but https (http only for localhost)', () => {
    expect(browserCommand('http://evil.example.com/x', 'linux')).toBeNull();
    expect(browserCommand('file:///etc/passwd', 'linux')).toBeNull();
    expect(browserCommand('javascript:alert(1)', 'win32')).toBeNull();
    expect(browserCommand('not a url', 'darwin')).toBeNull();
    expect(browserCommand('http://localhost:3001/x', 'linux')).toEqual({ cmd: 'xdg-open', args: ['http://localhost:3001/x'] });
  });
});

describe('sneferu login hardening', () => {
  const good = (key = DEV_KEY) => ok({ status: 'ok', key, keyPrefix: 'hk_dev_A1b2C3d4', email: 'dev@example.com' });

  it('waits at least 5 s between polls whatever the server says', async () => {
    api.routes.set('POST /developer/device/code', code({ interval: 1 }));
    api.routes.set('POST /developer/device/token', (_r, n) => (n < 2 ? ok({ status: 'authorization_pending' }) : good()));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(slept).toEqual([5000, 5000]);
  });

  it('never polls past 900 s even if the server says the code lives longer', async () => {
    api.routes.set('POST /developer/device/code', code({ expiresIn: 100_000 }));
    api.routes.set('POST /developer/device/token', ok({ status: 'authorization_pending' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('The code expired');
    expect(slept.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(900_000);
  });

  it('refuses a malformed key without saving or printing it', async () => {
    const bad = 'hk_dev_tooShort-SECRETVALUE';
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', good(bad));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(allText(r)).not.toContain('SECRETVALUE');
    expect(readCredentials(env)).toBeNull();
  });

  it('does not print "undefined" when the server sends no email', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'ok', key: DEV_KEY, keyPrefix: 'hk_dev_A1b2C3d4' }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(r.output).not.toContain('undefined');
    expect(readCredentials(env)!.email).toBe('');
  });

  it('revokes the previous key for the same API with the old key, never printing it', async () => {
    const OLD = `hk_dev_OLDOLDOL${'y'.repeat(35)}`;
    writeCredentials({ apiUrl: api.base, key: OLD, email: 'dev@example.com', createdAt: '2026-10-01T00:00:00.000Z' }, env);
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', good());
    api.routes.set('POST /developer/keys/current/revoke', ok({ revoked: true }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(r.output).toContain('previous key revoked');
    expect(allText(r)).not.toContain(OLD);
    const revokes = api.seen.filter((s) => s.url.endsWith('/developer/keys/current/revoke'));
    expect(revokes).toHaveLength(1);
    expect(revokes[0]!.auth).toBe(`Bearer ${OLD}`);
    expect(readCredentials(env)!.key).toBe(DEV_KEY);
  });

  it('says so when the previous key could not be revoked, and still logs in', async () => {
    const OLD = `hk_dev_OLDOLDOL${'y'.repeat(35)}`;
    writeCredentials({ apiUrl: api.base, key: OLD, email: 'dev@example.com', createdAt: '' }, env);
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', good());
    api.routes.set('POST /developer/keys/current/revoke', { status: 500, body: { success: false, message: 'boom' } });
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(r.output).toContain('could not revoke previous key');
    expect(r.output).toContain('https://hekana.dev/account/keys');
    expect(allText(r)).not.toContain(OLD);
    expect(readCredentials(env)!.key).toBe(DEV_KEY);
  });

  it('leaves a previous key for a different API alone', async () => {
    const OLD = `hk_dev_OLDOLDOL${'y'.repeat(35)}`;
    writeCredentials({ apiUrl: 'https://api.other.example/api/v1', key: OLD, email: 'x', createdAt: '' }, env);
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', good());
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(api.seen.some((s) => s.url.endsWith('/revoke'))).toBe(false);
    expect(r.output).not.toContain('previous key');
  });

  it('refuses a user code that is not XXXX-XXXX, and prints none of it', async () => {
    api.routes.set('POST /developer/device/code', code({ userCode: `BCDF-GHJK${EVIL}` }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(false);
    expect(r.output).toContain('malformed code');
    expect(allText(r)).not.toMatch(CONTROL);
    expect(opened).toEqual([]);
    expect(api.seen.filter((s) => s.url.endsWith('/device/token'))).toHaveLength(0);
  });

  it('strips terminal control characters from the email and error messages', async () => {
    api.routes.set('POST /developer/device/code', code());
    api.routes.set('POST /developer/device/token', ok({ status: 'ok', key: DEV_KEY, keyPrefix: `hk_dev_A1b2C3d4${EVIL}`, email: `dev@example.com${EVIL}` }));
    const r = await runLogin(baseOpts());
    expect(r.ok).toBe(true);
    expect(allText(r)).not.toMatch(CONTROL);
    expect(r.output).toContain('Logged in as dev@example.com[2J]8;;https://evil.exampleclick]8;;31m.');

    logs = [];
    api.routes.set('POST /developer/device/code', { status: 400, body: { success: false, code: `BAD${EVIL}`, message: `nope${EVIL}\nsecond line` } });
    const bad = await runLogin(baseOpts());
    expect(bad.ok).toBe(false);
    expect(bad.output).not.toMatch(CONTROL);
    expect(bad.output).not.toContain('\n'); // a server message cannot forge extra output lines
  });
});
