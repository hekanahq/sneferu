import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ThemeFile } from '@hekana/sneferu-compiler';

const SKIP = new Set(['node_modules', 'dist']);
/** Tooling next to a theme (npm, Prettier, editor and git files) is never part of it. */
const TOOLING = new Set(['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']);
/** Project files at the top of a theme folder: notes, licence, changelog, AI agent instructions. Never part of the theme, never pushed. */
const PROJECT_FILE = /^(readme|license|licence|changelog|agents|claude)(\.(md|txt))?$/i;
/** A top-level docs/ folder (tutorial text and screenshots) is never part of the theme either. */
const PROJECT_DIR = new Set(['docs']);
/** Reads a theme folder. `exclude` lists folders (e.g. the resolved --out) that are never read. */
export function loadTheme(dir: string, opts: { exclude?: string[] } = {}): ThemeFile[] {
  const out: ThemeFile[] = [];
  const exclude = new Set((opts.exclude ?? []).map((p) => resolve(p)));
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name) || name.startsWith('.')) continue;
      if (d === dir && (TOOLING.has(name) || PROJECT_FILE.test(name) || PROJECT_DIR.has(name))) continue;
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
