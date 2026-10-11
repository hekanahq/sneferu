import { contextAt, exprContext, wordAt } from './context';
import { membersOf, topLevel, typeOf, type Env } from './model';
import { translationDoc } from './completion';
import { fieldDoc, filterDoc, lookupDoc, propDoc, scopeDoc, tagDoc } from './docs';

export interface HoverResult { markdown: string; start: number; end: number }

/** Markdown for the thing under the cursor: a tag, a prop, a filter, a lookup, a variable, a setting or a translation key. */
export function hover(env: Env): HoverResult | undefined {
  const { text, offset, data, theme } = env;
  // a quoted string (translation key, snippet name) is one word, dashes and dots included
  const str = stringAt(text, offset);
  const w = wordAt(text, offset);
  if (!w && !str) return undefined;
  const end = str?.end ?? w!.end;
  const c = contextAt(text, str ? str.end : w!.end);
  const res = (markdown: string | undefined, s = w?.start ?? 0, e = w?.end ?? 0) => (markdown ? { markdown, start: s, end: e } : undefined);

  if (c.k === 'tagName' && w) {
    const t = data.tags.find((x) => x.name === w.word.toLowerCase());
    return res(t && tagDoc(t, data));
  }
  if (c.k === 'attrName' && w) {
    const t = data.tags.find((x) => x.name === c.tag);
    const attr = w.word.toLowerCase().replace(/^(tablet|mobile)-/, '');
    const p = t?.props.find((x) => x.attr === attr);
    return res(t && p && propDoc(t, p));
  }
  if (c.k === 'schema') {
    if (w && /"type"\s*:\s*"[a-z_]*$/.test(c.json)) {
      const f = data.fieldTypes.find((x) => x.name === w.word);
      return res(f && `**${f.name}** · field type\n\n${f.doc}`);
    }
    return undefined;
  }
  if (c.k !== 'expr') return undefined;
  const e = exprContext(c.delim, text.slice(c.start, str ? str.end - 1 : end));
  if (str && e.k === 'string') {
    if ((e.fn === 't' || (e.fn === 'other' && /^['"]\s*\|\s*t\b/.test(text.slice(str.end - 1, str.end + 20)))) && theme) {
      return { markdown: `**${str.value}** · translation\n\n${translationDoc(theme, str.value)}`, start: str.start, end: str.end };
    }
    if (e.fn === 'render') return { markdown: `snippets/${str.value}.sneferu${theme?.snippets.includes(str.value) ? '' : ' _(missing)_'}`, start: str.start, end: str.end };
    if (e.fn === 'settings' && theme) {
      const f = theme.manifest.settings.find((x) => x.key === str.value);
      return f ? { markdown: fieldDoc(f), start: str.start, end: str.end } : undefined;
    }
    return undefined;
  }
  if (!w) return undefined;
  if (e.k === 'filter') return res(filterDoc(data, w.word));
  if (e.k === 'path') {
    if (e.base) {
      const m = membersOf(typeOf(e.base, { ...env, offset: c.start }), { ...env, offset: c.start }).find((x) => x.name === w.word);
      return res(m && (m.field ? fieldDoc(m.field) : m.doc ? `**${e.base}.${m.name}**\n\n${m.doc}` : undefined));
    }
    if (text[w.end] === '(') return res(lookupDoc(data, w.word));
    const top = topLevel({ ...env, offset: c.start }).find((x) => x.name === w.word);
    return res(scopeDoc(data, w.word) ?? (top?.doc ? `**${top.name}**\n\n${top.doc}` : undefined));
  }
  return undefined;
}

/** The quoted string literal around offset, inside {{ }} or {% %}. `start`/`end` exclude the quotes' outside: [start, end) covers value + closing quote. */
export function stringAt(text: string, offset: number): { value: string; start: number; end: number } | undefined {
  const before = text.slice(0, offset);
  const open = Math.max(before.lastIndexOf('{{'), before.lastIndexOf('{%'));
  const close = Math.max(before.lastIndexOf('}}'), before.lastIndexOf('%}'));
  if (open < 0 || close > open) return undefined;
  const ends = [text.indexOf('}}', offset), text.indexOf('%}', offset)].filter((x) => x >= 0);
  const stop = ends.length ? Math.min(...ends) : text.length;
  let q: string | null = null; let qs = 0;
  for (let i = open + 2; i < stop; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === q) {
        if (offset > qs && offset <= i) return { value: text.slice(qs + 1, i), start: qs + 1, end: i + 1 };
        q = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; qs = i; }
  }
  return undefined;
}
