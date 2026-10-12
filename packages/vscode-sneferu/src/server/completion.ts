import { CompletionItemKind, InsertTextFormat, MarkupKind, type CompletionItem } from 'vscode-languageserver/node';
import { ALLOWED_ELEMENTS } from '@hekana/sneferu-core';
import { contextAt, exprContext } from './context';
import { membersOf, topLevel, typeOf, type Env } from './model';
import { kindOf } from './theme';
import { tagUrl, type LangData, type PropDoc, type TagDoc } from './types';
import { fieldDoc, propDoc, tagDoc } from './docs';

const md = (value: string) => ({ kind: MarkupKind.Markdown, value });
const PASSTHROUGH = ['class', 'id', 'role', 'title'];
const COLOR_TOKENS = ['primary', 'secondary', 'accent', 'background', 'text'];

const valueSnippet = (p: PropDoc, n = 1) =>
  p.options?.length ? `\${${n}|${p.options.join(',')}|}` : p.type === 'boolean' ? `\${${n}|true,false|}` : `$${n}`;

function tagItem(t: TagDoc, data: LangData): CompletionItem {
  const req = t.props.filter((p) => p.required);
  const attrs = req.map((p, i) => ` ${p.attr}="${valueSnippet(p, i + 1)}"`).join('');
  const empty = Array.isArray(t.allowedChildren) && t.allowedChildren.length === 0;
  const body = t.name === 'hk-schema' ? '>\n\t{\n\t\t"name": "$1",\n\t\t"settings": {$0}\n\t}\n</hk-schema>' : empty ? `${attrs} />` : `${attrs}>$0</${t.name}>`;
  return {
    label: t.name, kind: CompletionItemKind.Class, detail: `${t.label} · ${t.category}`,
    documentation: md(tagDoc(t, data)), insertText: `${t.name}${body}`, insertTextFormat: InsertTextFormat.Snippet,
    sortText: `0${t.name}`,
  };
}

export function complete(env: Env): CompletionItem[] {
  const { data, text, offset, theme } = env;
  const c = contextAt(text, offset);
  const tagOf = (name: string) => data.tags.find((t) => t.name === name);

  if (c.k === 'tagName') {
    if (c.closing) return [];
    const kind = env.rel ? kindOf(env.rel) : undefined;
    return [
      ...data.tags.filter((t) => !(t.name === 'hk-slot' || t.name === 'hk-sections') || kind === 'layout' || kind === 'template' || !kind).map((t) => tagItem(t, data)),
      ...ALLOWED_ELEMENTS.map((e): CompletionItem => ({ label: e, kind: CompletionItemKind.Property, detail: 'HTML element', sortText: `1${e}` })),
    ];
  }

  if (c.k === 'attrName') {
    const t = tagOf(c.tag);
    const items: CompletionItem[] = [];
    if (t) {
      for (const p of t.props) {
        const names = [p.attr, ...(p.responsive ? [`tablet-${p.attr}`, `mobile-${p.attr}`] : [])];
        for (const n of names) {
          if (c.present.includes(n)) continue;
          items.push({
            label: n, kind: CompletionItemKind.Field, detail: `${p.type}${p.required ? ' · required' : ''}${n !== p.attr ? ` · ${n.split('-')[0]}` : ''}`,
            documentation: md(propDoc(t, p)), insertText: `${n}="${valueSnippet(p)}"`, insertTextFormat: InsertTextFormat.Snippet,
            sortText: `${p.required ? 0 : n === p.attr ? 1 : 2}${n}`,
          });
        }
      }
    }
    if (c.tag !== 'hk-schema') for (const n of PASSTHROUGH) if (!c.present.includes(n)) items.push({ label: n, kind: CompletionItemKind.Field, detail: 'passthrough attribute', insertText: `${n}="$1"`, insertTextFormat: InsertTextFormat.Snippet, sortText: `3${n}` });
    return items;
  }

  if (c.k === 'attrValue') {
    const t = tagOf(c.tag);
    const attr = c.attr.replace(/^(tablet|mobile)-/, '');
    const p = t?.props.find((x) => x.attr === attr);
    if (!p) return [];
    const opts = p.options ?? (p.type === 'boolean' ? ['true', 'false'] : p.type === 'color' ? COLOR_TOKENS.map((k) => `theme:${k}`) : []);
    return opts.map((o) => ({ label: o, kind: CompletionItemKind.EnumMember, detail: p.label, sortText: o === String(p.default) ? `0${o}` : `1${o}` }));
  }

  if (c.k === 'schema') return schemaCompletion(c.json, data);

  if (c.k !== 'expr') return [];
  const e = exprContext(c.delim, c.text);
  if (e.k === 'directive') {
    const D: [string, string, string][] = [
      ['if', 'if ${1:condition} %}$0{% endif', 'Render the body when the condition is true.'],
      ['elsif', 'elsif ${1:condition}', 'Another condition inside {% if %}.'],
      ['else', 'else', 'The fallback branch of {% if %}.'],
      ['endif', 'endif', 'Closes {% if %}.'],
      ['for', 'for ${1:item} in ${2:collection(\'featured\').products} %}$0{% endfor', 'Loop over an array (default limit 50, maximum 250).'],
      ['endfor', 'endfor', 'Closes {% for %}.'],
      ['render', "render '${1:snippet}'", 'Render snippets/<name>.snf, with optional `key: value` arguments.'],
    ];
    return D.map(([label, insert, doc]) => ({ label, kind: CompletionItemKind.Keyword, documentation: md(doc), insertText: insert, insertTextFormat: InsertTextFormat.Snippet }));
  }
  if (e.k === 'filter') {
    return data.filters.map((f) => ({
      label: f.name, kind: CompletionItemKind.Function, detail: f.args && f.args !== 'none' ? `filter · ${f.args}` : 'filter',
      documentation: md(f.doc), insertText: f.args && f.args !== 'none' && !/optional|default/.test(f.args) ? `${f.name}: $1` : f.name, insertTextFormat: InsertTextFormat.Snippet,
    }));
  }
  if (e.k === 'string') {
    if (e.fn === 't' || e.fn === 'other') {
      // a bare string only gets keys when it is followed by `| t`
      if (e.fn === 'other' && !/^[^'"]*['"]\s*\|\s*t\b/.test(text.slice(offset, offset + 80))) return [];
      const loc = theme && (theme.locales.get(theme.manifest.defaultLocale ?? 'en') ?? [...theme.locales.values()][0]);
      if (!theme || !loc) return [];
      return [...loc.entries()].map(([k, v]) => ({ label: k, kind: CompletionItemKind.Text, detail: v.value, documentation: md(translationDoc(theme, k)) }));
    }
    if (e.fn === 'render') return (theme?.snippets ?? []).map((s) => ({ label: s, kind: CompletionItemKind.File, detail: theme!.fileOf('snippets', s) }));
    if (e.fn === 'asset_url') return (theme?.assets ?? []).map((a) => ({ label: a.path.slice(7), kind: CompletionItemKind.File, detail: `${Math.ceil(a.size / 1024)} KB` }));
    if (e.fn === 'settings') return (theme?.manifest.settings ?? []).map((f) => ({ label: f.key, kind: CompletionItemKind.Variable, detail: f.type, documentation: md(fieldDoc(f)) }));
    return [];
  }
  if (e.k === 'path') {
    if (e.base) {
      return membersOf(typeOf(e.base, env), env).map((m) => ({
        label: m.name, kind: m.field ? CompletionItemKind.Variable : CompletionItemKind.Property,
        detail: m.field ? `setting · ${m.field.type ?? ''}` : undefined,
        documentation: m.field ? md(fieldDoc(m.field)) : m.doc ? md(m.doc) : undefined,
      }));
    }
    const items: CompletionItem[] = topLevel(env).map((m) => ({ label: m.name, kind: CompletionItemKind.Variable, documentation: m.doc ? md(m.doc) : undefined, sortText: `0${m.name}` }));
    for (const l of data.lookups) {
      items.push({ label: l.name, kind: CompletionItemKind.Function, detail: l.signature, documentation: md(l.doc), insertText: `${l.name}('$1')`, insertTextFormat: InsertTextFormat.Snippet, sortText: `1${l.name}`, command: { title: 'suggest', command: 'editor.action.triggerSuggest' } });
    }
    for (const k of ['and', 'or', 'not', 'true', 'false', 'nil']) items.push({ label: k, kind: CompletionItemKind.Keyword, sortText: `2${k}` });
    return items;
  }
  return [];
}

export function translationDoc(theme: { locales: Map<string, Map<string, { value: string }>> }, key: string): string {
  return [...theme.locales.entries()].map(([code, m]) => `**${code}**: ${m.get(key)?.value ?? '_missing_'}`).join('  \n');
}

/** Inside <hk-schema>: field types after `"type": "`, field keys inside a setting. */
function schemaCompletion(json: string, data: LangData): CompletionItem[] {
  if (/"type"\s*:\s*"[a-z_]*$/.test(json)) {
    return data.fieldTypes.map((f) => ({ label: f.name, kind: CompletionItemKind.EnumMember, documentation: md(f.doc) }));
  }
  if (/[{,]\s*"[a-zA-Z_]*$/.test(json)) {
    const top = ['name', 'version', 'settings', 'blocks', 'presets', 'sections'];
    const depth = [...json].reduce((d, ch) => d + (ch === '{' ? 1 : ch === '}' ? -1 : 0), 0);
    const keys = depth <= 1 ? top : depth >= 3 ? data.fieldKeys : [];
    return keys.map((k) => ({ label: k, kind: CompletionItemKind.Property }));
  }
  return [];
}

export { tagUrl };
