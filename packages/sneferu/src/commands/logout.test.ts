import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLogout } from './logout';
import { credentialsPath, writeCredentials } from '../credentials';
import { startFakeApi, ok, DEV_KEY, type FakeApi } from '../test-utils/fake-api';

let api: FakeApi;
let env: NodeJS.ProcessEnv;
beforeEach(async () => {
  api = await startFakeApi();
  env = { XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'snf-logout-')) };
});
afterEach(async () => { await api.close(); });
const save = (apiUrl = api.base) => writeCredentials({ apiUrl, key: DEV_KEY, email: 'dev@example.com', createdAt: new Date().toISOString() }, env);

describe('sneferu logout', () => {
  it('says so when not logged in', async () => {
    const r = await runLogout({ env });
    expect(r).toEqual({ ok: true, output: 'Not logged in' });
    expect(api.seen).toHaveLength(0);
  });

  it('revokes the key on the server with the key itself, then deletes the file', async () => {
    save();
    api.routes.set('POST /developer/keys/current/revoke', ok({ revoked: true }));
    const r = await runLogout({ env });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('Logged out');
    expect(r.output).not.toContain(DEV_KEY);
    expect(api.seen).toHaveLength(1);
    expect(api.seen[0]).toMatchObject({ method: 'POST', url: '/api/v1/developer/keys/current/revoke', auth: `Bearer ${DEV_KEY}` });
    expect(existsSync(credentialsPath(env))).toBe(false);
  });

  it('still deletes the file when the server cannot be reached, and says so', async () => {
    save('http://127.0.0.1:1/api/v1');
    const r = await runLogout({ env });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('could not revoke');
    expect(r.output).toContain('Logged out');
    expect(r.output).not.toContain(DEV_KEY);
    expect(existsSync(credentialsPath(env))).toBe(false);
  });

  it('still deletes the file when the server refuses the revoke', async () => {
    save();
    api.routes.set('POST /developer/keys/current/revoke', { status: 401, body: { success: false, message: 'Invalid developer key' } });
    const r = await runLogout({ env });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('401');
    expect(r.output).toContain('Logged out');
    expect(existsSync(credentialsPath(env))).toBe(false);
  });
});
