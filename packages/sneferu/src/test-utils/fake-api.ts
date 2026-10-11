import { createServer, type IncomingMessage, type Server } from 'node:http';

export interface SeenRequest { method: string; url: string; auth: string | undefined; body: unknown }
export interface Reply { status: number; body: unknown }
/** Route key is `METHOD /path` (path without the /api/v1 prefix). A function is called per request. */
export type Handler = Reply | ((req: SeenRequest, n: number) => Reply);

export interface FakeApi { base: string; seen: SeenRequest[]; routes: Map<string, Handler>; close: () => Promise<void> }

/** A local node:http stand-in for the Hekana API, mounted at /api/v1. Unknown routes → 404. */
export async function startFakeApi(): Promise<FakeApi> {
  const seen: SeenRequest[] = [];
  const routes = new Map<string, Handler>();
  const counts = new Map<string, number>();
  const server: Server = createServer((req: IncomingMessage, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const path = (req.url ?? '').replace(/^\/api\/v1/, '');
      const entry: SeenRequest = { method: req.method ?? '', url: req.url ?? '', auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined };
      seen.push(entry);
      const key = `${entry.method} ${path}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      const h = routes.get(key);
      const reply: Reply = !h ? { status: 404, body: { success: false, message: 'not found' } } : typeof h === 'function' ? h(entry, n) : h;
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address();
  const base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/api/v1`;
  return { base, seen, routes, close: () => new Promise<void>((r) => server.close(() => r())) };
}

export const ok = (data: unknown, status = 200): Reply => ({ status, body: { success: true, data } });
export const DEV_KEY = `hk_dev_${'A1b2C3d4'}${'x'.repeat(35)}`;
