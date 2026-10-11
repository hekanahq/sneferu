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
  const text = readFileSync(mpath, 'utf8');
  const next = JSON.stringify(/^[a-z]/.test(id) ? id : `t-${id}`);
  // swap the id in place, so the starter stays exactly as `sneferu format` writes it
  const out = text.replace(/("id"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}${next}`);
  if (JSON.parse(out).id !== JSON.parse(next)) throw new Error('could not set the theme id in theme.json');
  const title = id.split('-').filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
  const named = out
    .replace(/("name"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}${JSON.stringify(title)}`)
    .replace(/("description"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}"A Sneferu theme."`);
  const parsed = JSON.parse(named) as { name?: string; description?: string };
  if (parsed.name !== title || parsed.description !== 'A Sneferu theme.') throw new Error('could not set the theme name in theme.json');
  writeFileSync(mpath, named);
}
