import { formatDiagnostic, type Diagnostic } from '@hekana/sneferu-core';
import { compileTheme } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';

export const DEFAULT_API_URL = 'https://api.hekana.com/api/v1';
const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export interface PushOptions { pkg: string; apiUrl?: string; token?: string; fetchImpl?: typeof fetch }
export interface PushResult { ok: boolean; output: string; versionId?: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const asDiagnostics = (v: unknown): Diagnostic[] =>
  Array.isArray(v) ? v.filter((d): d is Diagnostic => isObj(d) && typeof d.code === 'string' && typeof d.message === 'string') : [];

/**
 * Upload a theme's SOURCE files to Hekana, which compiles them itself. The
 * local compile is a pre-flight only: a theme that fails here is never sent,
 * and nothing this CLI compiled is ever uploaded (the server trusts its own
 * compiler, not ours).
 */
export async function runPush(dir: string, o: PushOptions): Promise<PushResult> {
  if (!SLUG.test(o.pkg)) return { ok: false, output: '✖ --package must be 2-63 lowercase letters, digits or dashes' };
  const token = o.token ?? '';
  if (!token) return { ok: false, output: '✖ HEKANA_TOKEN is not set' };
  const api = (o.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
  let url: URL;
  try { url = new URL(api); } catch { return { ok: false, output: `✖ HEKANA_API_URL is not a URL: ${api}` }; }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) {
    return { ok: false, output: '✖ HEKANA_API_URL must be https (plain http only for localhost)' };
  }

  let files;
  try {
    files = loadTheme(dir).filter((f) => !f.path.endsWith('.sneferu.json'));
  } catch (e) {
    return { ok: false, output: `error ${(e as Error).message}\n✖ not pushed` };
  }
  const local = compileTheme(files, createDefaultRegistry());
  if (!local.artifact) {
    return { ok: false, output: [...local.diagnostics.map(formatDiagnostic), '✖ not pushed: fix the errors above'].join('\n') };
  }
  if (local.artifact.manifest.id !== o.pkg) {
    return { ok: false, output: `✖ theme.json id "${local.artifact.manifest.id}" does not match --package "${o.pkg}"` };
  }

  const body = JSON.stringify({ files: files.map((f) => ({ path: f.path, contentBase64: Buffer.from(f.bytes).toString('base64') })) });
  let res: Response;
  try {
    res = await (o.fetchImpl ?? fetch)(`${api}/admin/hk2/packages/${o.pkg}/versions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body,
    });
  } catch (e) {
    return { ok: false, output: `✖ could not reach ${api}: ${(e as Error).message}` };
  }
  let json: unknown = null;
  try { json = await res.json(); } catch { json = null; }
  const payload = isObj(json) && isObj(json.data) ? json.data : isObj(json) ? json : {};
  const lines = asDiagnostics(payload.diagnostics).map(formatDiagnostic);

  if (!res.ok) {
    const code = typeof payload.code === 'string' ? ` ${payload.code}` : '';
    const message = Array.isArray(payload.message) ? payload.message.join('; ') : String(payload.message ?? res.statusText);
    lines.push(`✖ push rejected (${res.status}${code}): ${message}`);
    return { ok: false, output: lines.join('\n') };
  }
  const versionId = String(payload.versionId ?? '');
  lines.push(`✔ pushed ${o.pkg}@${String(payload.version)} → version ${versionId} (${String(payload.status)}, hash ${String(payload.contentHash)})`);
  return { ok: true, output: lines.join('\n'), versionId };
}
