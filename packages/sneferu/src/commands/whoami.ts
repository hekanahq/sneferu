import { callApi, describeError, isDevKey, isObj, normalizeApiUrl, redact, sanitize } from '../api';
import { resolveAuth } from '../credentials';
import type { CommandResult } from './login';

/** Who the CLI pushes as: email, key prefix, dev store. */
export async function runWhoami(o: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {}): Promise<CommandResult> {
  const auth = resolveAuth(o.env ?? process.env);
  if (auth.error) return { ok: false, output: redact(auth.error) };
  if (!auth.token) return { ok: false, output: '✖ Not logged in. Run sneferu login' };
  if (!isDevKey(auth.token)) return { ok: true, output: 'Using HEKANA_TOKEN (admin token)' };

  const norm = normalizeApiUrl(auth.apiUrl);
  if (norm.error !== undefined) return { ok: false, output: norm.error };
  const r = await callApi(o.fetchImpl, norm.api, '/developer/whoami', { method: 'GET', token: auth.token });
  if (!r.reached) return { ok: false, output: redact(`✖ ${r.error}`) };
  if (!r.ok) {
    const hint = r.status === 401 ? '\nThe key was not accepted. Run sneferu login' : '';
    return { ok: false, output: `✖ whoami failed ${describeError(r)}${hint}` };
  }
  const d = r.data;
  const store = isObj(d.devStore) && typeof d.devStore.url === 'string' ? sanitize(d.devStore.url) || null : null;
  const lines = [
    `Email: ${sanitize(d.email)}`,
    `Key: ${sanitize(d.keyPrefix)}…${typeof d.keyName === 'string' && sanitize(d.keyName) ? ` (${sanitize(d.keyName)})` : ''}`,
    `Dev store: ${store ?? 'none (enable developer access in the partner portal)'}`,
  ];
  if (auth.source === 'env') lines.push('(key from HEKANA_TOKEN)');
  return { ok: true, output: redact(lines.join('\n')) };
}
