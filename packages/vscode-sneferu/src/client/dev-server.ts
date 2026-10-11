import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { portFromOutput } from './reveal';
import { startProxy } from './proxy';

export type DevState = { s: 'stopped' } | { s: 'starting'; root: string } | { s: 'running'; root: string; port: number; proxyPort: number } | { s: 'failed'; root: string; message: string };

/** The first free port on 127.0.0.1 at or after `from`. */
export async function freePort(from: number): Promise<number> {
  for (let p = from; p < from + 50; p++) {
    const ok = await new Promise<boolean>((res) => {
      const s = createServer();
      s.once('error', () => res(false));
      s.listen(p, '127.0.0.1', () => s.close(() => res(true)));
    });
    if (ok) return p;
  }
  throw new Error(`no free port between ${from} and ${from + 49}`);
}

/**
 * Runs `sneferu dev` for one theme as a child process of the editor, with the
 * editor's own Node (ELECTRON_RUN_AS_NODE), so nothing needs to be installed
 * and it works the same on Linux, macOS and Windows.
 */
export class DevServer {
  state: DevState = { s: 'stopped' };
  private child?: ChildProcess;
  private proxy?: { close: () => void };
  private listeners = new Set<(s: DevState) => void>();

  constructor(private readonly node: string, private readonly log: (line: string) => void) {}

  onState(fn: (s: DevState) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private set(s: DevState) { this.state = s; for (const l of this.listeners) l(s); }

  async start(root: string, cli: string, opts: { port: number; data?: string }): Promise<DevState> {
    if ((this.state.s === 'running' || this.state.s === 'starting') && this.state.root === root) return this.state;
    this.stop();
    this.set({ s: 'starting', root });
    const port = await freePort(opts.port);
    const args = [cli, 'dev', root, '--port', String(port), ...(opts.data ? ['--data', opts.data] : [])];
    this.log(`$ sneferu dev ${root} --port ${port}${opts.data ? ` --data ${opts.data}` : ''}`);
    const child = spawn(this.node, args, { cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    this.child = child;
    return new Promise<DevState>((resolve) => {
      let out = '';
      let settled = false;
      const done = (s: DevState) => { if (!settled) { settled = true; resolve(s); } };
      const timer = setTimeout(() => { if (!settled) { this.set({ s: 'failed', root, message: 'the dev server did not start within 20 s' }); done(this.state); } }, 20_000);
      child.stdout!.on('data', async (b: Buffer) => {
        const text = b.toString();
        text.split(/\r?\n/).filter(Boolean).forEach((l) => this.log(l));
        if (settled) return;
        out += text;
        const p = portFromOutput(out);
        if (p) {
          clearTimeout(timer);
          try {
            const proxy = await startProxy(p);
            this.proxy = proxy;
            this.set({ s: 'running', root, port: p, proxyPort: proxy.port });
          } catch (e) { this.set({ s: 'failed', root, message: (e as Error).message }); }
          done(this.state);
        }
      });
      child.stderr!.on('data', (b: Buffer) => b.toString().split(/\r?\n/).filter(Boolean).forEach((l) => this.log(l)));
      child.on('error', (e) => { clearTimeout(timer); this.set({ s: 'failed', root, message: e.message }); done(this.state); });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (this.child !== child) return;
        this.child = undefined;
        this.proxy?.close(); this.proxy = undefined;
        this.log(`sneferu dev exited (${code ?? 'signal'})`);
        this.set(code === 0 || code === null ? { s: 'stopped' } : { s: 'failed', root, message: `sneferu dev exited with code ${code}` });
        done(this.state);
      });
    });
  }

  stop(): void {
    const c = this.child;
    this.child = undefined;
    this.proxy?.close(); this.proxy = undefined;
    if (c && c.exitCode === null) c.kill();
    if (this.state.s !== 'stopped') this.set({ s: 'stopped' });
  }
}
