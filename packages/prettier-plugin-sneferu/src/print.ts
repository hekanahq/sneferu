import { doc, type AstPath, type Doc, type ParserOptions } from 'prettier';
import { freeBeside, innerContext, isBlockLevel, VOID_ELEMENTS, parseExpr, type WsContext, type WsNeighbor } from '@hekana/sneferu-compiler';
import { keywordOf, type Attr, type Node, type Root } from './parse';
import { formatDirective, formatExpr, type QuotePref } from './expr';
import { jsonDoc } from './json';

const { group, indent, line, softline, hardline, fill, literalline } = doc.builders;
const { replaceEndOfLine } = doc.utils;

export interface SneferuOptions extends ParserOptions<Node | Root> {
  sneferuSingleQuote: boolean;
  indentSchema: boolean;
}

interface Ctx { src: string; opts: SneferuOptions; quote: QuotePref }

/** One semantic item of a children list: a word of text, or a node the compiler keeps. */
type Item = { word: string } | { node: Node; ignore: boolean };
/**
 * What lies between two items: comments / the schema, which the compiler drops, and the
 * whitespace runs around them (runs.length === hidden.length + 1).
 */
interface Run { ws: boolean; newlines: number }
interface Gap { ws: boolean; hidden: Node[]; runs: Run[] }

const WS_SPLIT = /([ \t\n\r\f]+)/;
const IGNORE = /^<!--\s*prettier-ignore\s*-->$/;
const isWord = (x: Item | null): x is { word: string } => !!x && 'word' in x;
const neighbor = (x: Item | null): WsNeighbor => (x === null ? null : 'word' in x ? { other: true } : x.node.type === 'element' ? { el: x.node.name } : { other: true });
/** Nodes that read best on their own line when whitespace allows it. */
const blockyNode = (n: Node | undefined) => !!n && ['element', 'if', 'for', 'directive', 'schema'].includes(n.type);
const blocky = (x: Item | null) => !!x && 'node' in x && blockyNode(x.node);
/** At the edge of a parent, only block-level tags and {% %} blocks force their own line: `<p><b>x</b></p>` may stay on one line. */
const edgeBlocky = (x: Item | null) => !!x && 'node' in x && (x.node.type === 'element' ? isBlockLevel(x.node.name) : blockyNode(x.node));

const newGap = (): Gap => ({ ws: false, hidden: [], runs: [{ ws: false, newlines: 0 }] });
function split(children: Node[]): { items: Item[]; gaps: Gap[] } {
  const items: Item[] = [];
  const gaps: Gap[] = [newGap()];
  const gap = () => gaps[gaps.length - 1]!;
  let ignoreNext = false;
  const push = (it: Item) => { items.push(it); gaps.push(newGap()); };
  for (const n of children) {
    if (n.type === 'text') {
      for (const part of n.value.split(WS_SPLIT)) {
        if (part === '') continue;
        if (/^[ \t\n\r\f]+$/.test(part)) {
          const run = gap().runs[gap().runs.length - 1]!;
          gap().ws = true; run.ws = true; run.newlines = Math.max(run.newlines, (part.match(/\n/g) ?? []).length);
        } else { push({ word: part }); ignoreNext = false; }
      }
    } else if (n.type === 'comment' || n.type === 'schema') {
      gap().hidden.push(n); gap().runs.push({ ws: false, newlines: 0 });
      if (n.type === 'comment' && IGNORE.test(n.value)) ignoreNext = true;
    } else { push({ node: n, ignore: ignoreNext }); ignoreNext = false; }
  }
  return { items, gaps };
}

/** Is the whitespace in gap i (between items[i-1] and items[i]) dropped by the compiler? */
function isFree(items: Item[], i: number, ctx: WsContext, edges: boolean): boolean {
  const L = items[i - 1] ?? null; const R = items[i] ?? null;
  if (isWord(L) && isWord(R)) return false;
  if (isWord(L)) return freeBeside(neighbor(R), ctx, edges);
  if (isWord(R)) return freeBeside(neighbor(L), ctx, edges);
  return freeBeside(neighbor(L), ctx, edges) || freeBeside(neighbor(R), ctx, edges);
}

const verbatim = (s: string): Doc => replaceEndOfLine(s, literalline);

/** A children list as [startSeparator, content, sep, content, ..., endSeparator]. */
interface List { parts: Doc[]; keepSpace: boolean }
function printList(children: Node[], ctx: WsContext, edges: boolean, c: Ctx): List {
  const { items, gaps } = split(children);
  const parts: Doc[] = [];
  let keepSpace = false;
  gaps.forEach((g, i) => {
    const L = items[i - 1] ?? null; const R = items[i] ?? null;
    const free = isFree(items, i, ctx, edges);
    if (!free && g.ws) keepSpace = true;
    g.runs.forEach((run, k) => {
      // the members either side of this run: an item, an edge (null), or a comment / the schema
      const edge = L === null || R === null;
      const near = (x: Item | null) => (edge && edges ? edgeBlocky(x) : blocky(x));
      const left = k === 0 ? near(L) : blockyNode(g.hidden[k - 1]);
      const right = k === g.runs.length - 1 ? near(R) : blockyNode(g.hidden[k]);
      const inner = (k > 0 || L !== null) && (k < g.runs.length - 1 || R !== null);
      const hard: Doc = inner && run.newlines >= 2 ? BLANK : hardline;
      let sep: Doc;
      if (free) sep = g.hidden.length || left || right ? hard : softline;
      else if (run.ws) sep = run.newlines > 0 && (left || right) ? hard : line;
      else sep = '';
      parts.push(sep);
      if (k < g.hidden.length) parts.push(printNode(g.hidden[k]!, ctx, c));
    });
    if (R) parts.push(printItem(R, ctx, c));
  });
  return { parts, keepSpace };
}

const BLANK: Doc = [hardline, hardline];
const isHard = (d: Doc) => d === hardline || d === BLANK;

/**
 * Lays out [content, sep, content, …]: runs between hard breaks are filled, and the hard
 * breaks stay outside any fill (a hard break inside a fill makes Prettier re-measure the
 * next group against what follows, which would break idempotency).
 */
function layout(body: Doc[]): Doc {
  const out: Doc[] = [];
  let run: Doc[] = [];
  for (let i = 0; i < body.length; i++) {
    if (i % 2 === 1 && isHard(body[i]!)) { out.push(fill(run), body[i]!); run = []; }
    else run.push(body[i]!);
  }
  out.push(fill(run));
  return out;
}

/** An element or control-block body: `open`, the list indented, `close`. */
function wrapList({ parts, keepSpace }: List): Doc {
  // nothing inside: keep a significant space, drop a free one
  if (parts.length === 1) return keepSpace ? ' ' : '';
  return [indent([parts[0]!, layout(parts.slice(1, -1))]), parts[parts.length - 1]!];
}

function printItem(it: Item, ctx: WsContext, c: Ctx): Doc {
  if ('word' in it) return it.word;
  if (it.ignore) return verbatim(c.src.slice(it.node.start, it.node.end));
  return printNode(it.node, ctx, c);
}

function printNode(n: Node, ctx: WsContext, c: Ctx): Doc {
  switch (n.type) {
    case 'text': return n.value;
    case 'comment': return verbatim(n.value);
    case 'interp': return `{{ ${formatExpr(n.src, c.quote)} }}`;
    case 'directive': return `{% ${formatDirective(n.src, n.kw, c.quote)} %}`;
    case 'schema': {
      const j = jsonDoc(n.json);
      if (!j) return verbatim(`<hk-schema>${n.raw}</hk-schema>`);
      return c.opts.indentSchema ? ['<hk-schema>', indent([hardline, j]), hardline, '</hk-schema>'] : ['<hk-schema>', hardline, j, hardline, '</hk-schema>'];
    }
    case 'if': {
      const parts: Doc[] = [];
      for (const b of n.branches) parts.push(`{% ${formatDirective(b.src, keywordOf(b.src), c.quote)} %}`, wrapList(printList(b.body, ctx, false, c)));
      if (n.else) parts.push(`{% ${formatDirective(n.else.src, keywordOf(n.else.src), c.quote)} %}`, wrapList(printList(n.else.body, ctx, false, c)));
      parts.push(`{% ${formatDirective(n.endSrc, keywordOf(n.endSrc), c.quote)} %}`);
      return group(parts);
    }
    case 'for':
      return group([
        `{% ${formatDirective(n.src, 'for', c.quote)} %}`,
        wrapList(printList(n.body, ctx, false, c)),
        `{% ${formatDirective(n.endSrc, keywordOf(n.endSrc), c.quote)} %}`,
      ]);
    case 'element': {
      const open = printOpenTag(n, c);
      if (n.selfClosing || VOID_ELEMENTS.has(n.name.toLowerCase())) return open;
      const close = `</${n.name}>`;
      const inner = innerContext(n.name, ctx);
      if (inner === 'raw') return [open, verbatim(c.src.slice(n.openEnd, n.closeStart)), close];
      return group([open, wrapList(printList(n.children, inner, true, c)), close]);
    }
  }
}

function printOpenTag(n: Extract<Node, { type: 'element' }>, c: Ctx): Doc {
  const attrs = n.attrs.map((a) => printAttr(a, c));
  if (attrs.length === 0) return n.selfClosing ? `<${n.name} />` : `<${n.name}>`;
  return group([`<${n.name}`, indent([line, join(line, attrs)]), n.selfClosing ? [line, '/>'] : [softline, '>']]);
}

const join = doc.builders.join;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const INTERP = /\{\{([\s\S]*?)\}\}/g;

/** What the compiler makes of an attribute value: static strings and parsed expressions. */
function attrMeaning(v: string): unknown {
  const parts: unknown[] = [];
  let last = 0;
  for (const m of v.matchAll(INTERP)) {
    if (m.index! > last) parts.push(v.slice(last, m.index));
    parts.push(parseExpr(m[1]!.trim()));
    last = m.index! + m[0].length;
  }
  if (last < v.length) parts.push(v.slice(last));
  return parts;
}

function printAttr(a: Attr, c: Ctx): string {
  if (a.value === null) return a.name;
  const v = a.value;
  const pref: '"' | "'" = c.opts.singleQuote ? "'" : '"';
  const other: '"' | "'" = pref === '"' ? "'" : '"';
  for (const q of [pref, other]) {
    const nv = v.includes('{{') ? v.replace(INTERP, (_m, e: string) => `{{ ${formatExpr(e.trim(), q === '"' ? "'" : '"')} }}`) : v;
    if (!nv.includes(q) && same(attrMeaning(nv), attrMeaning(v))) return `${a.name}=${q}${nv}${q}`;
  }
  return `${a.name}=${a.quote}${v}${a.quote}`;
}

export function print(path: AstPath<Node | Root>, options: SneferuOptions): Doc {
  const root = path.node as Root;
  const c: Ctx = { src: root.source, opts: options, quote: options.sneferuSingleQuote ? "'" : '"' };
  const { parts } = printList(root.children, 'block', true, c);
  if (parts.length === 1) return '';
  return [layout(parts.slice(1, -1)), hardline];
}
