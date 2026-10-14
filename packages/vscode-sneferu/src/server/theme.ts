import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parseTree, findNodeAtLocation, type Node as JsonNode } from 'jsonc-parser';
import { isTemplateFile, stripTemplateExtension, TEMPLATE_EXTENSIONS } from '@hekana/sneferu-core';

/** Text of open editors, by absolute path; wins over the file on disk. */
export type Overlay = ReadonlyMap<string, string>;

export interface SchemaField { key: string; type?: string; label?: unknown; default?: unknown; options?: unknown; offset: number; length: number }
export interface Translation { value: string; offset: number; length: number }

/** The folder holding theme.json (an hk2 theme) above `file`, or undefined. */
export function findThemeRoot(file: string, stopAt?: string): string | undefined {
  let d = dirname(file);
  for (let i = 0; i < 12; i++) {
    const m = join(d, 'theme.json');
    if (existsSync(m)) {
      try { if (/"engine"\s*:\s*"hk2"/.test(readFileSync(m, 'utf8'))) return d; } catch { /* unreadable */ }
    }
    const up = dirname(d);
    if (up === d || (stopAt && !up.startsWith(stopAt))) return undefined;
    d = up;
  }
  return undefined;
}

const SKIP = new Set(['node_modules', 'dist']);
const TOOLING = new Set(['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']);
const PROJECT_FILE = /^(readme|license|licence|changelog|agents|claude)(\.(md|txt))?$/i;

/** Theme-relative paths of every file `sneferu` reads (the same rules as the CLI's loadTheme). */
export function listThemeFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    if (depth > 6) return;
    let names: string[];
    try { names = readdirSync(d); } catch { return; }
    for (const name of names) {
      if (SKIP.has(name) || name.startsWith('.')) continue;
      if (d === root && (TOOLING.has(name) || PROJECT_FILE.test(name) || name === 'docs')) continue;
      const p = join(d, name);
      let st;
      try { st = lstatSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, depth + 1);
      else out.push(relative(root, p).split(sep).join('/'));
    }
  };
  walk(root, 0);
  return out.sort();
}

/** The schema JSON of a .snf (or .sneferu) file: its text, and where it starts in the file. */
export function schemaOf(text: string): { json: string; offset: number } | undefined {
  const open = /<hk-schema\s*>/i.exec(text);
  if (!open) return undefined;
  const start = open.index + open[0].length;
  const end = text.indexOf('</hk-schema>', start);
  return { json: text.slice(start, end < 0 ? text.length : end), offset: start };
}

/** The settings a section, block or theme.json declares, with where each key is written. */
export function settingsOf(json: string, base: number, path: (string | number)[] = ['settings']): SchemaField[] {
  const tree = parseTree(json);
  const node = tree && findNodeAtLocation(tree, path);
  if (!node || node.type !== 'object') return [];
  return (node.children ?? []).flatMap((p: JsonNode) => {
    const k = p.children?.[0];
    const v = p.children?.[1];
    if (!k || typeof k.value !== 'string') return [];
    const val = (key: string) => v?.children?.find((c) => c.children?.[0]?.value === key)?.children?.[1];
    const plain = (n: JsonNode | undefined): unknown => {
      if (!n) return undefined;
      if (n.type === 'object') return Object.fromEntries((n.children ?? []).map((c) => [c.children?.[0]?.value, plain(c.children?.[1])]));
      if (n.type === 'array') return (n.children ?? []).map(plain);
      return n.value;
    };
    return [{ key: k.value, type: val('type')?.value as string | undefined, label: plain(val('label')), default: plain(val('default')), options: plain(val('options')), offset: base + k.offset, length: k.length }];
  });
}

/** A flat locale file: key → value and where the key is written. */
export function translationsOf(json: string): Map<string, Translation> {
  const out = new Map<string, Translation>();
  const tree = parseTree(json);
  if (!tree || tree.type !== 'object') return out;
  for (const p of tree.children ?? []) {
    const k = p.children?.[0];
    const v = p.children?.[1];
    if (k && typeof k.value === 'string') out.set(k.value, { value: typeof v?.value === 'string' ? v.value : '', offset: k.offset, length: k.length });
  }
  return out;
}

export interface ThemeIndex {
  root: string;
  files: string[];
  manifest: { id?: string; defaultLocale?: string; locales: string[]; settings: SchemaField[] };
  /** locale code → translations */
  locales: Map<string, Map<string, Translation>>;
  snippets: string[];
  sections: string[];
  blocks: string[];
  assets: { path: string; size: number }[];
  text: (rel: string) => string | undefined;
  /** The real file of a template, section, block or snippet: `sections/hero.snf` or `sections/hero.sneferu`. */
  fileOf: (dir: string, name: string) => string;
}

const nameOf = (p: string) => stripTemplateExtension(p.split('/').pop()!);

export function indexTheme(root: string, overlay: Overlay = new Map()): ThemeIndex {
  const files = listThemeFiles(root);
  for (const abs of overlay.keys()) {
    if (abs.startsWith(root + sep)) {
      const rel = relative(root, abs).split(sep).join('/');
      if (!files.includes(rel) && !rel.split('/').some((s) => s.startsWith('.'))) files.push(rel);
    }
  }
  const cache = new Map<string, string | undefined>();
  const text = (rel: string): string | undefined => {
    if (cache.has(rel)) return cache.get(rel);
    const abs = join(root, ...rel.split('/'));
    let t = overlay.get(abs);
    if (t === undefined) { try { t = readFileSync(abs, 'utf8'); } catch { t = undefined; } }
    cache.set(rel, t);
    return t;
  };
  const mt = text('theme.json') ?? '{}';
  let manifest: { id?: string; defaultLocale?: string; locales?: unknown } = {};
  try { manifest = JSON.parse(mt); } catch { /* reported by the compiler */ }
  const locales = new Map<string, Map<string, Translation>>();
  for (const f of files.filter((p) => /^locales\/[^/]+\.json$/.test(p))) locales.set(f.slice(8, -5), translationsOf(text(f) ?? ''));
  const inDir = (d: string) => files.filter((p) => p.startsWith(`${d}/`) && isTemplateFile(p)).map(nameOf).sort();
  const assets = files.filter((p) => p.startsWith('assets/')).map((path) => {
    let size = 0;
    try { size = statSync(join(root, ...path.split('/'))).size; } catch { /* only in an editor */ }
    return { path, size };
  });
  return {
    root, files,
    manifest: {
      id: typeof manifest.id === 'string' ? manifest.id : undefined,
      defaultLocale: typeof manifest.defaultLocale === 'string' ? manifest.defaultLocale : undefined,
      locales: Array.isArray(manifest.locales) ? manifest.locales.filter((x): x is string => typeof x === 'string') : [],
      settings: settingsOf(mt, 0),
    },
    locales,
    snippets: inDir('snippets'), sections: inDir('sections'), blocks: inDir('blocks'),
    assets, text,
    fileOf: (dir, name) => TEMPLATE_EXTENSIONS.map((e) => `${dir}/${name}${e}`).find((p) => files.includes(p)) ?? `${dir}/${name}${TEMPLATE_EXTENSIONS[0]}`,
  };
}

/** What a template file is, from its folder. */
export function kindOf(rel: string): 'layout' | 'template' | 'section' | 'block' | 'snippet' | undefined {
  const d = rel.split('/')[0];
  return d === 'layout' ? 'layout' : d === 'templates' ? 'template' : d === 'sections' ? 'section' : d === 'blocks' ? 'block' : d === 'snippets' ? 'snippet' : undefined;
}
