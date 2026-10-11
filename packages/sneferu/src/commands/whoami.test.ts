import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWhoami } from './whoami';
import { writeCredentials } from '../credentials';
import { startFakeApi, ok, DEV_KEY, type FakeApi } from '../test-utils/fake-api';

let api: FakeApi;
let env: NodeJS.ProcessEnv;
beforeEach(async () => {
  api = await startFakeApi();
  env = { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-whoami-')) };
});
afterEach(async () => { await api.close(); });
const save = () => writeCredentials({ apiUrl: api.base, key: DEV_KEY, email: 'dev@example.com', createdAt: new Date().toISOString() }, env);

describe('sneferu whoami', () => {
  it('fails when not logged in', async () => {
    const r = await runWhoami({ env });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('Not logged in. Run sneferu login');
  });

  it('prints email, key prefix and dev store URL from the API', async () => {
    save();
    api.routes.set('GET /developer/whoami', ok({ email: 'dev@example.com', keyName: 'CLI login (x) 2026-10-11', keyPrefix: 'hk_dev_A1b2C3d4', devStore: { merchantId: 'm1', slug: 'dev-0a1b2c3d', url: 'https://dev-0a1b2c3d.hekana.com' } }));
    const r = await runWhoami({ env });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('dev@example.com');
    expect(r.output).toContain('hk_dev_A1b2C3d4');
    expect(r.output).toContain('https://dev-0a1b2c3d.hekana.com');
    expect(r.output).not.toContain(DEV_KEY);
    expect(api.seen[0]).toMatchObject({ method: 'GET', url: '/api/v1/developer/whoami', auth: `Bearer ${DEV_KEY}` });
  });

  it('says when there is no dev store yet', async () => {
    save();
    api.routes.set('GET /developer/whoami', ok({ email: 'dev@example.com', keyName: 'k', keyPrefix: 'hk_dev_A1b2C3d4', devStore: null }));
    const r = await runWhoami({ env });
    expect(r.ok).toBe(true);
    expect(r.output).toMatch(/Dev store: none/);
  });

  it('does not call the API for an admin HEKANA_TOKEN', async () => {
    const r = await runWhoami({ env: { ...env, HEKANA_TOKEN: 'eyJadmin', HEKANA_API_URL: api.base } });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('Using HEKANA_TOKEN (admin token)');
    expect(r.output).not.toContain('eyJadmin');
    expect(api.seen).toHaveLength(0);
  });

  it('fails on a rejected key without echoing it', async () => {
    save();
    api.routes.set('GET /developer/whoami', { status: 401, body: { success: false, message: `bad key ${DEV_KEY}` } });
    const r = await runWhoami({ env });
    expect(r.ok).toBe(false);
    expect(r.output).toContain('401');
    expect(r.output).not.toContain(DEV_KEY);
  });
});
