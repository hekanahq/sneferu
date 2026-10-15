import { spawn } from 'node:child_process';
import { hostname } from 'node:os';
import { callApi, describeError, isBrowsableUrl, normalizeApiUrl, redact, sanitize } from '../api';
import { readCredentials, writeCredentials } from '../credentials';

export interface LoginOptions {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  openUrl?: (url: string) => void;
  sleep?: (ms: number) => Promise<void>;
  env?: NodeJS.ProcessEnv;
  log?: (line: string) => void;
  now?: () => number;
}
export interface CommandResult { ok: boolean; output: string }

/** `sneferu-cli on <host>`: the name shown on the approval page and in the key's name. */
export function clientName(host = hostname()): string {
  const clean = host.replace(/[^\w.-]/g, '').slice(0, 40);
  return `sneferu-cli on ${clean || 'unknown'}`;
}

/**
 * The exact command that opens `raw` in the system browser, or null when it must not be
 * opened. Only https (http only for localhost) is accepted, and no shell is ever involved:
 * on Windows `rundll32 url.dll,FileProtocolHandler` receives the URL as one argument, so
 * shell metacharacters in a server-sent URL (`|`, `&`, …) cannot run anything.
 */
export function browserCommand(raw: string, platform: NodeJS.Platform = process.platform): { cmd: string; args: string[] } | null {
  if (!isBrowsableUrl(raw)) return null;
  const href = new URL(raw).href;
  if (platform === 'win32') return { cmd: 'rundll32', args: ['url.dll,FileProtocolHandler', href] };
  if (platform === 'darwin') return { cmd: 'open', args: [href] };
  return { cmd: 'xdg-open', args: [href] };
}

/** Best-effort: open the system browser. Every failure is swallowed; the URL is printed anyway. */
export function openInBrowser(url: string): void {
  const c = browserCommand(url);
  if (!c) return;
  try {
    const child = spawn(c.cmd, c.args, { detached: true, stdio: 'ignore', shell: false });
    child.on('error', () => {});
    child.unref();
  } catch { /* no browser: the user opens the printed URL */ }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const MIN_INTERVAL_S = 5;
const MAX_EXPIRES_S = 900;
const DEV_KEY = /^hk_dev_[A-Za-z0-9_-]{43}$/;
const USER_CODE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const positive = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

/**
 * Device-code login (RFC 8628 shaped): ask for a code, let the user approve it in the
 * browser, poll until the server hands over a developer key, save it 0600. The key is
 * never printed.
 */
export async function runLogin(o: LoginOptions = {}): Promise<CommandResult> {
  const env = o.env ?? process.env;
  const print = o.log ?? ((s: string) => console.log(s));
  const log = (s: string) => print(redact(s));
  const sleep = o.sleep ?? wait;
  const now = o.now ?? Date.now;
  const fail = (output: string): CommandResult => ({ ok: false, output: redact(output) });

  const norm = normalizeApiUrl(o.apiUrl || env.HEKANA_API_URL);
  if (norm.error !== undefined) return fail(norm.error);
  const api = norm.api;

  const started = await callApi(o.fetchImpl, api, '/developer/device/code', { method: 'POST', body: { clientName: clientName() } });
  if (!started.reached) return fail(`✖ ${started.error}`);
  if (!started.ok) return fail(`✖ login could not start ${describeError(started)}`);
  const { deviceCode, userCode, verificationUri, verificationUriComplete } = started.data;
  if (typeof deviceCode !== 'string' || !deviceCode || typeof userCode !== 'string') return fail('✖ login could not start: unexpected response from the server');
  if (!USER_CODE.test(userCode)) return fail('✖ login could not start: the server sent a malformed code');
  // Clamp what the server says: never poll faster than every 5 s, never wait past 15 minutes.
  let interval = Math.max(MIN_INTERVAL_S, positive(started.data.interval, MIN_INTERVAL_S));
  const deadline = now() + Math.min(MAX_EXPIRES_S, positive(started.data.expiresIn, 600)) * 1000;

  // Only an http(s) URL is ever handed to the system opener.
  const link = isBrowsableUrl(verificationUriComplete) ? verificationUriComplete : null;
  log(`Open ${sanitize(link ?? (isBrowsableUrl(verificationUri) ? verificationUri : '(the server sent no usable link)'))}`);
  log(`Code: ${userCode}`);
  if (link) {
    try { (o.openUrl ?? openInBrowser)(link); } catch { /* printed above; the user can open it */ }
  }
  log('Waiting for approval in the browser…');

  for (;;) {
    if (now() + interval * 1000 > deadline) return fail('✖ The code expired. Run sneferu login again');
    await sleep(interval * 1000);
    const polled = await callApi(o.fetchImpl, api, '/developer/device/token', { method: 'POST', body: { deviceCode } });
    if (!polled.reached) return fail(`✖ ${polled.error}`);
    if (polled.status === 429) { interval += 5; continue; }
    if (!polled.ok) return fail(`✖ login failed ${describeError(polled)}`);
    const status = polled.data.status;
    if (status === 'authorization_pending') continue;
    if (status === 'slow_down') { interval += 5; continue; }
    if (status === 'access_denied') return fail('✖ Login was denied');
    if (status === 'expired_token') return fail('✖ The code expired. Run sneferu login again');
    const { key, keyPrefix } = polled.data;
    if (status !== 'ok' || typeof key !== 'string' || !DEV_KEY.test(key)) return fail('✖ login failed: the server did not return a valid developer key');
    const email = typeof polled.data.email === 'string' ? sanitize(polled.data.email) : '';
    const prefix = typeof keyPrefix === 'string' && sanitize(keyPrefix) ? sanitize(keyPrefix) : key.slice(0, 15);

    const previous = readCredentials(env);
    let path: string;
    try {
      path = writeCredentials({ apiUrl: api, key, email, createdAt: new Date().toISOString() }, env);
    } catch (e) {
      return fail(`✖ could not save the key: ${(e as Error).message}`);
    }
    const lines = [`Logged in${email ? ` as ${email}` : ''}. Key ${prefix}… saved to ${path}`];
    // One saved key per API: the key this login replaced is revoked (best-effort).
    if (previous && previous.key !== key && previous.apiUrl.replace(/\/+$/, '') === api) {
      const r = await callApi(o.fetchImpl, api, '/developer/keys/current/revoke', { method: 'POST', token: previous.key, body: {} });
      lines.push(r.reached && r.ok ? 'Note: previous key revoked.' : 'Note: could not revoke previous key. Revoke it at https://hekana.dev/account/keys if it is still listed.');
    }
    if (env.HEKANA_TOKEN) lines.push('Note: HEKANA_TOKEN is set in this shell and takes precedence over the saved key. Unset it to use the key.');
    return { ok: true, output: redact(lines.join('\n')) };
  }
}
