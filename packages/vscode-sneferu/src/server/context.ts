/** Where the cursor is in a .snf (or .sneferu) file, for completion and hover. */
export type Ctx =
  | { k: 'tagName'; prefix: string; closing: boolean; start: number }
  | { k: 'attrName'; tag: string; prefix: string; present: string[]; start: number }
  | { k: 'attrValue'; tag: string; attr: string; prefix: string; start: number }
  | { k: 'expr'; delim: '{{' | '{%'; text: string; start: number; inAttr?: { tag: string; attr: string } }
  | { k: 'schema'; json: string; jsonStart: number }
  | { k: 'text' };

/** Offset of the `<hk-schema>` body the cursor is in, if any. */
function inSchema(text: string, offset: number): number | undefined {
  const before = text.slice(0, offset);
  const open = before.lastIndexOf('<hk-schema');
  if (open < 0) return undefined;
  const gt = before.indexOf('>', open);
  if (gt < 0) return undefined;
  if (before.indexOf('</hk-schema>', open) >= 0) return undefined;
  return gt + 1;
}

/** The innermost unclosed `{{` or `{%` before offset. */
function openExpr(text: string, offset: number): { delim: '{{' | '{%'; start: number } | undefined {
  const a = text.lastIndexOf('{{', offset - 1);
  const b = text.lastIndexOf('{%', offset - 1);
  const at = Math.max(a, b);
  if (at < 0) return undefined;
  const delim = at === a ? '{{' : '{%';
  const close = delim === '{{' ? '}}' : '%}';
  const body = text.slice(at + 2, offset);
  if (body.includes(close)) return undefined;
  return { delim, start: at + 2 };
}

/** Scans an open tag `<name attr="v" …` up to the cursor. */
function openTag(text: string, offset: number): { tag: string; seg: string; start: number } | undefined {
  const lt = text.lastIndexOf('<', offset - 1);
  if (lt < 0) return undefined;
  const seg = text.slice(lt, offset);
  if (seg.startsWith('<!--')) return undefined;
  let q: string | null = null;
  let depth = 0; // inside {{ }} within a value
  for (let i = 1; i < seg.length; i++) {
    const c = seg[i]!;
    if (c === '{' && seg[i + 1] === '{') { depth++; i++; continue; }
    if (c === '}' && seg[i + 1] === '}' && depth) { depth--; i++; continue; }
    if (depth) continue;
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '>') return undefined;
  }
  const m = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)?/.exec(seg);
  return { tag: (m?.[1] ?? '').toLowerCase(), seg, start: lt };
}

export function contextAt(text: string, offset: number): Ctx {
  const schemaStart = inSchema(text, offset);
  if (schemaStart !== undefined) return { k: 'schema', json: text.slice(schemaStart, offset), jsonStart: schemaStart };

  const tag = openTag(text, offset);
  const ex = openExpr(text, offset);
  if (ex && (!tag || ex.start > tag.start)) {
    let inAttr: { tag: string; attr: string } | undefined;
    if (tag) {
      const m = /([a-zA-Z_:][\w:.-]*)\s*=\s*["'][^"']*$/.exec(text.slice(tag.start, ex.start));
      if (m) inAttr = { tag: tag.tag, attr: m[1]!.toLowerCase() };
    }
    return { k: 'expr', delim: ex.delim, text: text.slice(ex.start, offset), start: ex.start, ...(inAttr ? { inAttr } : {}) };
  }
  if (!tag) return { k: 'text' };
  const name = /^<(\/?)([a-zA-Z0-9-]*)$/.exec(tag.seg);
  if (name) return { k: 'tagName', prefix: name[2]!, closing: name[1] === '/', start: tag.start + 1 + name[1]!.length };
  const value = /([a-zA-Z_:][\w:.-]*)\s*=\s*(["'])([^"']*)$/.exec(tag.seg);
  if (value) return { k: 'attrValue', tag: tag.tag, attr: value[1]!.toLowerCase(), prefix: value[3]!, start: offset - value[3]!.length };
  const present = [...tag.seg.matchAll(/\s([a-zA-Z_:][\w:.-]*)(?=\s*=|\s|$)/g)].map((m) => m[1]!.toLowerCase());
  const prefix = /[\w:.-]*$/.exec(tag.seg)![0];
  return { k: 'attrName', tag: tag.tag, prefix, present, start: offset - prefix.length };
}

/** The expression context: what kind of name is being typed at the end of `text` (the inside of {{ }} or {% %}). */
export type ExprCtx =
  | { k: 'directive'; prefix: string }
  | { k: 'filter'; prefix: string }
  | { k: 'string'; fn: 't' | 'render' | 'asset_url' | 'settings' | 'collection' | 'product' | 'filter-t' | 'other'; prefix: string }
  | { k: 'path'; base: string; prefix: string }
  | { k: 'none' };

export function exprContext(delim: '{{' | '{%', text: string): ExprCtx {
  if (delim === '{%' && /^\s*[a-z]*$/.test(text)) return { k: 'directive', prefix: text.trim() };
  // inside a string literal?
  let q: string | null = null; let qs = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; qs = i; }
  }
  if (q) {
    const before = text.slice(0, qs);
    const prefix = text.slice(qs + 1);
    if (delim === '{%' && /^\s*render\s*$/.test(before)) return { k: 'string', fn: 'render', prefix };
    const fn = /([a-z_]+)\s*\(\s*$/.exec(before)?.[1];
    if (fn === 't' || fn === 'asset_url' || fn === 'settings' || fn === 'collection' || fn === 'product') return { k: 'string', fn, prefix };
    return { k: 'string', fn: 'other', prefix };
  }
  const f = /\|\s*([a-z_]*)$/.exec(text);
  if (f) return { k: 'filter', prefix: f[1]! };
  if (/:\s*[\w'"]*$/.test(text) && /\|\s*[a-z_]+\s*:[^|]*$/.test(text)) return { k: 'none' };
  const p = /((?:[a-zA-Z_][\w]*(?:\(\s*(?:'[^']*'|"[^"]*")?\s*\))?)(?:\.[a-zA-Z_][\w]*|\[\d+\])*)\.([\w]*)$/.exec(text);
  if (p) return { k: 'path', base: p[1]!, prefix: p[2]! };
  const id = /(?:^|[^\w.'"])([a-zA-Z_][\w]*)?$/.exec(text);
  if (id) {
    if (delim === '{%' && /^\s*for\s+[a-zA-Z_]*$/.test(text)) return { k: 'none' };
    return { k: 'path', base: '', prefix: id[1] ?? '' };
  }
  return { k: 'none' };
}

/** `a.b('x').c[0].d` → ['a', "b('x')", 'c', '[0]', 'd']. */
export function splitPath(path: string): string[] {
  return [...path.matchAll(/[a-zA-Z_][\w]*(?:\(\s*(?:'[^']*'|"[^"]*")?\s*\))?|\[\d+\]/g)].map((m) => m[0]);
}

/** Loop variables visible at offset: `{% for x in expr %}` blocks still open there, innermost last. */
export function loopVars(text: string, offset: number): { name: string; src: string }[] {
  const stack: { name: string; src: string }[] = [];
  const re = /\{%-?\s*(for\s+([a-zA-Z_]\w*)\s+in\s+([^%]*?)(?:\s+limit\s*:\s*\d+)?\s*|endfor\s*)-?%\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && m.index < offset) {
    if (m[2]) stack.push({ name: m[2], src: m[3]!.trim() });
    else stack.pop();
  }
  return stack;
}

/** The word (identifier or hk tag name) around offset. */
export function wordAt(text: string, offset: number): { word: string; start: number; end: number } | undefined {
  let s = offset; let e = offset;
  while (s > 0 && /[\w-]/.test(text[s - 1]!)) s--;
  while (e < text.length && /[\w-]/.test(text[e]!)) e++;
  return s === e ? undefined : { word: text.slice(s, e), start: s, end: e };
}

const VOID = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'source', 'track', 'wbr']);

/** Tag-name ranges of the open/close pair around offset, for linked editing (rename both at once). */
export function tagPair(text: string, offset: number): [number, number][] | undefined {
  // blank out comments, the schema and expressions so their `<` and `>` are not tags
  const clean = text.replace(/<!--[\s\S]*?-->|<hk-schema\s*>[\s\S]*?<\/hk-schema>|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g, (m) => ' '.repeat(m.length));
  const re = /<(\/?)([a-zA-Z][\w-]*)(?:[^<>"']|"[^"]*"|'[^']*')*?(\/?)>/g;
  const stack: { name: string; start: number }[] = [];
  const pairs: { open: number; close: number; name: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    const name = m[2]!.toLowerCase();
    const start = m.index + 1 + m[1]!.length;
    if (m[1]) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i]!.name === name) { pairs.push({ open: stack[i]!.start, close: start, name }); stack.length = i; break; }
    } else if (!m[3] && !VOID.has(name)) stack.push({ name, start });
  }
  const hit = pairs.find((p) => (offset >= p.open && offset <= p.open + p.name.length) || (offset >= p.close && offset <= p.close + p.name.length));
  return hit && [[hit.open, hit.open + hit.name.length], [hit.close, hit.close + hit.name.length]];
}

/** After typing `>`: the closing tag to insert, if the tag just opened needs one. */
export function closingTagFor(textBefore: string, textAfter: string): string | undefined {
  const m = /<([a-zA-Z][\w-]*)(?:[^<>"']|"[^"]*"|'[^']*')*>$/.exec(textBefore.slice(-4000));
  if (!m || m[0].endsWith('/>')) return undefined;
  const name = m[1]!.toLowerCase();
  if (VOID.has(name) || name === 'hk-schema') return undefined;
  if (textAfter.trimStart().startsWith(`</${name}`)) return undefined;
  return `</${name}>`;
}
