import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, statSync, lstatSync, writeFileSync, mkdirSync, chmodSync, existsSync, symlinkSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { credentialsPath, readCredentials, writeCredentials, deleteCredentials, resolveAuth } from './credentials';
import { DEFAULT_API_URL } from './api';
import { DEV_KEY } from './test-utils/fake-api';

let env: NodeJS.ProcessEnv;
let cfg: string;
const creds = { apiUrl: 'https://api.example.com/api/v1', key: DEV_KEY, email: 'dev@example.com', createdAt: '2026-10-11T00:00:00.000Z' };

beforeEach(() => {
  cfg = mkdtempSync(join(tmpdir(), 'snf-cfg-'));
  env = { XDG_CONFIG_HOME: cfg };
});

describe('credentials', () => {
  it('lives under $XDG_CONFIG_HOME/sneferu/credentials.json, else ~/.config', () => {
    expect(credentialsPath(env)).toBe(join(cfg, 'sneferu', 'credentials.json'));
    expect(credentialsPath({ HOME: '/home/someone' })).toBe(join('/home/someone', '.config', 'sneferu', 'credentials.json'));
    // a relative XDG_CONFIG_HOME is invalid per the XDG spec and ignored
    expect(credentialsPath({ XDG_CONFIG_HOME: 'rel/dir', HOME: '/h' })).toBe(join('/h', '.config', 'sneferu', 'credentials.json'));
    expect(credentialsPath({})).toBe(join(homedir(), '.config', 'sneferu', 'credentials.json'));
  });

  it('writes the file 0600 inside a 0700 directory and reads it back', () => {
    const p = writeCredentials(creds, env);
    expect(p).toBe(credentialsPath(env));
    expect(statSync(p).mode & 0o777).toBe(0o600);
    expect(statSync(join(cfg, 'sneferu')).mode & 0o777).toBe(0o700);
    expect(readCredentials(env)).toEqual(creds);
  });

  it('tightens a pre-existing file and directory', () => {
    mkdirSync(join(cfg, 'sneferu'), { mode: 0o755 });
    chmodSync(join(cfg, 'sneferu'), 0o755);
    writeFileSync(credentialsPath(env), '{}', { mode: 0o644 });
    chmodSync(credentialsPath(env), 0o644);
    writeCredentials(creds, env);
    expect(statSync(credentialsPath(env)).mode & 0o777).toBe(0o600);
    expect(statSync(join(cfg, 'sneferu')).mode & 0o777).toBe(0o700);
    expect(readCredentials(env)).toEqual(creds);
  });

  it('returns null when the file is missing, unparseable or malformed', () => {
    expect(readCredentials(env)).toBeNull();
    mkdirSync(join(cfg, 'sneferu'), { recursive: true });
    writeFileSync(credentialsPath(env), 'not json');
    expect(readCredentials(env)).toBeNull();
    writeFileSync(credentialsPath(env), JSON.stringify({ apiUrl: 'x' }));
    expect(readCredentials(env)).toBeNull();
  });

  it('deletes the file and reports whether there was one', () => {
    expect(deleteCredentials(env)).toEqual({ ok: true });
    writeCredentials(creds, env);
    expect(deleteCredentials(env)).toEqual({ ok: true });
    expect(existsSync(credentialsPath(env))).toBe(false);
  });

  it('reports a delete failure other than "not there"', () => {
    mkdirSync(credentialsPath(env), { recursive: true }); // unlink on a directory fails (EISDIR/EPERM), even as root
    const r = deleteCredentials(env);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/EISDIR|EPERM/);
  });

  it('resolveAuth: HEKANA_TOKEN beats the saved key; the saved key only goes to its own origin', () => {
    expect(resolveAuth(env)).toEqual({ apiUrl: DEFAULT_API_URL, token: null, source: 'none' });
    writeCredentials(creds, env);
    expect(resolveAuth(env)).toEqual({ apiUrl: creds.apiUrl, token: DEV_KEY, source: 'credentials' });
    expect(resolveAuth({ ...env, HEKANA_TOKEN: 'admin-tok' })).toEqual({ apiUrl: creds.apiUrl, token: 'admin-tok', source: 'env' });
    // the saved key never goes to another origin: no token, and an error that says what to do
    const other = resolveAuth({ ...env, HEKANA_API_URL: 'http://localhost:3000/api/v1' });
    expect(other).toMatchObject({ apiUrl: 'http://localhost:3000/api/v1', token: null, source: 'none' });
    expect(other.error).toBe('✖ Your saved key is for https://api.example.com. Set HEKANA_TOKEN to use http://localhost:3000, or run sneferu login --api-url http://localhost:3000/api/v1');
    // same origin, different spelling of the path: still the saved key
    expect(resolveAuth({ ...env, HEKANA_API_URL: 'https://api.example.com/api/v1/' })).toMatchObject({ token: DEV_KEY, source: 'credentials' });
    // HEKANA_TOKEN is unaffected by the origin check
    expect(resolveAuth({ ...env, HEKANA_API_URL: 'http://localhost:3000/api/v1', HEKANA_TOKEN: 'ci-tok' })).toMatchObject({ token: 'ci-tok', source: 'env' });
    expect(resolveAuth(env, 'https://evil.example.net/api/v1').token).toBeNull();
    // an empty HEKANA_TOKEN counts as unset
    expect(resolveAuth({ ...env, HEKANA_TOKEN: '' }).source).toBe('credentials');
  });

  it('does not write through a symlinked credentials.json: the link is replaced by a regular 0600 file', () => {
    const target = join(mkdtempSync(join(tmpdir(), 'snf-target-')), 'victim.txt');
    writeFileSync(target, 'original');
    mkdirSync(join(cfg, 'sneferu'), { recursive: true, mode: 0o700 });
    symlinkSync(target, credentialsPath(env));
    writeCredentials(creds, env);
    expect(readFileSync(target, 'utf8')).toBe('original');
    const st = lstatSync(credentialsPath(env));
    expect(st.isSymbolicLink()).toBe(false);
    expect(st.isFile()).toBe(true);
    expect(st.mode & 0o777).toBe(0o600);
    expect(readCredentials(env)).toEqual(creds);
    // no temp files left behind
    expect(readdirSync(join(cfg, 'sneferu'))).toEqual(['credentials.json']);
  });

  it('refuses a config directory that is a symlink', () => {
    const elsewhere = mkdtempSync(join(tmpdir(), 'snf-elsewhere-'));
    symlinkSync(elsewhere, join(cfg, 'sneferu'));
    expect(() => writeCredentials(creds, env)).toThrow(/not a real directory/);
    expect(readdirSync(elsewhere)).toEqual([]);
  });
});
