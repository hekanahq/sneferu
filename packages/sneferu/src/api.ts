/** Shared plumbing for every command that talks to the Hekana API. */

export const DEFAULT_API_URL = 'https://api.hekana.com/api/v1';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A developer key (as opposed to an admin access token). */
export const isDevKey = (token: string | null | undefined): token is string => typeof token === 'string' && token.startsWith('hk_dev_');

/** Never let a developer key reach the terminal, whatever echoed it. */
export const redact = (s: string): string => s.replace(/hk_dev_[A-Za-z0-9_-]{9,}/g, 'hk_dev_…');

/** https only, except plain http to the local machine. Trailing slashes are dropped. */
export function normalizeApiUrl(raw: string | undefined): { api: string; error?: undefined } | { api?: undefined; error: string } {
  const api = (raw || DEFAULT_API_URL).replace(/\/+$/, '');
  let url: URL;
  try { url = new URL(api); } catch { return { error: `✖ the API URL is not a URL: ${api}` }; }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) {
    return { error: '✖ the API URL must be https (plain http only for localhost)' };
  }
  return { api };
}

/** An http(s) URL that is safe to hand to the system browser opener. */
export function isBrowsableUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || (u.protocol === 'http:' && LOOPBACK.has(u.hostname));
  } catch { return false; }
}

export type ApiCall =
  | { reached: true; ok: boolean; status: number; statusText: string; json: unknown; data: Record<string, unknown> }
  | { reached: false; error: string };

/** Call the API. Unwraps `{success, data}`; never throws. */
export async function callApi(
  fetchImpl: typeof fetch | undefined,
  api: string,
  path: string,
  o: { method: 'GET' | 'POST'; token?: string; body?: unknown },
): Promise<ApiCall> {
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['content-type'] = 'application/json';
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  let res: Response;
  try {
    res = await (fetchImpl ?? fetch)(`${api}${path}`, { method: o.method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  } catch (e) {
    return { reached: false, error: `could not reach ${api}: ${(e as Error).message}` };
  }
  let json: unknown = null;
  try { json = await res.json(); } catch { json = null; }
  const data = isObj(json) && isObj(json.data) ? json.data : isObj(json) ? json : {};
  return { reached: true, ok: res.ok, status: res.status, statusText: res.statusText, json, data };
}

/** `(<status> <code>): <message>` from an error body: top-level `code`/`message`, or nested under `error`. */
export function describeError(r: { status: number; statusText: string; json: unknown }): string {
  const top = isObj(r.json) ? r.json : {};
  const nested = isObj(top.error) ? top.error : isObj(top.data) ? top.data : {};
  const code = typeof top.code === 'string' ? top.code : typeof nested.code === 'string' ? nested.code : '';
  const rawMsg = top.message ?? nested.message ?? (typeof top.error === 'string' ? top.error : undefined);
  const message = Array.isArray(rawMsg) ? rawMsg.join('; ') : String(rawMsg ?? (r.statusText || 'request failed'));
  return redact(`(${r.status}${code ? ` ${code}` : ''}): ${message}`);
}
