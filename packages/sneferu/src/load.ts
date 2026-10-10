import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ThemeFile } from '@hekana/sneferu-compiler';

const SKIP = new Set(['node_modules', 'dist', '.git', '.sneferu-dev', '.DS_Store']);
/** Reads a theme folder. `exclude` lists folders (e.g. the resolved --out) that are never read. */
export function loadTheme(dir: string, opts: { exclude?: string[] } = {}): ThemeFile[] {
  const out: ThemeFile[] = [];
  const exclude = new Set((opts.exclude ?? []).map((p) => resolve(p)));
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const p = join(d, name);
      if (exclude.has(resolve(p))) continue;
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw Object.assign(new Error(`SN3002 symlinks are not allowed: ${relative(dir, p)}`), { code: 'SN3002' });
      if (st.isDirectory()) walk(p);
      else out.push({ path: relative(dir, p).split('\\').join('/'), bytes: readFileSync(p) });
    }
  };
  walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
