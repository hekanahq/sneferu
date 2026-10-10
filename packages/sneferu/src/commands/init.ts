import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STARTER = [fileURLToPath(new URL('../../starter', import.meta.url)), fileURLToPath(new URL('../starter', import.meta.url))].find(existsSync)!;
export function runInit(target: string, opts: { force?: boolean }): void {
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length > 0 && !opts.force) throw new Error(`${dir} is not empty (use --force to write anyway)`);
  mkdirSync(dir, { recursive: true });
  cpSync(STARTER, dir, { recursive: true });
  const id = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').padEnd(3, 'x').slice(0, 41);
  const mpath = join(dir, 'theme.json');
  const m = JSON.parse(readFileSync(mpath, 'utf8'));
  m.id = /^[a-z]/.test(id) ? id : `t-${id}`;
  writeFileSync(mpath, `${JSON.stringify(m, null, 2)}\n`);
}
