import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs';
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

/** Save the login: the file is 0600 inside a 0700 directory, also when either already existed. */
export function writeCredentials(c: Credentials, env: NodeJS.ProcessEnv = process.env): string {
  const path = credentialsPath(env);
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  if (existsSync(path)) chmodSync(path, 0o600); // tighten before the key is written into it
  const fd = openSync(path, 'w', 0o600);
  try {
    writeSync(fd, `${JSON.stringify({ apiUrl: c.apiUrl, key: c.key, email: c.email, createdAt: c.createdAt }, null, 2)}\n`);
  } finally {
    closeSync(fd);
  }
  chmodSync(path, 0o600);
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
