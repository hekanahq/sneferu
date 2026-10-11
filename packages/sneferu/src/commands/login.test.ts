import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLogin } from './login';
import { credentialsPath, readCredentials } from '../credentials';
import { startFakeApi, ok, DEV_KEY, type FakeApi } from '../test-utils/fake-api';

let api: FakeApi;
let env: NodeJS.ProcessEnv;
let logs: string[];
let opened: string[];
let slept: number[];
let clock: number;

const code = (extra: Record<string, unknown> = {}) => ok({
  deviceCode: 'dc-secret', userCode: 'BCDF-GHJK',
  verificationUri: 'https://partners.hekana.com/developers/device',
  verificationUriComplete: 'https://partners.hekana.com/developers/device?code=BCDF-GHJK',
  expiresIn: 600, interval: 5, ...extra,
}, 201);

const baseOpts = () => ({
  apiUrl: api.base, env,
  log: (s: string) => { logs.push(s); },
  openUrl: (u: string) => { opened.push(u); },
  sleep: async (ms: number) => { slept.push(ms); clock += ms; },
  now: () => clock,
});
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
    expect(logs.join('\n')).toContain('Open https://partners.hekana.com/developers/device?code=BCDF-GHJK');
    expect(logs.join('\n')).toContain('Code: BCDF-GHJK');
    expect(opened).toEqual(['https://partners.hekana.com/developers/device?code=BCDF-GHJK']);
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
