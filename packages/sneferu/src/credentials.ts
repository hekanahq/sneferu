import { chmodSync, closeSync, constants, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { DEFAULT_API_URL, isObj } from './api';

export interface Credentials { apiUrl: string; key: string; email: string; createdAt: string }

/** `$XDG_CONFIG_HOME/sneferu/credentials.json`, else `~/.config/sneferu/credentials.json`. */
export function credentialsPath(env: NodeJS.ProcessEnv = process.env): string {
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg && isAbsolute(xdg) ? xdg : join(env.HOME || homedir(), '.config');
  return join(base, 'sneferu', 'credentials.json');
}

/** The saved login, or null when there is none or it is not readable as one. */
export function readCredentials(env: NodeJS.ProcessEnv = process.env): Credentials | null {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(credentialsPath(env), 'utf8')); } catch { return null; }
  if (!isObj(parsed)) return null;
  const { apiUrl, key, email, createdAt } = parsed;
  if (typeof apiUrl !== 'string' || typeof key !== 'string' || !key || typeof email !== 'string') return null;
  return { apiUrl, key, email, createdAt: typeof createdAt === 'string' ? createdAt : '' };
}

/**
 * Save the login: a 0600 file inside a 0700 directory. The directory must be a real
 * directory (not a symlink) owned by this user. The file is written to a fresh temp file
 * (O_EXCL, O_NOFOLLOW where available), fsynced, then renamed over credentials.json, so a
 * symlink at that path is replaced, never written through, and a crash never leaves half a file.
 */
export function writeCredentials(c: Credentials, env: NodeJS.ProcessEnv = process.env): string {
  const path = credentialsPath(env);
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = lstatSync(dir);
  if (!st.isDirectory()) throw new Error(`${dir} is not a real directory (symlink?); refusing to save the key there`);
  if (typeof process.getuid === 'function' && st.uid !== process.getuid()) throw new Error(`${dir} is not owned by you; refusing to save the key there`);
  chmodSync(dir, 0o700);

  const tmp = join(dir, `.credentials.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const fd = openSync(tmp, flags, 0o600);
  try {
    try {
      writeSync(fd, `${JSON.stringify({ apiUrl: c.apiUrl, key: c.key, email: c.email, createdAt: c.createdAt }, null, 2)}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    chmodSync(tmp, 0o600);
    renameSync(tmp, path);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* already gone */ }
    throw e;
  }
  return path;
}

export function deleteCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  try { unlinkSync(credentialsPath(env)); return true; } catch { return false; }
}

/** token = HEKANA_TOKEN ?? saved key; API URL = HEKANA_API_URL ?? saved apiUrl ?? the default. */
export function resolveAuth(env: NodeJS.ProcessEnv = process.env): { apiUrl: string; token: string | null; source: 'env' | 'credentials' | 'none' } {
  const creds = readCredentials(env);
  const apiUrl = env.HEKANA_API_URL || creds?.apiUrl || DEFAULT_API_URL;
  if (env.HEKANA_TOKEN) return { apiUrl, token: env.HEKANA_TOKEN, source: 'env' };
  if (creds) return { apiUrl, token: creds.key, source: 'credentials' };
  return { apiUrl, token: null, source: 'none' };
}
