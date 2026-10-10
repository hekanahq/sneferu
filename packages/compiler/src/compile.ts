import { IR_VERSION, ENGINE_VERSION, err, hasErrors, type Diagnostic, type FieldSchema, type IRNode, type TagRegistry } from '@hekana/sneferu-core';
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
  templateSections: Record<string, { type: string; settings: Record<string, unknown> }[]>;
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

function asSchema(raw: unknown, file: string, out: Diagnostic[]): SectionSchema {
  const s = (isObj(raw) ? raw : {}) as Partial<SectionSchema>;
  const nameOk = isObj(s.name) && typeof (s.name as { ar?: unknown }).ar === 'string' && typeof (s.name as { en?: unknown }).en === 'string';
  if (!nameOk) out.push(err('SN3030', '<hk-schema> needs name {ar,en}', { file }));
  if (s.settings !== undefined && !isObj(s.settings)) out.push(err('SN3030', '<hk-schema> settings must be an object', { file }));
  return { name: nameOk ? s.name! : { ar: file, en: file }, version: typeof s.version === 'number' ? s.version : 1, settings: (isObj(s.settings) ? s.settings : {}) as FieldSchema, ...(s.blocks ? { blocks: s.blocks } : {}), ...(s.presets ? { presets: s.presets } : {}) };
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

  const compileOne = (path: string, kind: 'layout' | 'template' | 'section' | 'block' | 'snippet') => {
    const parsed = parseTemplate(text.get(path)!, path);
    diagnostics.push(...parsed.diagnostics);
    if (!hasErrors(parsed.diagnostics)) diagnostics.push(...validateTemplate(parsed.nodes, { file: path, registry, snippets: snippetNames, kind }));
    return { ir: lower(parsed.nodes, registry), schema: parsed.schema };
  };

  if (!text.has('layout/theme.sneferu')) diagnostics.push(err('SN3023', 'layout/theme.sneferu is missing'));
  const layout = text.has('layout/theme.sneferu') ? compileOne('layout/theme.sneferu', 'layout').ir : [];
  const sections: Artifact['sections'] = {};
  for (const p of byDir('sections')) { const c = compileOne(p, 'section'); sections[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const blocks: Artifact['blocks'] = {};
  for (const p of byDir('blocks')) { const c = compileOne(p, 'block'); blocks[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const snippets: Artifact['snippets'] = {};
  for (const p of byDir('snippets')) snippets[nameOf(p)] = compileOne(p, 'snippet').ir;
  const templates: Artifact['templates'] = {};
  const templateSections: Artifact['templateSections'] = {};
  for (const p of byDir('templates')) {
    const c = compileOne(p, 'template');
    const name = nameOf(p);
    templates[name] = c.ir;
    const rawSections = isObj(c.schema) ? c.schema.sections : undefined;
    const declared: { type: string; settings: Record<string, unknown> }[] = [];
    if (rawSections !== undefined && !Array.isArray(rawSections)) diagnostics.push(err('SN3026', `template ${name}: schema sections must be an array`, { file: p }));
    else for (const s of rawSections ?? []) {
      if (!isObj(s) || typeof s.type !== 'string' || (s.settings !== undefined && !isObj(s.settings))) { diagnostics.push(err('SN3026', `template ${name}: each section needs a string type and object settings`, { file: p })); continue; }
      if (!sections[s.type]) diagnostics.push(err('SN3020', `template ${name} references unknown section '${s.type}'`, { file: p }));
      declared.push({ type: s.type, settings: (s.settings ?? {}) as Record<string, unknown> });
    }
    templateSections[name] = declared;
  }
  if (!templates.index) diagnostics.push(err('SN3024', 'templates/index.sneferu is missing'));

  const locales: Artifact['locales'] = {};
  for (const p of [...text.keys()].filter((x) => x.startsWith('locales/')).sort()) {
    try { locales[nameOf(p.replace(/\.json$/, '.sneferu'))] = JSON.parse(text.get(p)!); } catch { diagnostics.push(err('SN3025', 'locale is not valid JSON', { file: p })); }
  }
  const assets = files.filter((f) => f.path.startsWith('assets/')).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => ({ path: f.path, size: f.bytes.byteLength, hash: hash64(Array.from(f.bytes, (b) => String.fromCharCode(b)).join('')) }));

  if (hasErrors(diagnostics) || !mv.manifest) return { diagnostics };
  const body = { schema: 'sneferu/artifact@1' as const, irVersion: IR_VERSION, engineVersion: ENGINE_VERSION, manifest: mv.manifest, layout, templates, sections, blocks, snippets, templateSections, locales, assets };
  return { artifact: { ...body, hash: hash64(JSON.stringify(body)) }, diagnostics };
}
