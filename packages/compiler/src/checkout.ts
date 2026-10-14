import {
  CHECKOUT_ALLOWED_TAGS, CHECKOUT_DATA_HEADS, isCheckoutLinkAllowed, CHECKOUT_DENIED_FILTERS, CHECKOUT_DENIED_LOOKUPS, CHECKOUT_LAYOUT_TAG, CHECKOUT_PART_TAGS, CHECKOUT_TAGS, err, isCheckoutTag, parseTemplateName,
  type Diagnostic, type Expr,
} from '@hekana/sneferu-core';
import type { AstNode } from './ast';
import type { SectionSchema } from './compile';

/** One parsed file the pass may read. */
export interface CheckoutFile { path: string; nodes: AstNode[] }
export interface CheckoutInput {
  /** `templates/checkout`, when the theme has one. */
  template?: CheckoutFile;
  /** Every section file, by section name, with its schema. */
  sections: Record<string, CheckoutFile & { schema: SectionSchema }>;
  blocks: Record<string, CheckoutFile & { schema: SectionSchema }>;
  snippets: Record<string, CheckoutFile>;
  /** The layout and every template but `checkout`: files that may never hold a checkout tag. */
  others: CheckoutFile[];
  /** The default sections of the checkout template (`<hk-schema>` `sections`), by type, in order; blocks of them are not needed. */
  defaultSections: string[];
}

type At = { file: string; line: number; col: number };
const BUILTIN = new Set(['hk-slot', 'hk-sections', 'hk-block', 'hk-part']);
/** Elements and tags a layout may sit inside: page structure only, never a link, a toggle or a figure. */
const LAYOUT_ANCESTORS = new Set(['div', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav', 'hk-section', 'hk-container', 'hk-stack', 'hk-grid', 'hk-card']);
const MEDIA_DENIED = new Set(['audio', 'video', 'track']);
const SETTING_DENIED = new Set(['product', 'collection']);
const PAGE_DATA = new Set(['product', 'collection', 'search', 'paginate', 'page', 'cart', 'order', 'customer', 'checkout']);
const hint = (head: string) => (PAGE_DATA.has(head) ? ' (the checkout page has no page, cart, order or customer data)' : ' (a checkout section reads only settings, section, block, store, request and localization)');

/** The privileged checkout tags a section's file holds (used by the builder to show them locked). */
export function privilegedTagsOf(nodes: AstNode[]): string[] {
  const found = new Set<string>();
  const visit = (list: AstNode[]) => {
    for (const n of list) {
      if (n.t === 'el') { if (isCheckoutTag(n.tag)) found.add(n.tag); visit(n.children); }
      else if (n.t === 'if') { n.branches.forEach((b) => visit(b.body)); if (n.else) visit(n.else); }
      else if (n.t === 'for') visit(n.body);
    }
  };
  visit(nodes);
  return CHECKOUT_TAGS.filter((t) => found.has(t));
}

/**
 * The checkout boundary (spec section 10). The checkout page is `templates/checkout` plus the sections that list
 * `checkout` in their `templates`. On those files, and on the blocks and snippets they reach: only layout,
 * typography, image and link tags and the privileged `hk-checkout-*` tags; no media players; no data from
 * the catalogue, the cart or the customer; no `money` filter. The privileged tags may appear in the page's own
 * files only, once each, parts directly inside the layout, and the page needs a layout with `hk-checkout-payment`.
 */
export function checkCheckout(input: CheckoutInput): Diagnostic[] {
  const out: Diagnostic[] = [];
  const checkoutSections = Object.entries(input.sections).filter(([, s]) => s.schema.templates?.some((t) => parseTemplateName(t)?.type === 'checkout' && !t.includes('.')) === true);
  const pageFiles: CheckoutFile[] = [...(input.template ? [input.template] : []), ...checkoutSections.map(([, s]) => s)];
  const pagePaths = new Set(pageFiles.map((f) => f.path));

  // 1) privileged tags anywhere else
  const everywhere: CheckoutFile[] = [...Object.values(input.sections), ...Object.values(input.blocks), ...Object.values(input.snippets), ...input.others];
  const anyTag = (list: AstNode[], visit: (n: Extract<AstNode, { t: 'el' }>, parent: string | undefined) => void, parent?: string): void => {
    for (const n of list) {
      if (n.t === 'el') { visit(n, parent); anyTag(n.children, visit, n.tag); }
      else if (n.t === 'if') { n.branches.forEach((b) => anyTag(b.body, visit, parent)); if (n.else) anyTag(n.else, visit, parent); }
      else if (n.t === 'for') anyTag(n.body, visit, parent);
    }
  };
  const at = (f: CheckoutFile, n: { loc: { line: number; col: number } }): At => ({ file: f.path, line: n.loc.line, col: n.loc.col });
  for (const f of everywhere) {
    if (pagePaths.has(f.path)) continue;
    anyTag(f.nodes, (n) => { if (isCheckoutTag(n.tag)) out.push(err('SN2030', `<${n.tag}> belongs on the checkout page only: use it in templates/checkout or in a section whose <hk-schema> templates lists "checkout"`, at(f, n))); });
  }

  // the layout's ancestors inside each page file
  const ancestry = (list: AstNode[], f: CheckoutFile, stack: string[]): void => {
    for (const n of list) {
      if (n.t === 'el') {
        if (n.tag === CHECKOUT_LAYOUT_TAG) for (const a of stack) if (!LAYOUT_ANCESTORS.has(a)) out.push(err('SN2041', `<${CHECKOUT_LAYOUT_TAG}> cannot sit inside <${a}>: only page structure (div, section, main, article, aside, header, footer, nav, hk-section, hk-container, hk-stack, hk-grid, hk-card) may surround it`, at(f, n)));
        ancestry(n.children, f, [...stack, n.tag]);
      } else if (n.t === 'if') { n.branches.forEach((b) => ancestry(b.body, f, stack)); if (n.else) ancestry(n.else, f, stack); }
      else if (n.t === 'for') ancestry(n.body, f, stack);
    }
  };
  for (const f of pageFiles) ancestry(f.nodes, f, []);

  // 2) the page's own files: counts, placement
  const total = new Map<string, number>();
  for (const f of pageFiles) {
    const here = new Map<string, number>();
    anyTag(f.nodes, (n, parent) => {
      if (!isCheckoutTag(n.tag)) return;
      here.set(n.tag, (here.get(n.tag) ?? 0) + 1);
      if (here.get(n.tag)! > 1) out.push(err('SN2031', `<${n.tag}> appears twice in this file; each checkout tag is used once`, at(f, n)));
      if (n.tag !== CHECKOUT_LAYOUT_TAG && parent !== CHECKOUT_LAYOUT_TAG) out.push(err('SN2033', `<${n.tag}> must be a direct child of <${CHECKOUT_LAYOUT_TAG}>`, at(f, n)));
    });
    // the default composition (the template and the sections it seeds) must not repeat a tag either
    const seededHere = f === input.template || checkoutSections.some(([name, s]) => s === f && input.defaultSections.includes(name));
    if (seededHere) for (const [t] of here) total.set(t, (total.get(t) ?? 0) + 1);
  }
  for (const [t, n] of total) if (n > 1) out.push(err('SN2031', `<${t}> is placed ${n} times by the checkout template and its default sections; each checkout tag is used once`, { file: input.template?.path ?? pageFiles[0]!.path }));
  // payment (inside a layout) is required of the default composition: only when the theme brings its own checkout files
  if (input.template || checkoutSections.length > 0) {
    const composed = [...(input.template ? [input.template] : []), ...checkoutSections.filter(([name]) => input.defaultSections.includes(name)).map(([, s]) => s)];
    let layout = false; let payment = false;
    for (const f of composed) anyTag(f.nodes, (n) => { if (n.tag === CHECKOUT_LAYOUT_TAG) layout = true; if (n.tag === CHECKOUT_PART_TAGS.payment) payment = true; });
    if (input.template && (!layout || !payment)) out.push(err('SN2032', `the checkout page needs <${CHECKOUT_LAYOUT_TAG}> holding <${CHECKOUT_PART_TAGS.payment} />: place them in templates/checkout or in a section it lists by default`, { file: input.template.path }));
  }

  // 3) what the page's files, and what they reach, may contain
  const blocksOf = (s: SectionSchema): string[] => s.blocks?.allowed ?? [];
  const reachedBlocks = new Set<string>();
  const addBlocks = (names: string[]) => { for (const b of names) if (Object.hasOwn(input.blocks, b) && !reachedBlocks.has(b)) { reachedBlocks.add(b); addBlocks(blocksOf(input.blocks[b]!.schema)); } };
  for (const [, s] of checkoutSections) addBlocks(blocksOf(s.schema));
  // snippet args are names bound inside the snippet: collected from the calls on the way
  const snippetArgs = new Map<string, Set<string>>();
  const reachedSnippets = new Set<string>();
  const renders = (list: AstNode[], into: string[]): void => {
    for (const n of list) {
      if (n.t === 'render') { into.push(n.snippet); const a = snippetArgs.get(n.snippet) ?? new Set<string>(); Object.keys(n.args).forEach((k) => a.add(k)); snippetArgs.set(n.snippet, a); }
      else if (n.t === 'el') renders(n.children, into);
      else if (n.t === 'if') { n.branches.forEach((b) => renders(b.body, into)); if (n.else) renders(n.else, into); }
      else if (n.t === 'for') renders(n.body, into);
    }
  };
  const queue: string[] = [];
  for (const f of [...pageFiles, ...[...reachedBlocks].map((b) => input.blocks[b]!)]) renders(f.nodes, queue);
  while (queue.length) {
    const s = queue.pop()!;
    if (reachedSnippets.has(s) || !Object.hasOwn(input.snippets, s)) continue;
    reachedSnippets.add(s);
    renders(input.snippets[s]!.nodes, queue);
  }

  const check = (f: CheckoutFile, base: ReadonlySet<string>): void => {
    const bound = new Map<string, number>();
    for (const b of base) bound.set(b, 1);
    const isBound = (h: string) => (bound.get(h) ?? 0) > 0;
    const expr = (e: Expr | undefined, where: At, d = 0): void => {
      if (!e || d > 64) return;
      switch (e.k) {
        case 'path':
          if (!e.from && typeof e.p[0] === 'string' && !isBound(e.p[0]) && !CHECKOUT_DATA_HEADS.includes(e.p[0])) out.push(err('SN2035', `'${e.p[0]}' is not available on the checkout page${hint(e.p[0])}`, where));
          expr(e.from, where, d + 1); break;
        case 'lookup':
          if (CHECKOUT_DENIED_LOOKUPS.includes(e.fn)) out.push(err('SN2035', `${e.fn}() reads the catalogue, which the checkout page does not have`, where));
          e.args.forEach((a) => expr(a, where, d + 1)); break;
        case 'cmp': case 'and': case 'or': expr(e.a, where, d + 1); expr(e.b, where, d + 1); break;
        case 'not': expr(e.a, where, d + 1); break;
        case 'filter':
          if (CHECKOUT_DENIED_FILTERS.includes(e.name)) out.push(err('SN2035', `the '${e.name}' filter prints prices; the checkout page never shows a price or total of its own (the platform prints them)`, where));
          expr(e.input, where, d + 1); e.args.forEach((a) => expr(a, where, d + 1)); break;
        default: break;
      }
    };
    const visit = (list: AstNode[], parent?: string): void => {
      for (const n of list) {
        if (n.t === 'interp') expr(n.expr, at(f, n));
        else if (n.t === 'if') { n.branches.forEach((b) => { expr(b.test, at(f, n)); visit(b.body, parent); }); if (n.else) visit(n.else, parent); }
        else if (n.t === 'for') { expr(n.src, at(f, n)); if (n.limitExpr) expr(n.limitExpr, at(f, n)); bound.set(n.as, (bound.get(n.as) ?? 0) + 1); visit(n.body, parent); bound.set(n.as, bound.get(n.as)! - 1); }
        else if (n.t === 'render') Object.values(n.args).forEach((e) => expr(e, at(f, n)));
        else if (n.t === 'el') {
          if (n.tag.startsWith('hk-')) {
            // a checkout tag outside the page's own files is reported by SN2030
            const ok = BUILTIN.has(n.tag) || CHECKOUT_ALLOWED_TAGS.includes(n.tag) || isCheckoutTag(n.tag);
            if (!ok) out.push(err('SN2034', `<${n.tag}> is not allowed on the checkout page: it takes layout, typography, image and link tags (${CHECKOUT_ALLOWED_TAGS.join(', ')}) and the checkout tags`, at(f, n)));
          } else if (MEDIA_DENIED.has(n.tag)) out.push(err('SN2036', `<${n.tag}> is not allowed on the checkout page`, at(f, n)));
          for (const a of n.attrs) {
            for (const p of a.parts) if (typeof p !== 'string') expr(p, { file: f.path, ...a.loc });
            if (a.name === 'style') out.push(err('SN2039', 'inline style is not allowed on the checkout page: use classes and the theme CSS', { file: f.path, ...a.loc }));
            if (!n.tag.startsWith('hk-') && (a.name.startsWith('data-hk-') || a.name === 'id' || a.name === 'name')) out.push(err('SN2040', `attribute '${a.name}' is reserved on the checkout page (it names the platform's own elements)`, { file: f.path, ...a.loc }));
            if ((a.name === 'href' || a.name.endsWith(':href')) && a.parts.length > 0 && a.parts.every((p) => typeof p === 'string') && !isCheckoutLinkAllowed((a.parts as string[]).join(''))) {
              out.push(err('SN2038', `a link on the checkout page cannot lead off the store: use a store path, mailto:, tel: or a chat or social https link (the page never prints any other)`, { file: f.path, ...a.loc }));
            }
          }
          visit(n.children, n.tag);
        }
      }
    };
    visit(f.nodes);
  };
  const BASE = new Set<string>();
  for (const f of pageFiles) check(f, BASE);
  for (const b of reachedBlocks) check(input.blocks[b]!, BASE);
  for (const s of reachedSnippets) check(input.snippets[s]!, snippetArgs.get(s) ?? BASE);

  // 4) pickers of catalogue items make no sense on the page
  for (const [name, s] of checkoutSections) {
    for (const [k, f] of Object.entries(s.schema.settings)) if (SETTING_DENIED.has(f.type)) out.push(err('SN2037', `section '${name}' lists "checkout" in templates and has a ${f.type} setting '${k}'; the checkout page has no catalogue`, { file: s.path }));
  }
  return out;
}
