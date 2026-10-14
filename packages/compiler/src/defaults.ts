import type { Expr, GroupName, IRNode, IRValue, PageNode } from '@hekana/sneferu-core';
import type { Artifact, SectionSchema, TemplateSectionEntry } from './compile';

/** The SDK's default store, compiled, and its stylesheet. */
export interface FragmentSource { artifact: Artifact; css: string }

type Body = Omit<Artifact, 'hash'>;
/** The page types the default store fills in when a theme has no template for them. */
export const DEFAULT_PAGE_TYPES = ['product', 'collection', 'search', 'cart', 'checkout', 'page', '404'] as const;
/** What the SDK's sections, blocks and snippets are called in a theme that borrows them. */
const PREFIX = 'hk-';
const rn = (name: string) => `${PREFIX}${name}`;

const keysOf = <T>(o: Record<string, T> | undefined): string[] => (o ? Object.keys(o) : []);

function exprs(e: Expr | undefined, visit: (e: Expr) => void, d = 0): void {
  if (!e || d > 64) return;
  visit(e);
  switch (e.k) {
    case 'path': exprs(e.from, visit, d + 1); break;
    case 'lookup': e.args.forEach((a) => exprs(a, visit, d + 1)); break;
    case 'cmp': case 'and': case 'or': exprs(e.a, visit, d + 1); exprs(e.b, visit, d + 1); break;
    case 'not': exprs(e.a, visit, d + 1); break;
    case 'filter': exprs(e.input, visit, d + 1); e.args.forEach((a) => exprs(a, visit, d + 1)); break;
    default: break;
  }
}
function value(v: IRValue, visit: (e: Expr) => void, d: number): void {
  if (v.k === 'expr') exprs(v.e, visit, d);
  else if (v.k === 'responsive') for (const bp of ['base', 'tablet', 'mobile'] as const) { const x = v[bp]; if (x) value(x, visit, d + 1); }
}
/** Calls `visit` for every node and `expr` for every expression in the trees. */
function walk(nodes: IRNode[], onNode: (n: IRNode) => void, onExpr: (e: Expr) => void, d = 0): void {
  if (d > 64) return;
  for (const n of nodes) {
    onNode(n);
    switch (n.k) {
      case 'text': exprs(n.e, onExpr); break;
      case 'el': for (const a of n.attrs) for (const p of a.parts) if (typeof p !== 'string') exprs(p, onExpr); walk(n.children, onNode, onExpr, d + 1); break;
      case 'if': for (const b of n.branches) { exprs(b.test, onExpr); walk(b.body, onNode, onExpr, d + 1); } if (n.else) walk(n.else, onNode, onExpr, d + 1); break;
      case 'loop': exprs(n.src, onExpr); walk(n.body, onNode, onExpr, d + 1); break;
      case 'comp': for (const v of Object.values(n.props)) value(v, onExpr, 0); walk(n.children, onNode, onExpr, d + 1); break;
      case 'render': for (const e of Object.values(n.args)) exprs(e, onExpr); break;
      default: break;
    }
  }
}

/** The `hk-*` tags the trees use. */
export function collectTags(trees: IRNode[][]): Set<string> {
  const out = new Set<string>();
  for (const t of trees) walk(t, (n) => { if (n.k === 'comp') out.add(n.tag); }, () => {});
  return out;
}

/** The locale keys the trees read: `{{ t('x') }}`, `t('x')` and `'x' | t`. */
export function collectLocaleKeys(trees: IRNode[][]): Set<string> {
  const out = new Set<string>();
  const onExpr = (e: Expr) => {
    if (e.k === 'lookup' && e.fn === 't' && e.args[0]?.k === 'lit' && typeof e.args[0].v === 'string') out.add(e.args[0].v);
    if (e.k === 'filter' && e.name === 't' && e.input.k === 'lit' && typeof e.input.v === 'string') out.add(e.input.v);
  };
  for (const t of trees) walk(t, (n) => { if (n.k === 't') out.add(n.key); }, onExpr);
  return out;
}

/** The IR with every `render` renamed through `snippets`; nothing is shared with the input. */
function renameIR(nodes: IRNode[], snippets: ReadonlySet<string>): IRNode[] {
  return nodes.map((n): IRNode => {
    switch (n.k) {
      case 'render': return { ...n, snippet: snippets.has(n.snippet) ? rn(n.snippet) : n.snippet };
      case 'el': case 'comp': return { ...n, children: renameIR(n.children, snippets) } as IRNode;
      case 'loop': return { ...n, body: renameIR(n.body, snippets) };
      case 'if': return { ...n, branches: n.branches.map((b) => ({ ...b, body: renameIR(b.body, snippets) })), ...(n.else ? { else: renameIR(n.else, snippets) } : {}) };
      default: return n;
    }
  });
}
const renameSchema = (s: SectionSchema, blocks: ReadonlySet<string>): SectionSchema =>
  (s.blocks ? { ...s, blocks: { ...s.blocks, allowed: s.blocks.allowed.map((b) => (blocks.has(b) ? rn(b) : b)) } } : s);
const renameEntries = (list: TemplateSectionEntry[], sections: ReadonlySet<string>, blocks: ReadonlySet<string>, depth = 0): TemplateSectionEntry[] =>
  list.map((e) => ({ ...e, type: (depth === 0 ? sections : blocks).has(e.type) ? rn(e.type) : e.type, ...(e.blocks ? { blocks: renameEntries(e.blocks, sections, blocks, depth + 1) } : {}) }));
const renameNodes = (list: PageNode[], sections: ReadonlySet<string>, blocks: ReadonlySet<string>, depth = 0): PageNode[] =>
  list.map((n) => ({ ...n, type: (depth === 0 ? sections : blocks).has(n.type) ? rn(n.type) : n.type, ...(n.children ? { children: renameNodes(n.children, sections, blocks, depth + 1) } : {}) }));

/**
 * Adds the SDK's default store to what a theme lacks: the page templates it has no file for and the default
 * trees of the groups its layout places without a `groups/<name>.json`. Sections, blocks and snippets are
 * copied under an `hk-` name so they can never collide with the theme's own; the theme's locale texts win.
 * Pure; returns `base` itself when nothing is missing.
 */
export function applyDefaults(base: Body, frag: FragmentSource): Body {
  const f = frag.artifact;
  const missing = DEFAULT_PAGE_TYPES.filter((t) => !Object.hasOwn(base.templates, t) && Object.hasOwn(f.templates, t));
  const placed = placedIn(base.layout);
  const groupsNeeded = placed.filter((g) => base.groups[g] === undefined && f.groups[g] !== undefined);
  if (missing.length === 0 && groupsNeeded.length === 0) return base;

  // what the missing parts reach: sections, then the blocks they allow, then the snippets any of them renders
  const sectionSet = new Set<string>();
  const blockSet = new Set<string>();
  const snippetSet = new Set<string>();
  const addBlocks = (types: string[]) => { for (const b of types) if (Object.hasOwn(f.blocks, b) && !blockSet.has(b)) { blockSet.add(b); addBlocks(f.blocks[b]!.schema.blocks?.allowed ?? []); } };
  const addSection = (type: string) => { if (Object.hasOwn(f.sections, type) && !sectionSet.has(type)) { sectionSet.add(type); addBlocks(f.sections[type]!.schema.blocks?.allowed ?? []); } };
  const sectionTypes = [...missing.flatMap((t) => f.templateSections[t] ?? []).map((e) => e.type), ...groupsNeeded.flatMap((g) => (f.groups[g] ?? []).map((n) => n.type))];
  sectionTypes.forEach(addSection);
  // blocks listed in default entries are allowed by their section, but keep them reachable regardless
  const entryBlocks = (list: TemplateSectionEntry[]): string[] => list.flatMap((e) => (e.blocks ? [...e.blocks.map((b) => b.type), ...entryBlocks(e.blocks)] : []));
  addBlocks([...missing.flatMap((t) => entryBlocks(f.templateSections[t] ?? []))]);
  const trees = (): IRNode[][] => [...missing.map((t) => f.templates[t]!), ...[...sectionSet].map((s) => f.sections[s]!.ir), ...[...blockSet].map((b) => f.blocks[b]!.ir), ...[...snippetSet].map((s) => f.snippets[s]!)];
  for (let pass = 0; pass < 8; pass++) {
    const before = snippetSet.size;
    for (const t of trees()) walk(t, (n) => { if (n.k === 'render' && Object.hasOwn(f.snippets, n.snippet)) snippetSet.add(n.snippet); }, () => {});
    if (snippetSet.size === before) break;
  }

  const templates = { ...base.templates };
  const templateSections = { ...base.templateSections };
  for (const t of missing) {
    templates[t] = renameIR(f.templates[t]!, snippetSet);
    templateSections[t] = renameEntries(f.templateSections[t] ?? [], sectionSet, blockSet);
  }
  const sections = { ...base.sections };
  for (const s of sectionSet) sections[rn(s)] = { ir: renameIR(f.sections[s]!.ir, snippetSet), schema: renameSchema(f.sections[s]!.schema, blockSet) };
  const blocks = { ...base.blocks };
  for (const b of blockSet) blocks[rn(b)] = { ir: renameIR(f.blocks[b]!.ir, snippetSet), schema: renameSchema(f.blocks[b]!.schema, blockSet) };
  const snippets = { ...base.snippets };
  for (const s of snippetSet) snippets[rn(s)] = renameIR(f.snippets[s]!, snippetSet);
  const groups = { ...base.groups };
  for (const g of groupsNeeded) groups[g] = renameNodes(f.groups[g]!, sectionSet, blockSet);

  // texts: the default store's keys it reads, under the theme's own
  const used = collectLocaleKeys(trees());
  const locales: Artifact['locales'] = Object.fromEntries(Object.entries(base.locales).map(([k, v]) => [k, { ...v }]));
  for (const lang of base.manifest.locales) {
    const mine = (locales[lang] ??= {});
    const theirs = f.locales[lang] ?? {};
    for (const key of used) if (!Object.hasOwn(mine, key) && Object.hasOwn(theirs, key)) mine[key] = theirs[key]!;
  }
  const rest = { sections: [...sectionSet].map(rn) };
  return {
    ...base, templates, templateSections, sections, blocks, snippets, groups, locales,
    defaults: { templates: [...(base.defaults?.templates ?? []), ...missing], groups: [...(base.defaults?.groups ?? []), ...groupsNeeded], sections: [...(base.defaults?.sections ?? []), ...rest.sections], css: frag.css },
  };
}

function placedIn(layout: IRNode[]): GroupName[] {
  const out: GroupName[] = [];
  walk(layout, (n) => {
    if (n.k === 'comp' && n.tag === 'hk-section-group') {
      const v = n.props.name;
      if (v && v.k === 'static' && (v.v === 'header' || v.v === 'footer' || v.v === 'announcement') && !out.includes(v.v)) out.push(v.v);
    }
  }, () => {});
  return out;
}
export { keysOf };
