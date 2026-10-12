import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseTemplate } from '@hekana/sneferu-compiler';
type AstNode = ReturnType<typeof parseTemplate>['nodes'][number];
import { FIELD_INSPECTORS, normalizeLabel } from '@hekana/sneferu-core';
import { COMMERCE_STRINGS } from '@hekana/sneferu-components';

const theme = fileURLToPath(new URL('../../templates-default/theme', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(theme).map((p) => relative(theme, p).split('\\').join('/'));
const sources = files.filter((p) => /\.(snf|sneferu)$/.test(p));

/** What may stay literal: punctuation, symbols and digits only; structural store routes; fixed token and layout values. */
const ALLOW = {
  text: /^[\s\p{P}\p{S}\d]*$/u,
  href: new Set(['#', '/', '/cart', '/search', '/products', '/checkout']),
};
const TEXT_PROPS = new Set(['text', 'label', 'alt', 'placeholder', 'title', 'aria-label', 'buttonlabel', 'checkoutlabel', 'subtotallabel', 'soldoutlabel', 'html']);
const COLOR_PROPS = new Set(['color', 'background']);
const LINK_PROPS = new Set(['href', 'src', 'action']);
const RENDER_TEXT_ARGS = new Set(['label', 'text', 'title', 'href', 'url']);

function lint(file: string, nodes: AstNode[], out: string[]): void {
  for (const n of nodes) {
    if (n.t === 'text') { if (n.v.trim() && !ALLOW.text.test(n.v)) out.push(`${file}: static text ${JSON.stringify(n.v.trim().slice(0, 40))}`); }
    else if (n.t === 'el') {
      for (const a of n.attrs) {
        if (a.parts.some((p) => typeof p !== 'string')) continue; // an expression: settings, locale keys, data
        const v = (a.parts as string[]).join('');
        const name = a.name.toLowerCase().replace(/-/g, '');
        if (a.name === 'aria-label' || TEXT_PROPS.has(name)) { if (v && !ALLOW.text.test(v)) out.push(`${file}: <${n.tag}> ${a.name}="${v}" is a static text`); }
        if (LINK_PROPS.has(a.name) && !ALLOW.href.has(v) && !/^#[a-z-]+$/.test(v)) out.push(`${file}: <${n.tag}> ${a.name}="${v}" is a static link`);
        if (COLOR_PROPS.has(name) && !/^theme:[a-z-]+$/.test(v)) out.push(`${file}: <${n.tag}> ${a.name}="${v}" is not a theme token`);
        if (/#[0-9a-fA-F]{3,8}\b/.test(v)) out.push(`${file}: <${n.tag}> ${a.name} has a colour literal`);
      }
      lint(file, n.children, out);
    } else if (n.t === 'if') { n.branches.forEach((b) => lint(file, b.body, out)); if (n.else) lint(file, n.else, out); }
    else if (n.t === 'for') lint(file, n.body, out);
    else if (n.t === 'render') {
      // literal strings handed to a snippet: only fixed tokens (style names), never text or links
      for (const [k, e] of Object.entries(n.args)) if (e.k === 'lit' && typeof e.v === 'string' && RENDER_TEXT_ARGS.has(k) && !ALLOW.href.has(e.v)) out.push(`${file}: render arg ${k} is a static string`);
    }
  }
}

describe('the default store has no static copy, link or colour outside settings, locale keys and tokens', () => {
  it('templates, layout, sections, blocks and snippets', () => {
    const problems: string[] = [];
    for (const f of sources) lint(f, parseTemplate(readFileSync(join(theme, f), 'utf8'), f).nodes, problems);
    expect(problems).toEqual([]);
  });
  it('the stylesheet uses theme tokens, not colour literals', () => {
    const css = readFileSync(join(theme, 'assets/theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g) ?? []).toEqual([]);
  });
  it('the linter catches what it should', () => {
    const p: string[] = [];
    lint('x', parseTemplate('<p>Hello</p><hk-button label="Go" href="/x" /><hk-section background="#fff"><hk-text text="{{ a }}" /></hk-section>{% render \'b\', label: \'Buy\' %}<a href="https://x.test">{{ a }}</a>', 'x').nodes, p);
    expect(p.length).toBe(7);
    const ok: string[] = [];
    lint('x', parseTemplate('<p>© {{ store.name }} · / —</p><hk-button label="{{ t(\'k\') }}" href="/cart" /><hk-section background="theme:accent" /><span aria-hidden="true">/</span>', 'x').nodes, ok);
    expect(ok).toEqual([]);
  });
});

describe('every section and block declares labelled, bounded settings the inspector can draw', () => {
  const schemas = files.filter((p) => /^(sections|blocks)\/.*\.(snf|sneferu)$/.test(p)).map((p) => {
    const raw = parseTemplate(readFileSync(join(theme, p), 'utf8'), p).schema as { name?: unknown; settings?: Record<string, Record<string, unknown>> };
    return { p, raw };
  });
  it('has a bilingual name, labels in both languages, defaults, and known field types', () => {
    const used = new Set<string>();
    for (const { p, raw } of schemas) {
      const name = normalizeLabel(raw.name) as { ar: string; en: string };
      expect(name, p).toBeDefined();
      expect(typeof raw.name === 'object' && (raw.name as { ar?: string }).ar, `${p} name.ar`).toBeTruthy();
      for (const [k, f] of Object.entries(raw.settings ?? {})) {
        const l = f.label as { en?: string; ar?: string };
        expect(l?.en && l?.ar, `${p} ${k} label`).toBeTruthy();
        expect(f.default, `${p} ${k} default`).not.toBeUndefined();
        expect(Object.hasOwn(FIELD_INSPECTORS, String(f.type)), `${p} ${k} type`).toBe(true);
        used.add(String(f.type));
        if (f.type === 'text' || f.type === 'textarea') expect(f.maxLength, `${p} ${k} maxLength`).toBeGreaterThan(0);
        if (f.type === 'range') { expect(f.min, `${p} ${k}`).toBeDefined(); expect(f.max, `${p} ${k}`).toBeDefined(); }
        if (f.type === 'select') expect((f.options as string[]).includes(String(f.default)), `${p} ${k} default is an option`).toBe(true);
        if (f.visible_if) expect(Object.hasOwn(raw.settings!, (f.visible_if as { setting: string }).setting), `${p} ${k} visible_if`).toBe(true);
      }
    }
    expect([...used].sort()).toEqual(expect.arrayContaining(['text', 'textarea', 'boolean', 'select', 'range', 'image', 'link', 'collection', 'color']));
  });
  it('limits repeatable blocks and every locale key used exists in both languages', () => {
    for (const { p, raw } of schemas) { const b = (raw as { blocks?: { max?: number } }).blocks; if (b) expect(b.max, p).toBeGreaterThan(0); }
    const en = JSON.parse(readFileSync(join(theme, 'locales/en.json'), 'utf8')) as Record<string, string>;
    const ar = JSON.parse(readFileSync(join(theme, 'locales/ar.json'), 'utf8')) as Record<string, string>;
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
    const keys = new Set<string>();
    for (const f of sources) for (const m of readFileSync(join(theme, f), 'utf8').matchAll(/\bt\('([a-z_]+)'\)/g)) keys.add(m[1]!);
    // keys the tags print themselves (COMMERCE_STRINGS) come with the compiler
    expect([...keys].filter((k) => !(k in en) && !(k in COMMERCE_STRINGS))).toEqual([]);
    expect(Object.keys(en).filter((k) => !keys.has(k))).toEqual([]);
  });
});
