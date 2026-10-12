import { contextAt, exprContext, wordAt } from './context';
import { stringAt } from './hover';
import { membersOf, typeOf, type Env } from './model';
import { kindOf, schemaOf } from './theme';

/** A place in a theme file: theme-relative path and a character range. */
export interface Target { rel: string; offset: number; length: number }

export function definition(env: Env): Target[] {
  const { text, offset, theme } = env;
  if (!theme) return [];
  const str = stringAt(text, offset);
  if (str) {
    const open = Math.max(text.lastIndexOf('{{', str.start), text.lastIndexOf('{%', str.start));
    const delim = text.slice(open, open + 2) as '{{' | '{%';
    const e = exprContext(delim, text.slice(open + 2, str.end - 1));
    if (e.k !== 'string') return [];
    const isT = e.fn === 't' || (e.fn === 'other' && /^['"]\s*\|\s*t\b/.test(text.slice(str.end - 1, str.end + 20)));
    if (isT) {
      return [...theme.locales.entries()].flatMap(([code, m]) => {
        const k = m.get(str.value);
        return k ? [{ rel: `locales/${code}.json`, offset: k.offset, length: k.length }] : [];
      });
    }
    if (e.fn === 'render' && theme.snippets.includes(str.value)) return [{ rel: theme.fileOf('snippets', str.value), offset: 0, length: 0 }];
    if (e.fn === 'asset_url' && theme.files.includes(`assets/${str.value}`)) return [{ rel: `assets/${str.value}`, offset: 0, length: 0 }];
    if (e.fn === 'settings') {
      const f = theme.manifest.settings.find((x) => x.key === str.value);
      return f ? [{ rel: 'theme.json', offset: f.offset, length: f.length }] : [];
    }
    return [];
  }

  const c = contextAt(text, wordAt(text, offset)?.end ?? offset);
  const w = wordAt(text, offset);
  if (!w) return [];
  if (c.k === 'schema' && env.rel && kindOf(env.rel) === 'template') {
    // "type": "hero" in a template's default sections
    const line = text.slice(text.lastIndexOf('\n', w.start) + 1, w.end + 1);
    if (/"type"\s*:\s*"[\w-]*"?$/.test(line) && theme.sections.includes(w.word)) return [{ rel: theme.fileOf('sections', w.word), offset: 0, length: 0 }];
    return [];
  }
  if (c.k === 'expr') {
    const e = exprContext(c.delim, text.slice(c.start, w.end));
    if (e.k === 'path' && e.base) {
      const m = membersOf(typeOf(e.base, env), env).find((x) => x.name === w.word);
      if (!m?.field) return [];
      const ty = typeOf(e.base, env);
      if (ty === 'settings') return [{ rel: 'theme.json', offset: m.field.offset, length: m.field.length }];
      const ownKind = env.rel ? kindOf(env.rel) : undefined;
      if ((ty === 'sectionSettings' && ownKind === 'section') || (ty === 'blockSettings' && ownKind === 'block')) return [{ rel: env.rel!, offset: m.field.offset, length: m.field.length }];
      // from a snippet: every section (or block) declaring the key
      const dir = ty === 'sectionSettings' ? 'sections' : 'blocks';
      return (dir === 'sections' ? theme.sections : theme.blocks).flatMap((n) => {
        const t = theme.text(theme.fileOf(dir, n));
        const s = t ? schemaOf(t) : undefined;
        const at = s ? s.json.indexOf(`"${w.word}"`) : -1;
        return s && at >= 0 ? [{ rel: theme.fileOf(dir, n), offset: s.offset + at, length: w.word.length + 2 }] : [];
      });
    }
  }
  return [];
}

/** Clickable references: render snippets, asset_url files and a template's section types. */
export function links(text: string, rel: string | undefined, theme: Env['theme']): Target[] {
  if (!theme) return [];
  const out: (Target & { at: number; len: number })[] = [];
  for (const m of text.matchAll(/\{%-?\s*render\s+(['"])([\w./-]+)\1/g)) {
    if (theme.snippets.includes(m[2]!)) out.push({ rel: theme.fileOf('snippets', m[2]!), offset: 0, length: 0, at: m.index! + m[0].length - m[2]!.length - 1, len: m[2]!.length });
  }
  for (const m of text.matchAll(/asset_url\(\s*(['"])([^'"]+)\1/g)) {
    if (theme.files.includes(`assets/${m[2]}`)) out.push({ rel: `assets/${m[2]}`, offset: 0, length: 0, at: m.index! + m[0].length - m[2]!.length - 1, len: m[2]!.length });
  }
  if (rel && kindOf(rel) === 'template') {
    const s = schemaOf(text);
    if (s) for (const m of s.json.matchAll(/"type"\s*:\s*"([\w-]+)"/g)) {
      if (theme.sections.includes(m[1]!)) out.push({ rel: theme.fileOf('sections', m[1]!), offset: 0, length: 0, at: s.offset + m.index! + m[0].length - m[1]!.length - 1, len: m[1]!.length });
    }
  }
  return out.map((t) => ({ rel: t.rel, offset: t.at, length: t.len }));
}
