/**
 * A format-preserving parser for `.sneferu` files. It tokenizes exactly like the
 * compiler's lexer (same rules, same order), but keeps comments, quotes and
 * offsets, and refuses anything the compiler would only recover from: the
 * formatter never guesses what a broken file meant.
 */
import { VOID_ELEMENTS } from '@hekana/sneferu-compiler';

export interface Attr { name: string; value: string | null; quote: '"' | "'" | '' }
interface Base { start: number; end: number }
export type Node =
  | (Base & { type: 'text'; value: string })
  | (Base & { type: 'comment'; value: string })
  | (Base & { type: 'interp'; src: string })
  | (Base & { type: 'directive'; kw: string; src: string })
  | (Base & { type: 'schema'; json: string; raw: string })
  | (Base & { type: 'element'; name: string; attrs: Attr[]; selfClosing: boolean; children: Node[]; openEnd: number; closeStart: number })
  | (Base & { type: 'if'; branches: { src: string; body: Node[] }[]; else?: { src: string; body: Node[] }; endSrc: string })
  | (Base & { type: 'for'; src: string; body: Node[]; endSrc: string });
export interface Root extends Base { type: 'root'; children: Node[]; source: string }

type Tok =
  | (Base & { t: 'text'; v: string })
  | (Base & { t: 'comment'; v: string })
  | (Base & { t: 'interp'; src: string })
  | (Base & { t: 'dir'; src: string })
  | (Base & { t: 'open'; name: string; attrs: Attr[]; selfClosing: boolean })
  | (Base & { t: 'close'; name: string })
  | (Base & { t: 'schema'; json: string; raw: string });

export class SneferuSyntaxError extends Error {
  loc: { start: { line: number; column: number } };
  constructor(message: string, src: string, offset: number) {
    const before = src.slice(0, offset).split('\n');
    const line = before.length; const column = before[before.length - 1]!.length + 1;
    super(`${message} (${line}:${column})`);
    this.loc = { start: { line, column } };
  }
}

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let text = ''; let textStart = 0;
  const fail = (m: string, at = i): never => { throw new SneferuSyntaxError(m, src, at); };
  const flush = () => { if (text) toks.push({ t: 'text', v: text, start: textStart, end: i }); text = ''; };
  const at = (s: string) => src.startsWith(s, i);
  while (i < src.length) {
    if (at('<!--')) {
      flush();
      const end = src.indexOf('-->', i);
      if (end === -1) fail('unterminated <!-- comment');
      toks.push({ t: 'comment', v: src.slice(i, end + 3), start: i, end: end + 3 });
      i = end + 3; continue;
    }
    if (at('{{') || at('{%')) {
      flush();
      const isInterp = at('{{');
      const end = src.indexOf(isInterp ? '}}' : '%}', i + 2);
      if (end === -1) fail(`unterminated ${isInterp ? '{{' : '{%'}`);
      const inner = src.slice(i + 2, end).trim();
      toks.push(isInterp ? { t: 'interp', src: inner, start: i, end: end + 2 } : { t: 'dir', src: inner, start: i, end: end + 2 });
      i = end + 2; continue;
    }
    if (at('<hk-schema>')) {
      flush();
      const end = src.indexOf('</hk-schema>', i);
      if (end === -1) fail('unterminated <hk-schema>');
      const raw = src.slice(i + '<hk-schema>'.length, end);
      toks.push({ t: 'schema', json: raw.trim(), raw, start: i, end: end + '</hk-schema>'.length });
      i = end + '</hk-schema>'.length; continue;
    }
    if (at('</')) {
      const m = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(src.slice(i));
      if (m) { flush(); toks.push({ t: 'close', name: m[1]!, start: i, end: i + m[0].length }); i += m[0].length; continue; }
    }
    if (src[i] === '<' && /[a-zA-Z]/.test(src[i + 1] ?? '')) {
      flush();
      const start = i;
      i++;
      let name = '';
      while (i < src.length && /[a-zA-Z0-9-]/.test(src[i]!)) name += src[i++];
      const attrs: Attr[] = [];
      let selfClosing = false; let closed = false;
      while (i < src.length) {
        while (/\s/.test(src[i] ?? '')) i++;
        if (at('/>')) { selfClosing = true; i += 2; closed = true; break; }
        if (src[i] === '>') { i++; closed = true; break; }
        let aName = '';
        while (i < src.length && /[^\s=/>"']/.test(src[i]!)) aName += src[i++];
        if (!aName) fail(`unexpected '${src[i]}' in <${name}>`);
        let value: string | null = null; let quote: Attr['quote'] = '';
        if (src[i] === '=') {
          i++;
          const q = src[i];
          if (q === '"' || q === "'") {
            const end = src.indexOf(q, i + 1);
            if (end === -1) fail(`unterminated value for ${aName}`);
            value = src.slice(i + 1, end); quote = q; i = end + 1;
          } else {
            value = '';
            while (i < src.length && /[^\s>]/.test(src[i]!)) value += src[i++];
          }
        }
        attrs.push({ name: aName, value, quote });
      }
      if (!closed) fail(`unterminated tag <${name}>`, start);
      toks.push({ t: 'open', name, attrs, selfClosing, start, end: i });
      continue;
    }
    if (!text) textStart = i;
    text += src[i++];
  }
  flush();
  return toks;
}

type Frame =
  | { kind: 'root'; body: Node[] }
  | { kind: 'el'; node: Extract<Node, { type: 'element' }>; body: Node[] }
  | { kind: 'if'; node: Extract<Node, { type: 'if' }>; body: Node[] }
  | { kind: 'for'; node: Extract<Node, { type: 'for' }>; body: Node[] };

/** The compiler's own keyword split. */
export const keywordOf = (src: string): string => src.split(/\s+/)[0] ?? '';

export function parse(src: string): Root {
  const root: Root = { type: 'root', children: [], start: 0, end: src.length, source: src };
  const stack: Frame[] = [{ kind: 'root', body: root.children }];
  const top = () => stack[stack.length - 1]!;
  const fail = (m: string, at: number): never => { throw new SneferuSyntaxError(m, src, at); };
  for (const tok of lex(src)) {
    switch (tok.t) {
      case 'text': top().body.push({ type: 'text', value: tok.v, start: tok.start, end: tok.end }); break;
      case 'comment': top().body.push({ type: 'comment', value: tok.v, start: tok.start, end: tok.end }); break;
      case 'interp': top().body.push({ type: 'interp', src: tok.src, start: tok.start, end: tok.end }); break;
      case 'schema': top().body.push({ type: 'schema', json: tok.json, raw: tok.raw, start: tok.start, end: tok.end }); break;
      case 'open': {
        const node: Extract<Node, { type: 'element' }> = { type: 'element', name: tok.name, attrs: tok.attrs, selfClosing: tok.selfClosing, children: [], start: tok.start, end: tok.end, openEnd: tok.end, closeStart: tok.end };
        top().body.push(node);
        if (!tok.selfClosing && !VOID_ELEMENTS.has(tok.name.toLowerCase())) stack.push({ kind: 'el', node, body: node.children });
        break;
      }
      case 'close': {
        const f = top();
        if (f.kind !== 'el' || f.node.name.toLowerCase() !== tok.name.toLowerCase()) fail(`</${tok.name}> does not close the open ${f.kind === 'el' ? `<${f.node.name}>` : f.kind === 'root' ? 'nothing' : `{% ${f.kind} %}`}`, tok.start);
        const el = (f as Extract<Frame, { kind: 'el' }>).node;
        el.end = tok.end; el.closeStart = tok.start;
        stack.pop();
        break;
      }
      case 'dir': {
        const kw = keywordOf(tok.src);
        if (kw === 'if') {
          const node: Extract<Node, { type: 'if' }> = { type: 'if', branches: [{ src: tok.src, body: [] }], endSrc: '', start: tok.start, end: tok.end };
          top().body.push(node);
          stack.push({ kind: 'if', node, body: node.branches[0]!.body });
        } else if (kw === 'elsif' || kw === 'else') {
          const f = top();
          if (f.kind !== 'if') fail(`{% ${kw} %} outside {% if %}`, tok.start);
          const n = (f as Extract<Frame, { kind: 'if' }>).node;
          if (n.else) fail(`{% ${kw} %} after {% else %}`, tok.start);
          if (kw === 'elsif') { const b = { src: tok.src, body: [] as Node[] }; n.branches.push(b); f.body = b.body; }
          else { n.else = { src: tok.src, body: [] }; f.body = n.else.body; }
        } else if (kw === 'endif' || kw === 'endfor') {
          const f = top();
          if (f.kind !== (kw === 'endif' ? 'if' : 'for')) fail(`{% ${kw} %} has no matching opening tag`, tok.start);
          const n = (f as Extract<Frame, { kind: 'if' | 'for' }>).node;
          n.endSrc = tok.src; n.end = tok.end;
          stack.pop();
        } else if (kw === 'for') {
          const node: Extract<Node, { type: 'for' }> = { type: 'for', src: tok.src, body: [], endSrc: '', start: tok.start, end: tok.end };
          top().body.push(node);
          stack.push({ kind: 'for', node, body: node.body });
        } else {
          top().body.push({ type: 'directive', kw, src: tok.src, start: tok.start, end: tok.end });
        }
        break;
      }
    }
  }
  const open = top();
  if (open.kind !== 'root') fail(`${open.kind === 'el' ? `<${open.node.name}>` : `{% ${open.kind} %}`} is never closed`, open.node.start);
  return root;
}
