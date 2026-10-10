import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ThemeFile } from '@hekana/sneferu-compiler';

const SKIP = new Set(['node_modules', 'dist', '.git', '.sneferu-dev', '.DS_Store']);
export function loadTheme(dir: string): ThemeFile[] {
  const out: ThemeFile[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw Object.assign(new Error(`SN3002 symlinks are not allowed: ${relative(dir, p)}`), { code: 'SN3002' });
      if (st.isDirectory()) walk(p);
      else out.push({ path: relative(dir, p).split('\\').join('/'), bytes: readFileSync(p) });
    }
  };
  walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
