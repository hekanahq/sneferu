import { IR_VERSION, ENGINE_VERSION, GROUP_NAMES, PAGE_TYPES, err, isGroupName, parseTemplateName, warn, hasErrors, normalizeFieldLabels, normalizeLabel, tokenSettings, validateIR, sectionAllowedOn, isTemplateFile, stripTemplateExtension, TEMPLATE_EXTENSION, type Diagnostic, type FieldSchema, type GroupName, type IRNode, type PageNode, type TagRegistry } from '@hekana/sneferu-core';
import { checkFiles, IMAGE_ASSET, type ThemeFile } from './files';
import { validateManifest, type Manifest } from './manifest';
import { parseTemplate } from './parser';
import { validateTemplate } from './validate';
import { lower } from './lower';
import { checkEntries, toNodes, MAX_GROUP_SECTIONS, MAX_TEMPLATE_SECTIONS, type DefaultEntry } from './entries';
import { applyDefaults, collectLocaleKeys, collectTags, type FragmentSource } from './defaults';
import { DEFAULT_THEME_FILES } from '@hekana/sneferu-templates-default';
export type { ThemeFile } from './files';

export interface SectionSchema {
  name: { ar: string; en: string }; version: number; settings: FieldSchema; blocks?: { allowed: string[]; max: number }; presets?: unknown[];
  /** Where the builder offers the section: page types (`product`), exact alternates (`product.codes`) or groups (`header`). Absent: everywhere. */
  templates?: string[];
}
/** A default section of a template (the `<hk-schema>` `sections` list), with its blocks (and their sub-blocks). */
export interface TemplateSectionEntry { type: string; settings: Record<string, unknown>; hidden?: boolean; blocks?: TemplateSectionEntry[] }
export interface Artifact {
  schema: 'sneferu/artifact@1'; irVersion: string; engineVersion: string; manifest: Manifest;
  layout: IRNode[]; templates: Record<string, IRNode[]>;
  sections: Record<string, { ir: IRNode[]; schema: SectionSchema }>;
  blocks: Record<string, { ir: IRNode[]; schema: SectionSchema }>;
  snippets: Record<string, IRNode[]>;
  templateSections: Record<string, TemplateSectionEntry[]>;
  /** The theme's default trees for the shared groups its layout places (`groups/<name>.json`, or the SDK's defaults). */
  groups: Partial<Record<GroupName, PageNode[]>>;
  locales: Record<string, Record<string, string>>;
  /** Every locale key a merchant can override per language: the keys in the locale files plus those templates and tags read. */
  localeKeys: string[];
  /** Present when the SDK's built-in default store filled something in: which templates and groups, the `hk-` sections it added, and their CSS. */
  defaults?: { templates: string[]; groups: GroupName[]; sections: string[]; css: string };
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
  let templates: string[] | undefined;
  if (s.templates !== undefined) {
    const list = s.templates;
    const ok = Array.isArray(list) && list.length > 0 && list.length <= 40 && list.every((t) => typeof t === 'string' && (isGroupName(t) || parseTemplateName(t) !== undefined));
    if (!ok) out.push(err('SN3040', `<hk-schema> templates must be a list of page types (${PAGE_TYPES.join(', ')}, or an alternate such as product.codes) and groups (${GROUP_NAMES.join(', ')})`, { file }));
    else templates = [...new Set(list as string[])];
  }
  return { name: name ?? { ar: file, en: file }, version: typeof s.version === 'number' ? s.version : 1, settings: settings.schema, ...(s.blocks ? { blocks: s.blocks as SectionSchema['blocks'] } : {}), ...(templates ? { templates } : {}), ...(s.presets ? { presets: Array.isArray(s.presets) ? s.presets.map(presetLabels) : s.presets as unknown[] } : {}) };
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

export interface CompileOptions {
  /**
   * Fill in what the theme lacks with the SDK's default store: the cart, product, collection, search, page and 404
   * templates, and the defaults of the shared groups its layout places. Default true; pass false for tests of
   * a bare theme. The files can be replaced (tests).
   */
  defaults?: boolean | ThemeFile[];
}

export function compileTheme(files: ThemeFile[], registry: TagRegistry, options: CompileOptions = {}): { artifact?: Artifact; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = checkFiles(files);
  const text = new Map<string, string>();
  for (const f of files) {
    if (!isTemplateFile(f.path) && !f.path.endsWith('.json')) continue;
    try { text.set(f.path, dec.decode(f.bytes)); } catch { diagnostics.push(err('SN3022', 'file is not valid UTF-8', { file: f.path })); }
  }
  const mt = text.get('theme.json');
  if (mt === undefined) return { diagnostics: [...diagnostics, err('SN3001', 'theme.json is missing')] };
  let manifestJson: unknown;
  try { manifestJson = JSON.parse(mt); } catch { return { diagnostics: [...diagnostics, err('SN3009', 'theme.json is not valid JSON', { file: 'theme.json' })] }; }
  const mv = validateManifest(manifestJson);
  diagnostics.push(...mv.diagnostics);

  // the standard token settings (colours, fonts, radius, spacing, buttons, width) come with every theme; a theme's own setting of the same name wins
  const manifestTokens = isObj(manifestJson) && isObj(manifestJson.tokens) ? manifestJson.tokens : {};
  const authored: Record<string, unknown> = isObj(manifestJson) && isObj(manifestJson.settings) ? manifestJson.settings : {};
  const themeSettings: Record<string, unknown> = { ...(isObj(manifestTokens.colors) ? tokenSettings(manifestTokens as never) : {}), ...authored };
  const byDir = (dir: string) => [...text.keys()].filter((p) => p.startsWith(`${dir}/`) && isTemplateFile(p)).sort();
  const nameOf = (p: string) => stripTemplateExtension(p.split('/').pop()!);
  /** The real file of `sections/hero`: `.snf` or `.sneferu`; for a missing one, the `.snf` it should be. */
  const fileOf = (stem: string) => [...text.keys()].find((p) => isTemplateFile(p) && stripTemplateExtension(p) === stem) ?? `${stem}${TEMPLATE_EXTENSION}`;
  const snippetNames = new Set(byDir('snippets').map(nameOf));
  const knownTags = new Set([...registry.names(), 'hk-block', 'hk-part']);

  const compileOne = (path: string, kind: 'layout' | 'template' | 'section' | 'block' | 'snippet') => {
    const templateName = kind === 'template' ? nameOf(path) : undefined;
    const parsed = parseTemplate(text.get(path)!, path);
    diagnostics.push(...parsed.diagnostics);
    const own = isObj(parsed.schema) && isObj(parsed.schema.settings) ? parsed.schema.settings : {};
    const checked = hasErrors(parsed.diagnostics) ? [] : validateTemplate(parsed.nodes, { file: path, registry, snippets: snippetNames, kind,
      ...(templateName !== undefined ? { templateName } : {}),
      ...(kind === 'section' || kind === 'block' ? { settingsSchema: own } : {}), themeSettings });
    diagnostics.push(...checked);
    const ir = lower(parsed.nodes, registry);
    // the runtime re-checks every artifact; refuse here anything it would refuse there
    if (!hasErrors(parsed.diagnostics) && !hasErrors(checked)) diagnostics.push(...validateIR(ir, knownTags).map((d) => ({ ...d, file: path })));
    return { ir, schema: parsed.schema };
  };

  const layoutFile = fileOf('layout/theme');
  if (!text.has(layoutFile)) diagnostics.push(err('SN3023', `${layoutFile} is missing`));
  const layout = text.has(layoutFile) ? compileOne(layoutFile, 'layout').ir : [];
  const sections: Artifact['sections'] = {};
  for (const p of byDir('sections')) { const c = compileOne(p, 'section'); sections[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const blocks: Artifact['blocks'] = {};
  for (const p of byDir('blocks')) { const c = compileOne(p, 'block'); blocks[nameOf(p)] = { ir: c.ir, schema: asSchema(c.schema, p, diagnostics) }; }
  const snippets: Artifact['snippets'] = {};
  for (const p of byDir('snippets')) snippets[nameOf(p)] = compileOne(p, 'snippet').ir;
  for (const c of snippetCycles(snippets)) diagnostics.push(err('SN3027', `snippet include cycle: ${c.join(' → ')}`, { file: fileOf(`snippets/${c[0]}`) }));
  const templates: Artifact['templates'] = {};
  const templateSections: Artifact['templateSections'] = {};
  const entryCheck = (file: string, label: string, where: string, kind: 'template' | 'group') => ({
    file, label, where, sections, blocks, ids: kind === 'group', max: kind === 'group' ? MAX_GROUP_SECTIONS : MAX_TEMPLATE_SECTIONS,
    codes: kind === 'group' ? { unknownSection: 'SN3037', malformed: 'SN3038' } : { unknownSection: 'SN3020', malformed: 'SN3026' },
  });
  /** SN3041: a default section sits where its `templates` allow-list says it may not. */
  const checkPlacement = (entries: DefaultEntry[], where: string, file: string, label: string) => {
    for (const e of entries) {
      const schema = Object.hasOwn(sections, e.type) ? sections[e.type]!.schema : undefined;
      if (schema && !sectionAllowedOn(schema, where)) diagnostics.push(err('SN3041', `${label}: section '${e.type}' is limited to ${schema.templates!.join(', ')}, not ${where}`, { file }));
    }
  };
  for (const p of byDir('templates')) {
    const c = compileOne(p, 'template');
    const name = nameOf(p);
    if (!parseTemplateName(name)) diagnostics.push(err('SN3035', `'${p}' is not a page type: use index, product, collection, search, cart, page or 404 (product, collection and page also take an alternate: product.codes)`, { file: p }));
    templates[name] = c.ir;
    const rawSections = isObj(c.schema) ? c.schema.sections : undefined;
    const declared = checkEntries(rawSections, entryCheck(p, `template ${name}`, name, 'template'), diagnostics);
    checkPlacement(declared, name, p, `template ${name}`);
    templateSections[name] = declared as Artifact['templateSections'][string];
  }
  if (!templates.index) diagnostics.push(err('SN3024', `${fileOf('templates/index')} is missing`));

  // groups: which ones the layout places, and the theme's defaults for them
  const placed = placedGroups(layout);
  const groups: Artifact['groups'] = {};
  for (const g of GROUP_NAMES) {
    const path = `groups/${g}.json`;
    const raw = text.get(path);
    if (raw === undefined) continue;
    let json: unknown;
    try { json = JSON.parse(raw); } catch { diagnostics.push(err('SN3036', `${path} is not valid JSON`, { file: path })); continue; }
    if (!isObj(json) || (json.sections !== undefined && !Array.isArray(json.sections)) || Object.keys(json).some((k) => k !== 'sections')) {
      diagnostics.push(err('SN3036', `${path} must be { "sections": [ … ] }`, { file: path })); continue;
    }
    const entries = checkEntries(json.sections, entryCheck(path, `group ${g}`, g, 'group'), diagnostics);
    checkPlacement(entries, g, path, `group ${g}`);
    groups[g] = toNodes(entries);
    if (!placed.has(g)) diagnostics.push(warn('SN3039', `${path} is never used: ${layoutFile} has no <hk-section-group name="${g}" />`, { file: path }));
  }

  const locales: Artifact['locales'] = {};
  for (const p of [...text.keys()].filter((x) => x.startsWith('locales/')).sort()) {
    let parsed: unknown;
    try { parsed = JSON.parse(text.get(p)!); } catch { diagnostics.push(err('SN3025', 'locale is not valid JSON', { file: p })); continue; }
    const json = parsed;
    const bad = !isObj(json) ? '(root)' : Object.keys(json).find((k) => typeof json[k] !== 'string');
    if (bad !== undefined) { diagnostics.push(err('SN3025', `locale must be a flat object of strings; "${bad}" is not a string`, { file: p })); continue; }
    locales[p.split('/').pop()!.replace(/\.json$/, '')] = json as Record<string, string>;
  }
  const assets = files.filter((f) => f.path.startsWith('assets/')).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => ({ path: f.path, size: f.bytes.byteLength, hash: hash64(Array.from(f.bytes, (b) => String.fromCharCode(b)).join('')) }));

  for (const a of assets) if (!/\.css$/.test(a.path) && !IMAGE_ASSET.test(a.path)) diagnostics.push(warn('SN3034', `asset '${a.path}' is not served on the store (only images are)`, { file: a.path }));
  for (const [name, b] of Object.entries(sections)) for (const t of b.schema.blocks?.allowed ?? []) if (!Object.hasOwn(blocks, t)) diagnostics.push(err('SN3042', `section '${name}' allows block '${t}', which is not in blocks/`, { file: fileOf(`sections/${name}`) }));
  for (const [name, b] of Object.entries(blocks)) for (const t of b.schema.blocks?.allowed ?? []) if (!Object.hasOwn(blocks, t)) diagnostics.push(err('SN3042', `block '${name}' allows block '${t}', which is not in blocks/`, { file: fileOf(`blocks/${name}`) }));

  if (hasErrors(diagnostics) || !mv.manifest) return { diagnostics };
  const manifest = { ...mv.manifest, settings: { ...tokenSettings(mv.manifest.tokens), ...mv.manifest.settings } };
  let body: Omit<Artifact, 'hash'> = { schema: 'sneferu/artifact@1' as const, irVersion: IR_VERSION, engineVersion: ENGINE_VERSION, manifest, layout, templates, sections, blocks, snippets, templateSections, groups, locales, localeKeys: [], assets };
  if (options.defaults !== false) {
    const frag = fragmentOf(registry, Array.isArray(options.defaults) ? options.defaults : DEFAULT_THEME_FILES);
    if (frag) body = applyDefaults(body, frag);
  }
  body = withLocaleKeys(body, registry);
  return { artifact: { ...body, hash: hash64(JSON.stringify(body)) }, diagnostics };
}

/** The groups a layout places with <hk-section-group name="…" />. */
function placedGroups(layout: IRNode[], out = new Set<GroupName>()): Set<GroupName> {
  for (const n of layout) {
    if (n.k === 'comp') {
      if (n.tag === 'hk-section-group') { const v = n.props.name; if (v && v.k === 'static' && isGroupName(v.v)) out.add(v.v); }
      placedGroups(n.children, out);
    } else if (n.k === 'el') placedGroups(n.children, out);
    else if (n.k === 'loop') placedGroups(n.body, out);
    else if (n.k === 'if') { for (const b of n.branches) placedGroups(b.body, out); if (n.else) placedGroups(n.else, out); }
  }
  return out;
}
export { placedGroups };

/** The words the tags a theme uses print, and every locale key a merchant can override. */
function withLocaleKeys(body: Omit<Artifact, 'hash'>, registry: TagRegistry): Omit<Artifact, 'hash'> {
  const locales: Artifact['locales'] = Object.fromEntries(Object.entries(body.locales).map(([k, v]) => [k, { ...v }]));
  const langs = body.manifest.locales;
  for (const lang of langs) locales[lang] ??= {};
  const trees = [body.layout, ...Object.values(body.templates), ...Object.values(body.snippets), ...Object.values(body.sections).map((x) => x.ir), ...Object.values(body.blocks).map((x) => x.ir)];
  for (const name of collectTags(trees)) {
    const strings = registry.get(name)?.strings;
    if (!strings) continue;
    for (const [key, text] of Object.entries(strings)) for (const lang of langs) if (!Object.hasOwn(locales[lang]!, key)) locales[lang]![key] = text[lang];
  }
  const keys = new Set<string>(collectLocaleKeys(trees));
  for (const l of Object.values(locales)) for (const k of Object.keys(l)) keys.add(k);
  return { ...body, locales, localeKeys: [...keys].sort() };
}

// the default store, compiled once per registry
const FRAGMENTS = new WeakMap<TagRegistry, Map<ThemeFile[], FragmentSource | null>>();
function fragmentOf(registry: TagRegistry, files: ThemeFile[]): FragmentSource | undefined {
  let byFiles = FRAGMENTS.get(registry);
  if (!byFiles) FRAGMENTS.set(registry, (byFiles = new Map()));
  if (!byFiles.has(files)) {
    const r = compileTheme(files, registry, { defaults: false });
    const css = files.find((f) => f.path === 'assets/theme.css');
    byFiles.set(files, r.artifact ? { artifact: r.artifact, css: css ? dec.decode(css.bytes) : '' } : null);
  }
  return byFiles.get(files) ?? undefined;
}

/**
 * Fills a stored artifact (one compiled before the SDK shipped its default store) with the same defaults
 * compileTheme adds: the missing page templates and the defaults of the groups its layout places.
 * Returns the artifact unchanged when nothing is missing or the default store does not compile with `registry`.
 */
export function withDefaults(artifact: Artifact, registry: TagRegistry, files: ThemeFile[] = DEFAULT_THEME_FILES): Artifact {
  const frag = fragmentOf(registry, files);
  if (!frag) return artifact;
  const { hash: _hash, ...rest } = artifact;
  const filled = withLocaleKeys(applyDefaults({ ...rest, groups: rest.groups ?? {}, localeKeys: rest.localeKeys ?? [] }, frag), registry);
  return filled.defaults === undefined && artifact.defaults === undefined && Array.isArray(artifact.localeKeys) ? artifact : { ...filled, hash: hash64(JSON.stringify(filled)) };
}
