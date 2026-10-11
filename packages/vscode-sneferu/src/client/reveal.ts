import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTree, findNodeAtLocation } from 'jsonc-parser';

/** The template a preview path shows: `/` is index, `/__template/<name>` is <name>. */
export function templateOfPath(path: string): string {
  const m = /^\/__template\/([^/?#]+)/.exec(path);
  if (!m) return 'index';
  try { return decodeURIComponent(m[1]!); } catch { return 'index'; }
}

/**
 * The source file for a clicked element. The runtime wraps each section in
 * `data-hk-section="<id>"`; on the dev server the ids are `default-<n>`, the
 * n-th entry of the template's default sections, so the file is
 * sections/<type>.sneferu. Anything outside a section is the layout.
 */
export function sourceFor(root: string, click: { section?: string | null; block?: string | null; path: string }): { file: string; reason: string } {
  const template = templateOfPath(click.path);
  const layout = { file: join(root, 'layout', 'theme.sneferu'), reason: 'layout' };
  if (!click.section) return layout;
  const m = /^default-(\d+)$/.exec(click.section);
  const tplFile = join(root, 'templates', `${template}.sneferu`);
  if (!m || !existsSync(tplFile)) return existsSync(tplFile) ? { file: tplFile, reason: `section ${click.section}` } : layout;
  const text = readFileSync(tplFile, 'utf8');
  const open = /<hk-schema\s*>/i.exec(text);
  const close = text.indexOf('</hk-schema>');
  if (!open || close < 0) return { file: tplFile, reason: 'template' };
  const tree = parseTree(text.slice(open.index + open[0].length, close));
  const type = tree && findNodeAtLocation(tree, ['sections', Number(m[1]), 'type'])?.value;
  if (typeof type !== 'string') return { file: tplFile, reason: 'template' };
  const sec = join(root, 'sections', `${type}.sneferu`);
  return existsSync(sec) ? { file: sec, reason: `section ${type}` } : { file: tplFile, reason: `section ${type} (missing)` };
}

/**
 * The CLI to run: an explicit path, else the theme's own @hekana/sneferu
 * (node_modules up from the theme), else the one bundled with the extension.
 */
export function resolveCli(root: string, bundled: string, configured?: string): { path: string; origin: 'setting' | 'theme' | 'bundled' } {
  if (configured && existsSync(configured)) return { path: configured, origin: 'setting' };
  let d = root;
  for (let i = 0; i < 6; i++) {
    const p = join(d, 'node_modules', '@hekana', 'sneferu', 'dist', 'cli.js');
    if (existsSync(p)) return { path: p, origin: 'theme' };
    const up = join(d, '..');
    if (up === d) break;
    d = up;
  }
  return { path: bundled, origin: 'bundled' };
}

/** `Sneferu dev → http://127.0.0.1:4100 …` → 4100 */
export function portFromOutput(out: string): number | undefined {
  const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(out);
  return m ? Number(m[1]) : undefined;
}

/** theme.json basics: id and locales, for push and the preview's language toggle. */
export function manifestOf(root: string): { id?: string; locales: string[]; defaultLocale?: string } {
  try {
    const m = JSON.parse(readFileSync(join(root, 'theme.json'), 'utf8')) as { id?: unknown; locales?: unknown; defaultLocale?: unknown };
    return {
      id: typeof m.id === 'string' ? m.id : undefined,
      locales: Array.isArray(m.locales) ? m.locales.filter((x): x is string => typeof x === 'string') : [],
      defaultLocale: typeof m.defaultLocale === 'string' ? m.defaultLocale : undefined,
    };
  } catch { return { locales: [] }; }
}
