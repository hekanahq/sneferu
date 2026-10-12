import { loopVars, splitPath } from './context';
import { kindOf, schemaOf, settingsOf, type SchemaField, type ThemeIndex } from './theme';
import type { LangData } from './types';

/** A coarse type for property completion: enough to know what follows a dot. */
export type Ty =
  | 'store' | 'settings' | 'section' | 'block' | 'sectionSettings' | 'blockSettings'
  | 'blocks' | 'forloop' | 'collection' | 'products' | 'product' | 'image' | 'string' | 'unknown';

export interface Member { name: string; ty: Ty; doc?: string; field?: SchemaField }

/** What a file sees: its own schema, the theme, and the loops open at a point. */
export interface Env {
  data: LangData;
  theme?: ThemeIndex;
  rel?: string;
  text: string;
  offset: number;
}

const ownSchema = (env: Env): SchemaField[] => {
  const s = schemaOf(env.text);
  return s ? settingsOf(s.json, s.offset) : [];
};

/** Settings of every file in a folder, deduplicated by key (for snippets, which do not know their section). */
function allSettings(theme: ThemeIndex | undefined, dir: 'sections' | 'blocks'): SchemaField[] {
  if (!theme) return [];
  const seen = new Map<string, SchemaField>();
  for (const n of dir === 'sections' ? theme.sections : theme.blocks) {
    const t = theme.text(theme.fileOf(dir, n));
    const s = t ? schemaOf(t) : undefined;
    if (s) for (const f of settingsOf(s.json, s.offset)) if (!seen.has(f.key)) seen.set(f.key, f);
  }
  return [...seen.values()];
}

export function membersOf(ty: Ty, env: Env): Member[] {
  const kind = env.rel ? kindOf(env.rel) : undefined;
  const doc = (scope: string, prop: string) => env.data.scope.find((s) => s.name === scope)?.doc.includes(`${scope}.${prop}`) ? env.data.scope.find((s) => s.name === scope)!.doc : undefined;
  const fieldMembers = (fs: SchemaField[]): Member[] => fs.map((f) => ({ name: f.key, ty: f.type === 'product' || f.type === 'collection' ? 'string' : 'unknown', field: f }));
  switch (ty) {
    case 'store': return [{ name: 'name', ty: 'string', doc: 'The store name.' }];
    case 'settings': return fieldMembers(env.theme?.manifest.settings ?? []);
    case 'section': return [
      { name: 'id', ty: 'string', doc: doc('section', 'id') }, { name: 'type', ty: 'string', doc: 'The section type: its file name in sections/.' },
      { name: 'settings', ty: 'sectionSettings', doc: 'The settings declared in the section\'s <hk-schema>, defaults filled in.' },
      { name: 'blocks', ty: 'blocks', doc: 'The section\'s blocks, in order. Render each with <hk-block of="{{ block }}" />.' },
    ];
    case 'block': return [
      { name: 'id', ty: 'string' }, { name: 'type', ty: 'string', doc: 'The block type: its file name in blocks/.' },
      { name: 'settings', ty: 'blockSettings', doc: 'The settings declared in the block\'s <hk-schema>.' },
    ];
    case 'sectionSettings': return fieldMembers(kind === 'section' ? ownSchema(env) : allSettings(env.theme, 'sections'));
    case 'blockSettings': return fieldMembers(kind === 'block' ? ownSchema(env) : allSettings(env.theme, 'blocks'));
    case 'forloop': return [
      { name: 'index', ty: 'unknown', doc: 'The iteration, from 1.' }, { name: 'first', ty: 'unknown', doc: 'True on the first iteration.' },
      { name: 'last', ty: 'unknown', doc: 'True on the last iteration.' },
    ];
    case 'collection': return [{ name: 'title', ty: 'string', doc: 'The collection title.' }, { name: 'products', ty: 'products', doc: 'The products in the collection.' }];
    case 'product': return env.data.productFields.map((f) => ({ name: f.name, ty: f.name === 'image' ? 'image' : 'unknown', doc: f.doc }));
    case 'image': return [{ name: 'url', ty: 'string', doc: 'The image URL. Use `| img: 400` for a sized URL.' }];
    case 'blocks': case 'products': case 'string': return [{ name: 'size', ty: 'unknown', doc: 'The number of items (or characters).' }];
    default: return [];
  }
}

const element = (ty: Ty): Ty => (ty === 'blocks' ? 'block' : ty === 'products' ? 'product' : 'unknown');

/** The type of a path like `collection('x').products[0]`, following loop variables. */
export function typeOf(path: string, env: Env, depth = 0): Ty {
  const segs = splitPath(path);
  if (!segs.length || depth > 8) return 'unknown';
  const head = segs[0]!;
  let ty: Ty;
  const call = /^([a-z_]+)\(/.exec(head)?.[1];
  if (call) ty = call === 'collection' ? 'collection' : call === 'product' ? 'product' : call === 't' ? 'string' : 'unknown';
  else if (['store', 'settings', 'section', 'block', 'forloop'].includes(head)) ty = head as Ty;
  else if (head === 'locale' || head === 'dir') ty = 'string';
  else {
    const loop = loopVars(env.text, env.offset).reverse().find((l) => l.name === head);
    ty = loop ? element(typeOf(loop.src, env, depth + 1)) : 'unknown';
  }
  for (const s of segs.slice(1)) {
    if (s.startsWith('[')) { ty = element(ty); continue; }
    ty = membersOf(ty, env).find((m) => m.name === s)?.ty ?? 'unknown';
  }
  return ty;
}

/** Top-level names in an expression at a point. */
export function topLevel(env: Env): Member[] {
  const kind = env.rel ? kindOf(env.rel) : undefined;
  const out: Member[] = [];
  for (const s of env.data.scope) {
    if (s.name === 'section' && kind && !['section', 'block', 'snippet'].includes(kind)) continue;
    if (s.name === 'block' && kind && !['block', 'snippet'].includes(kind)) continue;
    if (s.name === 'forloop' && !loopVars(env.text, env.offset).length) continue;
    out.push({ name: s.name, ty: (['store', 'settings', 'section', 'block', 'forloop'].includes(s.name) ? s.name : 'string') as Ty, doc: `${s.doc} (${s.where})` });
  }
  for (const l of loopVars(env.text, env.offset)) out.push({ name: l.name, ty: element(typeOf(l.src, env)), doc: `Loop variable: \`{% for ${l.name} in ${l.src} %}\`` });
  return out;
}
