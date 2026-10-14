import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseTemplate } from '@hekana/sneferu-compiler';
export type AstNode = ReturnType<typeof parseTemplate>['nodes'][number];

export const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (f === 'node_modules' || f.startsWith('.') ? [] : statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
export const themeFiles = (dir: string): string[] => walk(dir).map((p) => relative(dir, p).split('\\').join('/'));

/** What may stay literal: punctuation, symbols and digits only; structural store routes; fixed token and layout values. */
export const ALLOW = {
  text: /^[\s\p{P}\p{S}\d]*$/u,
  href: new Set(['#', '/', '/cart', '/search', '/products', '/checkout']),
};
const TEXT_PROPS = new Set(['text', 'label', 'alt', 'placeholder', 'title', 'aria-label', 'buttonlabel', 'checkoutlabel', 'subtotallabel', 'soldoutlabel', 'html']);
const COLOR_PROPS = new Set(['color', 'background']);
const LINK_PROPS = new Set(['href', 'src', 'action']);
const RENDER_TEXT_ARGS = new Set(['label', 'text', 'title', 'href', 'url']);

export function lint(file: string, nodes: AstNode[], out: string[]): void {
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

