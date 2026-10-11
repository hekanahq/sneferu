import { IR_VERSION, ENGINE_VERSION, err, warn, hasErrors, normalizeFieldLabels, normalizeLabel, validateIR, type Diagnostic, type FieldSchema, type IRNode, type TagRegistry } from '@hekana/sneferu-core';
import { checkFiles, type ThemeFile } from './files';
import { validateManifest, type Manifest } from './manifest';
import { parseTemplate } from './parser';
import { validateTemplate } from './validate';
import { lower } from './lower';
export type { ThemeFile } from './files';

export interface SectionSchema { name: { ar: string; en: string }; version: number; settings: FieldSchema; blocks?: { allowed: string[]; max: number }; presets?: unknown[] }
export interface Artifact {
  schema: 'sneferu/artifact@1'; irVersion: string; engineVersion: string; manifest: Manifest;
  layout: IRNode[]; templates: Record<string, IRNode[]>;
  sections: Record<string, { ir: IRNode[]; schema: SectionSchema }>;
  blocks: Record<string, { ir: IRNode[]; schema: SectionSchema }>;
  snippets: Record<string, IRNode[]>;
  templateSections: Record<string, { type: string; settings: Record<string, unknown>; blocks?: { type: string; settings: Record<string, unknown> }[] }[]>;
  locales: Record<string, Record<string, string>>;
  assets: { path: string; size: number; hash: string }[];
  hash: string;
}

declare const TextDecoder: new (label: string, opts: { fatal: boolean }) => { decode(b: Uint8Array): string };
const dec = new TextDecoder('utf-8', { fatal: true });

/** FNV-1a 64-bit, hex — deterministic content hash, no Node crypto (runs in browsers too). */
export function hash64(text: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) { h ^= BigInt(text.charCodeAt(i)); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0');
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A preset's name follows the same rule as a section name: "Text", { en } or { ar, en }. */
const presetLabels = (p: unknown): unknown => {
  if (!isObj(p) || p.name === undefined) return p;
  const name = normalizeLabel(p.name);
  return name ? { ...p, name } : p;
};

function asSchema(raw: unknown, file: string, out: Diagnostic[]): SectionSchema {
  const s = (isObj(raw) ? raw : {}) as Partial<Record<keyof SectionSchema, unknown>>;
  // name and setting labels may be "Text", { en } or { ar, en }; the artifact always
  // carries { ar, en }, with en standing in for a missing ar
  const name = normalizeLabel(s.name);
  if (!name) out.push(err('SN3030', '<hk-schema> needs a name: a string or { en } (ar is optional)', { file }));
  if (s.settings !== undefined && !isObj(s.settings)) out.push(err('SN3030', '<hk-schema> settings must be an object', { file }));
  const settings = normalizeFieldLabels(s.settings);
  for (const k of settings.bad) out.push(warn('SN3031', `<hk-schema> settings.${k}: label must be a string or { en } (ar is optional)`, { file }));
  return { name: name ?? { ar: file, en: file }, version: typeof s.version === 'number' ? s.version : 1, settings: settings.schema, ...(s.blocks ? { blocks: s.blocks as SectionSchema['blocks'] } : {}), ...(s.presets ? { presets: Array.isArray(s.presets) ? s.presets.map(presetLabels) : s.presets as unknown[] } : {}) };
}

/** Snippet names a tree renders, in order of first appearance. */
function rendersOf(nodes: IRNode[], out = new Set<string>()): Set<string> {
  for (const n of nodes) {
    if (n.k === 'render') out.add(n.snippet);
    else if (n.k === 'el' || n.k === 'comp') rendersOf(n.children, out);
    else if (n.k === 'loop') rendersOf(n.body, out);
    else if (n.k === 'if') { for (const b of n.branches) rendersOf(b.body, out); if (n.else) rendersOf(n.else, out); }
  }
  return out;
}

/** Every include cycle among snippets, each reported once, e.g. a → b → a. */
export function snippetCycles(snippets: Record<string, IRNode[]>): string[][] {
  const edges = new Map(Object.entries(snippets).map(([k, ir]) => [k, [...rendersOf(ir)].filter((t) => Object.hasOwn(snippets, t))]));
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (n: string): void => {
    state.set(n, 1); stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) cycles.push([...stack.slice(stack.indexOf(m)), m]);
      else if (!state.has(m)) visit(m);
    }
    stack.pop(); state.set(n, 2);
  };
  for (const n of [...edges.keys()].sort()) if (!state.has(n)) visit(n);
  return cycles;
}

export function compileTheme(files: ThemeFile[], registry: TagRegistry): { artifact?: Artifact; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = checkFiles(files);
  const text = new Map<string, string>();
  for (const f of files) {
    if (!f.path.endsWith('.sneferu') && !f.path.endsWith('.json')) continue;
    try { text.set(f.path, dec.decode(f.bytes)); } catch { diagnostics.push(err('SN3022', 'file is not valid UTF-8', { file: f.path })); }
  }
  const mt = text.get('theme.json');
  if (mt === undefined) return { diagnostics: [...diagnostics, err('SN3001', 'theme.json is missing')] };
  let manifestJson: unknown;
  try { manifestJson = JSON.parse(mt); } catch { return { diagnostics: [...diagnostics, err('SN3009', 'theme.json is not valid JSON', { file: 'theme.json' })] }; }
  const mv = validateManifest(manifestJson);
  diagnostics.push(...mv.diagnostics);

  const byDir = (dir: string) => [...text.keys()].filter((p) => p.startsWith(`${dir}/`) && p.endsWith('.sneferu')).sort();
  const nameOf = (p: string) => p.split('/').pop()!.replace(/\.sneferu$/, '');
  const snippetNames = new Set(byDir('snippets').map(nameOf));
  const knownTags = new Set([...registry.names(), 'hk-block']);

  const compileOne = (path: string, kind: 'layout' | 'template' | 'section' | 'block' | 'snippet') => {
    const parsed = parseTemplate(text.get(path)!, path);
    diagnostics.push(...parsed.diagnostics);
    const checked = hasErrors(parsed.diagnostics) ? [] : validateTemplate(parsed.nodes, { file: path, registry, snippets: snippetNames, kind });
    diagnostics.push(...checked);
    const ir = lower(parsed.nodes, registry);
    // the runtime re-checks every artifact; refuse here anything it would refuse there
    if (!hasErrors(parsed.diagnostics) && !hasErrors(checked)) diagnostics.push(...validateIR(ir, knownTags).map((d) => ({ ...d, file: path })));
    return { ir, schema: parsed.schema };
  };

  if (!text.has('layout/theme.sneferu')) diagnostics.push(err('SN3023', 'layout/theme.sneferu is missing'));
  const layout = text.has('layout/theme.sneferu') ? compileOne('layout/theme.sneferu', 'layout').ir : [];
  const sections: Artifact['sections'] = {};
  for (const p of byDir('sections')) { const c = compileOne(p, 'section'); sections[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const blocks: Artifact['blocks'] = {};
  for (const p of byDir('blocks')) { const c = compileOne(p, 'block'); blocks[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const snippets: Artifact['snippets'] = {};
  for (const p of byDir('snippets')) snippets[nameOf(p)] = compileOne(p, 'snippet').ir;
  for (const c of snippetCycles(snippets)) diagnostics.push(err('SN3027', `snippet include cycle: ${c.join(' → ')}`, { file: `snippets/${c[0]}.sneferu` }));
  const templates: Artifact['templates'] = {};
  const templateSections: Artifact['templateSections'] = {};
  for (const p of byDir('templates')) {
    const c = compileOne(p, 'template');
    const name = nameOf(p);
    templates[name] = c.ir;
    const rawSections = isObj(c.schema) ? c.schema.sections : undefined;
    const declared: Artifact['templateSections'][string] = [];
    if (rawSections !== undefined && !Array.isArray(rawSections)) diagnostics.push(err('SN3026', `template ${name}: schema sections must be an array`, { file: p }));
    else for (const s of rawSections ?? []) {
      if (!isObj(s) || typeof s.type !== 'string' || (s.settings !== undefined && !isObj(s.settings))) { diagnostics.push(err('SN3026', `template ${name}: each section needs a string type and object settings`, { file: p })); continue; }
      if (!sections[s.type]) diagnostics.push(err('SN3020', `template ${name} references unknown section '${s.type}'`, { file: p }));
      const entry: Artifact['templateSections'][string][number] = { type: s.type, settings: (s.settings ?? {}) as Record<string, unknown> };
      if (s.blocks !== undefined) {
        if (!Array.isArray(s.blocks) || s.blocks.some((b) => !isObj(b) || typeof b.type !== 'string' || (b.settings !== undefined && !isObj(b.settings)))) {
          diagnostics.push(err('SN3026', `template ${name}: section blocks must be an array of { type, settings? }`, { file: p })); continue;
        }
        const stype: string = s.type;
        const allowed = sections[stype]?.schema.blocks;
        entry.blocks = [];
        s.blocks.forEach((b: { type: string; settings?: unknown }, j: number) => {
          if (!blocks[b.type]) diagnostics.push(err('SN3028', `template ${name}: unknown block type '${b.type}'`, { file: p }));
          else if (sections[stype] && (!allowed || !allowed.allowed.includes(b.type))) diagnostics.push(err('SN3029', `template ${name}: block '${b.type}' not allowed in section '${stype}'`, { file: p }));
          else if (allowed && j >= allowed.max) diagnostics.push(err('SN3029', `template ${name}: section '${stype}' allows at most ${allowed.max} blocks`, { file: p }));
          entry.blocks!.push({ type: b.type, settings: (b.settings ?? {}) as Record<string, unknown> });
        });
      }
      declared.push(entry);
    }
    templateSections[name] = declared;
  }
  if (!templates.index) diagnostics.push(err('SN3024', 'templates/index.sneferu is missing'));

  const locales: Artifact['locales'] = {};
  for (const p of [...text.keys()].filter((x) => x.startsWith('locales/')).sort()) {
    let parsed: unknown;
    try { parsed = JSON.parse(text.get(p)!); } catch { diagnostics.push(err('SN3025', 'locale is not valid JSON', { file: p })); continue; }
    const json = parsed;
    const bad = !isObj(json) ? '(root)' : Object.keys(json).find((k) => typeof json[k] !== 'string');
    if (bad !== undefined) { diagnostics.push(err('SN3025', `locale must be a flat object of strings; "${bad}" is not a string`, { file: p })); continue; }
    locales[nameOf(p.replace(/\.json$/, '.sneferu'))] = json as Record<string, string>;
  }
  const assets = files.filter((f) => f.path.startsWith('assets/')).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => ({ path: f.path, size: f.bytes.byteLength, hash: hash64(Array.from(f.bytes, (b) => String.fromCharCode(b)).join('')) }));

  if (hasErrors(diagnostics) || !mv.manifest) return { diagnostics };
  const body = { schema: 'sneferu/artifact@1' as const, irVersion: IR_VERSION, engineVersion: ENGINE_VERSION, manifest: mv.manifest, layout, templates, sections, blocks, snippets, templateSections, locales, assets };
  return { artifact: { ...body, hash: hash64(JSON.stringify(body)) }, diagnostics };
}
