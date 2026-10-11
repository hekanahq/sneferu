import { formatDiagnostic, type Diagnostic } from '@hekana/sneferu-core';
import { compileTheme } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';
import { callApi, describeError, isDevKey, isObj, normalizeApiUrl, redact } from '../api';
import { resolveAuth } from '../credentials';

export { DEFAULT_API_URL } from '../api';
const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

export interface PushOptions {
  pkg: string;
  /** Explicit API URL; otherwise HEKANA_API_URL, the saved login's URL, or the default. */
  apiUrl?: string;
  /** Explicit token; otherwise HEKANA_TOKEN or the saved developer key. */
  token?: string;
  /** After a successful push, install and publish the version on the caller's dev store. */
  devStore?: boolean;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}
export interface PushResult { ok: boolean; output: string; versionId?: string }

const asDiagnostics = (v: unknown): Diagnostic[] =>
  Array.isArray(v) ? v.filter((d): d is Diagnostic => isObj(d) && typeof d.code === 'string' && typeof d.message === 'string') : [];

/**
 * Upload a theme's SOURCE files to Hekana, which compiles them itself. The
 * local compile is a pre-flight only: a theme that fails here is never sent,
 * and nothing this CLI compiled is ever uploaded (the server trusts its own
 * compiler, not ours).
 *
 * A developer key (`hk_dev_…`) pushes to the developer route; any other token
 * (a platform admin access token) to the admin route.
 */
export async function runPush(dir: string, o: PushOptions): Promise<PushResult> {
  if (!SLUG.test(o.pkg)) return { ok: false, output: '✖ --package must be 2-63 lowercase letters, digits or dashes' };
  const auth = resolveAuth(o.env ?? process.env);
  const token = o.token ?? auth.token ?? '';
  if (!token) return { ok: false, output: '✖ Not logged in. Run sneferu login, or set HEKANA_TOKEN' };
  const dev = isDevKey(token);
  if (o.devStore && !dev) return { ok: false, output: '✖ --dev-store needs a developer key: run sneferu login (an admin HEKANA_TOKEN cannot publish to a dev store)' };
  const norm = normalizeApiUrl(o.apiUrl || auth.apiUrl);
  if (norm.error !== undefined) return { ok: false, output: norm.error };
  const api = norm.api;

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

  const files64 = files.map((f) => ({ path: f.path, contentBase64: Buffer.from(f.bytes).toString('base64') }));
  const route = dev ? `/developer/themes/${o.pkg}/versions` : `/admin/hk2/packages/${o.pkg}/versions`;
  const res = await callApi(o.fetchImpl, api, route, { method: 'POST', token, body: { files: files64 } });
  if (!res.reached) return { ok: false, output: redact(`✖ ${res.error}`) };
  const lines = asDiagnostics(res.data.diagnostics).map(formatDiagnostic);

  if (!res.ok) {
    lines.push(`✖ push rejected ${describeError(res)}`);
    return { ok: false, output: redact(lines.join('\n')) };
  }
  const versionId = String(res.data.versionId ?? '');
  lines.push(`✔ pushed ${o.pkg}@${String(res.data.version)} → version ${versionId} (${String(res.data.status)}, hash ${String(res.data.contentHash)})`);
  if (!o.devStore) return { ok: true, output: redact(lines.join('\n')), versionId };

  const pub = await callApi(o.fetchImpl, api, '/developer/dev-store/theme', { method: 'POST', token, body: { versionId } });
  if (!pub.reached) {
    lines.push(`✖ pushed, but not published on your dev store: ${pub.error}`);
    return { ok: false, output: redact(lines.join('\n')), versionId };
  }
  if (!pub.ok) {
    lines.push(`✖ pushed, but not published on your dev store ${describeError(pub)}`);
    return { ok: false, output: redact(lines.join('\n')), versionId };
  }
  lines.push(`Published on your dev store: ${String(pub.data.storeUrl ?? '')}`);
  return { ok: true, output: redact(lines.join('\n')), versionId };
}
