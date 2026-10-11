import { spawn } from 'node:child_process';
import { hostname } from 'node:os';
import { callApi, describeError, isBrowsableUrl, normalizeApiUrl, redact } from '../api';
import { writeCredentials } from '../credentials';

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

/** Best-effort: open the system browser. Every failure is swallowed; the URL is printed anyway. */
export function openInBrowser(url: string): void {
  try {
    const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
      : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]]
      : ['xdg-open', [url]];
    const child = spawn(cmd as string, args as string[], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch { /* no browser: the user opens the printed URL */ }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const positive = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);

/**
 * Device-code login (RFC 8628 shaped): ask for a code, let the user approve it in the
 * browser, poll until the server hands over a developer key, save it 0600. The key is
 * never printed.
 */
export async function runLogin(o: LoginOptions = {}): Promise<CommandResult> {
  const env = o.env ?? process.env;
  const log = o.log ?? ((s: string) => console.log(s));
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
  let interval = positive(started.data.interval, 5);
  const deadline = now() + positive(started.data.expiresIn, 600) * 1000;

  // Only an http(s) URL is ever handed to the system opener.
  const link = isBrowsableUrl(verificationUriComplete) ? verificationUriComplete : null;
  log(`Open ${link ?? (isBrowsableUrl(verificationUri) ? verificationUri : '(the server sent no usable link)')}`);
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
    const { key, keyPrefix, email } = polled.data;
    if (status !== 'ok' || typeof key !== 'string' || !key.startsWith('hk_dev_')) return fail('✖ login failed: unexpected response from the server');

    let path: string;
    try {
      path = writeCredentials({ apiUrl: api, key, email: typeof email === 'string' ? email : '', createdAt: new Date().toISOString() }, env);
    } catch (e) {
      return fail(`✖ could not save the key: ${(e as Error).message}`);
    }
    const lines = [`Logged in as ${String(email)}. Key ${String(keyPrefix)}… saved to ${path}`];
    if (env.HEKANA_TOKEN) lines.push('Note: HEKANA_TOKEN is set in this shell and takes precedence over the saved key. Unset it to use the key.');
    return { ok: true, output: redact(lines.join('\n')) };
  }
}
