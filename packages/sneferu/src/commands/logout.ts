import { callApi, describeError, normalizeApiUrl, redact } from '../api';
import { credentialsPath, deleteCredentials, readCredentials } from '../credentials';
import type { CommandResult } from './login';

/** Revoke the saved key on the server (best-effort), then delete it locally. */
export async function runLogout(o: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {}): Promise<CommandResult> {
  const env = o.env ?? process.env;
  const creds = readCredentials(env);
  if (!creds) return { ok: true, output: 'Not logged in' };

  const lines: string[] = [];
  const norm = normalizeApiUrl(creds.apiUrl);
  if (norm.error !== undefined) {
    lines.push(`Note: could not revoke the key on the server: ${norm.error.replace(/^✖ /, '')}. Revoke it at https://hekana.dev/account/keys.`);
  } else {
    const r = await callApi(o.fetchImpl, norm.api, '/developer/keys/current/revoke', { method: 'POST', token: creds.key, body: {} });
    if (!r.reached) lines.push(`Note: could not revoke the key on the server (${r.error}). Revoke it at https://hekana.dev/account/keys.`);
    else if (!r.ok) lines.push(`Note: could not revoke the key on the server ${describeError(r)}. Revoke it at https://hekana.dev/account/keys if it is still listed.`);
  }
  const del = deleteCredentials(env);
  if (!del.ok) {
    lines.push(`✖ could not delete the saved key at ${credentialsPath(env)}: ${del.error}. Delete that file yourself.`);
    return { ok: false, output: redact(lines.join('\n')) };
  }
  lines.push('Logged out');
  if (env.HEKANA_TOKEN) lines.push('Note: HEKANA_TOKEN is still set in this shell.');
  return { ok: true, output: redact(lines.join('\n')) };
}
