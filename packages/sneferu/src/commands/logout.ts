import { callApi, describeError, normalizeApiUrl, redact } from '../api';
import { deleteCredentials, readCredentials } from '../credentials';
import type { CommandResult } from './login';

/** Revoke the saved key on the server (best-effort), then delete it locally. */
export async function runLogout(o: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {}): Promise<CommandResult> {
  const env = o.env ?? process.env;
  const creds = readCredentials(env);
  if (!creds) return { ok: true, output: 'Not logged in' };

  const lines: string[] = [];
  const norm = normalizeApiUrl(creds.apiUrl);
  if (norm.error !== undefined) {
    lines.push(`Note: could not revoke the key on the server: ${norm.error.replace(/^✖ /, '')}. Revoke it in the partner portal.`);
  } else {
    const r = await callApi(o.fetchImpl, norm.api, '/developer/keys/current/revoke', { method: 'POST', token: creds.key, body: {} });
    if (!r.reached) lines.push(`Note: could not revoke the key on the server (${r.error}). Revoke it in the partner portal.`);
    else if (!r.ok) lines.push(`Note: could not revoke the key on the server ${describeError(r)}. Revoke it in the partner portal if it is still listed.`);
  }
  deleteCredentials(env);
  lines.push('Logged out');
  if (env.HEKANA_TOKEN) lines.push('Note: HEKANA_TOKEN is still set in this shell.');
  return { ok: true, output: redact(lines.join('\n')) };
}
