import { err, type Expr, isAllowedElement, isForbiddenAttribute, isForbiddenElement, isUrlAttribute, LIMITS, safeUrl, type Diagnostic, type HkTag, type TagRegistry } from '@hekana/sneferu-core';
import type { AstNode } from './ast';

const ATTR_NAME = /^[a-z_:][a-z0-9_:.-]*$/;
const PASSTHROUGH = (a: string) => a === 'class' || a === 'id' || a === 'role' || a === 'title' || a.startsWith('data-') || a.startsWith('aria-');
/** Interactive content cannot sit inside the card's link (the badge part renders inside it). */
const BADGE_INTERACTIVE = new Set(['a', 'button', 'details', 'label', 'hk-button', 'hk-product-card', 'hk-product-grid', 'hk-rich-text']);
const BUILTIN_HK = new Set(['hk-slot', 'hk-sections', 'hk-block', 'hk-part']);

export const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** `mobile-columns` -> { prop: 'columns', bp: 'mobile' }. */
export function propOf(attr: string): { prop: string; bp: 'base' | 'tablet' | 'mobile' } {
  const m = /^(tablet|mobile)-(.+)$/.exec(attr);
  return m ? { prop: camel(m[2]!), bp: m[1] as 'tablet' | 'mobile' } : { prop: camel(attr), bp: 'base' };
}

function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}
const suggest = (x: string, options: Iterable<string>) => {
  let best = ''; let score = Infinity;
  for (const o of options) { const s = distance(x, o); if (s < score) { score = s; best = o; } }
  return score <= 3 ? ` Did you mean "${best}"?` : '';
};
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function validateTemplate(
  nodes: AstNode[],
  opts: {
    file: string; registry: TagRegistry; snippets: ReadonlySet<string>; kind: 'layout' | 'template' | 'section' | 'block' | 'snippet';
    /** The file's own `<hk-schema>` settings (section and block files). */
    settingsSchema?: Record<string, unknown>;
    /** theme.json `settings`. */
    themeSettings?: Record<string, unknown>;
  },
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const at = (n: { loc: { line: number; col: number } }) => ({ file: opts.file, line: n.loc.line, col: n.loc.col });

  /** SN2012: a setting a template reads as a collection or a loop limit exists and has the right type. */
  const checkSetting = (p: (string | number)[], types: readonly string[], what: string, n: { loc: { line: number; col: number } }) => {
    const schema = p[0] === 'settings' ? opts.themeSettings
      : p[0] === opts.kind ? opts.settingsSchema // section.* in a section file, block.* in a block file
        : undefined; // block.settings.* in a section: the block type is only known at render time
    if (!schema) return;
    const name = String(p[p.length - 1]);
    const field = Object.hasOwn(schema, name) ? schema[name] : undefined;
    if (!field || typeof field !== 'object') { out.push(err('SN2012', `${what}: unknown setting '${name}'${suggest(name, Object.keys(schema))}`, at(n))); return; }
    const type = (field as { type?: unknown }).type;
    if (!types.includes(String(type))) out.push(err('SN2012', `${what}: setting '${name}' must be of type ${types.join(' or ')}`, at(n)));
  };
  const exprs = (e: Expr | undefined, n: { loc: { line: number; col: number } }, d = 0): void => {
    if (!e || d > LIMITS.renderDepth) return;
    switch (e.k) {
      case 'lookup':
        if (e.fn === 'collection' && e.args[0]?.k === 'path') checkSetting(e.args[0].p, ['collection'], `collection(${e.args[0].p.join('.')})`, n);
        e.args.forEach((a) => exprs(a, n, d + 1)); break;
      case 'path': exprs(e.from, n, d + 1); break;
      case 'cmp': case 'and': case 'or': exprs(e.a, n, d + 1); exprs(e.b, n, d + 1); break;
      case 'not': exprs(e.a, n, d + 1); break;
      case 'filter': exprs(e.input, n, d + 1); e.args.forEach((a) => exprs(a, n, d + 1)); break;
      default: break;
    }
  };

  /** `parent`: the registry tag whose direct children `list` are, if any (hk-part needs one that declares parts). */
  let inBadge = 0;
  const visit = (list: AstNode[], parent?: HkTag): void => {
    for (const n of list) {
      if (n.t === 'for') {
        exprs(n.src, n);
        if (n.limitExpr?.k === 'path') checkSetting(n.limitExpr.p, ['number', 'range'], `limit: ${n.limitExpr.p.join('.')}`, n);
        const lim = n.limit ?? LIMITS.loopDefault;
        if (lim > LIMITS.loopMax || lim < 1) out.push(err('SN2007', `loop limit ${lim} is invalid: loop limit must be between 1 and ${LIMITS.loopMax}`, at(n)));
        visit(n.body);
      } else if (n.t === 'interp') {
        exprs(n.expr, n);
      } else if (n.t === 'if') {
        n.branches.forEach((b) => { exprs(b.test, n); visit(b.body); });
        if (n.else) visit(n.else);
      } else if (n.t === 'render') {
        Object.values(n.args).forEach((e) => exprs(e, n));
        if (!opts.snippets.has(n.snippet)) out.push(err('SN2008', `unknown snippet '${n.snippet}'${suggest(n.snippet, opts.snippets)}`, at(n)));
      } else if (n.t === 'el') {
        if (inBadge > 0 && BADGE_INTERACTIVE.has(n.tag)) out.push(err('SN2014', `<${n.tag}> is interactive and cannot go inside the badge part of <hk-product-card>; the badge sits inside the card's link`, at(n)));
        if (!n.tag.startsWith('hk-') && !isAllowedElement(n.tag)) {
          out.push(err('SN2001', isForbiddenElement(n.tag) ? `<${n.tag}> is not allowed in themes` : `<${n.tag}> is not on the element allow-list`, at(n)));
        }
        for (const a of n.attrs) {
          a.parts.forEach((x) => typeof x !== 'string' && exprs(x, a));
          if (isForbiddenAttribute(a.name) || !ATTR_NAME.test(a.name)) out.push(err('SN2002', `attribute '${a.name}' is not allowed`, { file: opts.file, ...a.loc }));
          if (a.name === 'style' && a.parts.some((p) => typeof p !== 'string')) out.push(err('SN2009', 'style attributes cannot contain {{ }}; use classes, tokens or component props', { file: opts.file, ...a.loc }));
          if (isUrlAttribute(a.name) && a.parts.length > 0 && a.parts.every((p) => typeof p === 'string')) {
            const v = (a.parts as string[]).join('');
            if (a.name !== 'srcset' && safeUrl(v) === '#' && v.trim() !== '#') out.push(err('SN2010', `unsafe URL in ${a.name}`, { file: opts.file, ...a.loc }));
          }
        }
        if (n.tag === 'hk-slot' && opts.kind !== 'layout' && opts.kind !== 'template') out.push(err('SN2011', '<hk-slot> is only allowed in layout and templates', at(n)));
        if (n.tag === 'hk-part') {
          const parts = parent?.parts ?? [];
          if (!parent || parts.length === 0) out.push(err('SN2013', '<hk-part> is only allowed directly inside a tag that has parts (for example <hk-product-card>)', at(n)));
          else {
            const nameAttr = n.attrs.find((a) => a.name === 'name');
            const name = nameAttr && nameAttr.parts.every((p) => typeof p === 'string') ? (nameAttr.parts as string[]).join('') : undefined;
            if (name === undefined || !parts.includes(name)) out.push(err('SN2013', `<hk-part> needs a fixed name="…" that <${parent.name}> has: ${parts.join(', ')}.${name ? suggest(name, parts) : ''}`, at(n)));
          }
          for (const a of n.attrs) if (a.name !== 'name') out.push(err('SN2004', `unknown property "${a.name}" on <hk-part>; it takes only name`, { file: opts.file, ...a.loc }));
          const badge = parent?.name === 'hk-product-card' && n.attrs.some((a) => a.name === 'name' && a.parts.length === 1 && a.parts[0] === 'badge');
          if (badge) inBadge++;
          visit(n.children);
          if (badge) inBadge--;
          continue;
        }
        if (n.tag.startsWith('hk-') && !BUILTIN_HK.has(n.tag)) {
          const tag = opts.registry.get(n.tag);
          if (!tag) { out.push(err('SN2003', `unknown tag <${n.tag}>.${suggest(n.tag, opts.registry.names())}`, at(n))); visit(n.children); continue; }
          const seen = new Set<string>();
          for (const a of n.attrs) {
            if (PASSTHROUGH(a.name)) continue;
            const { prop, bp } = propOf(a.name);
            if (!tag.props[prop] || (bp !== 'base' && !tag.responsive.includes(prop))) {
              const options = Object.keys(tag.props).flatMap((p) => [kebab(p), ...(tag.responsive.includes(p) ? [`tablet-${kebab(p)}`, `mobile-${kebab(p)}`] : [])]);
              out.push(err('SN2004', `unknown property "${a.name}" on <${n.tag}>.${suggest(a.name, options)}`, { file: opts.file, ...a.loc }));
              continue;
            }
            seen.add(prop);
          }
          for (const [p, f] of Object.entries(tag.props)) if (f.required && !seen.has(p)) out.push(err('SN2005', `<${n.tag}> requires "${kebab(p)}"`, at(n)));
          const allowed = tag.allowedChildren;
          if (allowed !== '*') {
            for (const c of n.children) {
              if (c.t === 'text' && c.v.trim() === '') continue;
              const ok = (c.t === 'el' && allowed.includes(c.tag)) || (allowed.includes('#text') && (c.t === 'text' || c.t === 'interp'));
              if (!ok) out.push(err('SN2006', `<${n.tag}> does not accept ${c.t === 'el' ? `<${c.tag}>` : 'this content'} as a child`, at(c)));
            }
          }
          visit(n.children, tag);
          continue;
        }
        visit(n.children);
      }
    }
  };
  visit(nodes);
  return out;
}
