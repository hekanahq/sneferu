/**
 * Expression normalisation: `{{ a|money }}` -> `{{ a | money }}`. Works on tokens
 * (so parentheses and literals stay as written) and is checked against the
 * compiler: a rewrite that would parse to anything else is thrown away.
 */
import { parseExpr, parseFor, splitArgs } from '@hekana/sneferu-compiler';

type Tok = { k: 'id' | 'str' | 'num' | 'op' | 'punc'; v: string; q?: '"' | "'" };
const KEYWORDS = new Set(['and', 'or', 'not']);

function tokenize(src: string): Tok[] | undefined {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      const end = src.indexOf(c, i + 1);
      if (end === -1) return undefined;
      out.push({ k: 'str', v: src.slice(i + 1, end), q: c }); i = end + 1; continue;
    }
    const num = /^-?\d+(\.\d+)?/.exec(src.slice(i));
    if (num && !/[A-Za-z_]/.test(src[i + num[0].length] ?? '')) { out.push({ k: 'num', v: num[0] }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
    if (id) { out.push({ k: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = /^(==|!=|>=|<=|>|<)/.exec(src.slice(i));
    if (op) { out.push({ k: 'op', v: op[0] }); i += op[0].length; continue; }
    if ('.[]()|:,'.includes(c)) { out.push({ k: 'punc', v: c }); i++; continue; }
    return undefined;
  }
  return out;
}

const isP = (t: Tok | undefined, v: string) => !!t && t.k === 'punc' && t.v === v;

function sep(p: Tok, c: Tok): string {
  if (c.k === 'op' || p.k === 'op' || isP(c, '|') || isP(p, '|')) return ' ';
  if (isP(c, '.') || isP(c, ']') || isP(c, ')') || isP(c, ',') || isP(c, ':') || isP(c, '[')) return '';
  if (isP(p, '.') || isP(p, '[') || isP(p, '(')) return '';
  if (isP(c, '(')) return p.k === 'id' && !KEYWORDS.has(p.v) ? '' : ' ';
  return ' ';
}

/** Quote preference: the quote to use when the string does not contain it. */
export type QuotePref = '"' | "'";

function printTokens(toks: Tok[], quote: QuotePref): string {
  let out = '';
  toks.forEach((t, i) => {
    if (i > 0) out += sep(toks[i - 1]!, t);
    if (t.k === 'str') {
      const q = t.v.includes(quote) ? t.q! : quote;
      out += q + t.v + q;
    } else out += t.v;
  });
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Normalised expression text, or the input unchanged if it does not parse or would change meaning. */
export function formatExpr(src: string, quote: QuotePref): string {
  const before = parseExpr(src);
  if (!before.expr) return src;
  const toks = tokenize(src);
  if (!toks) return src;
  const out = printTokens(toks, quote);
  return same(parseExpr(out), before) ? out : src;
}

/** Body of a `{% … %}` directive (without the delimiters), normalised when it is safe. */
export function formatDirective(src: string, kw: string, quote: QuotePref): string {
  const arg = src.slice(kw.length).trim();
  if (kw === 'if' || kw === 'elsif') return arg ? `${kw} ${formatExpr(arg, quote)}` : src;
  if (kw === 'else' || kw === 'endif' || kw === 'endfor') return arg ? src : kw;
  if (kw === 'for') {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+?)(?:\s+limit:\s*(\S+))?$/.exec(arg);
    if (!m) return src;
    const out = `for ${m[1]} in ${formatExpr(m[2]!, quote)}${m[3] !== undefined ? ` limit: ${m[3]}` : ''}`;
    return same(parseFor(out.slice(4)), parseFor(arg)) ? out : src;
  }
  if (kw === 'render') {
    const out = formatRender(arg, quote);
    return out !== undefined && same(renderMeaning(out.slice(0)), renderMeaning(arg)) ? `render ${out}` : src;
  }
  return src;
}

const RENDER = /^'([a-z0-9-]+)'\s*(?:,\s*(.*))?$/;
const PAIR = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/;

function renderMeaning(arg: string): unknown {
  const m = RENDER.exec(arg);
  if (!m) return null;
  return [m[1], splitArgs(m[2] ?? '').map((pair) => { const pm = PAIR.exec(pair); return pm ? [pm[1], parseExpr(pm[2]!)] : ['?', pair]; })];
}

function formatRender(arg: string, quote: QuotePref): string | undefined {
  const m = RENDER.exec(arg);
  if (!m) return undefined;
  const pairs = splitArgs(m[2] ?? '').map((pair) => { const pm = PAIR.exec(pair); return pm ? `${pm[1]}: ${formatExpr(pm[2]!, quote)}` : undefined; });
  if (pairs.some((p) => p === undefined)) return undefined;
  return [`'${m[1]}'`, ...pairs].join(', ');
}
