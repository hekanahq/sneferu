import { FILTERS, LOOKUPS, type Expr, type FilterName, type LookupName } from '@hekana/sneferu-core';

type Tok = { k: 'id' | 'str' | 'num' | 'op' | 'punc'; v: string };
const FILTER_SET = new Set<string>(FILTERS);
const LOOKUP_SET = new Set<string>(LOOKUPS);

function tokenize(src: string): Tok[] | string {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      const end = src.indexOf(c, i + 1);
      if (end === -1) return 'unterminated string';
      out.push({ k: 'str', v: src.slice(i + 1, end) }); i = end + 1; continue;
    }
    const num = /^-?\d+(\.\d+)?/.exec(src.slice(i));
    if (num && !/[A-Za-z_]/.test(src[i + num[0].length] ?? '')) { out.push({ k: 'num', v: num[0] }); i += num[0].length; continue; }
    const id = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(src.slice(i));
    if (id) { out.push({ k: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = /^(==|!=|>=|<=|>|<)/.exec(src.slice(i));
    if (op) { out.push({ k: 'op', v: op[0] }); i += op[0].length; continue; }
    if ('.[]()|:,'.includes(c)) { out.push({ k: 'punc', v: c }); i++; continue; }
    return `unexpected character '${c}'`;
  }
  return out;
}

class P {
  i = 0;
  constructor(private readonly t: Tok[]) {}
  peek(o = 0) { return this.t[this.i + o]; }
  eat(k?: Tok['k'], v?: string): Tok {
    const t = this.t[this.i];
    if (!t || (k && t.k !== k) || (v !== undefined && t.v !== v)) throw new Error(`expected ${v ?? k ?? 'token'}${t ? ` but found '${t.v}'` : ' at end'}`);
    this.i++; return t;
  }
  is(k: Tok['k'], v?: string) { const t = this.peek(); return !!t && t.k === k && (v === undefined || t.v === v); }
  done() { return this.i >= this.t.length; }

  expr(): Expr {
    let e = this.or();
    while (this.is('punc', '|')) {
      this.eat('punc', '|');
      const name = this.eat('id').v;
      if (!FILTER_SET.has(name)) throw new Error(`unknown filter '${name}'`);
      const args: Expr[] = [];
      if (this.is('punc', ':')) { this.eat(); args.push(this.primary()); while (this.is('punc', ',')) { this.eat(); args.push(this.primary()); } }
      e = { k: 'filter', name: name as FilterName, input: e, args };
    }
    return e;
  }
  or(): Expr { let a = this.and(); while (this.is('id', 'or')) { this.eat(); a = { k: 'or', a, b: this.and() }; } return a; }
  and(): Expr { let a = this.not(); while (this.is('id', 'and')) { this.eat(); a = { k: 'and', a, b: this.not() }; } return a; }
  not(): Expr { if (this.is('id', 'not')) { this.eat(); return { k: 'not', a: this.cmp() }; } return this.cmp(); }
  cmp(): Expr {
    const a = this.primary();
    if (this.is('op')) { const op = this.eat('op').v as '=='; return { k: 'cmp', op, a, b: this.primary() }; }
    return a;
  }
  primary(): Expr {
    const t = this.peek();
    if (!t) throw new Error('unexpected end');
    if (t.k === 'str') { this.eat(); return { k: 'lit', v: t.v }; }
    if (t.k === 'num') { this.eat(); return { k: 'lit', v: Number(t.v) }; }
    if (t.k === 'punc' && t.v === '(') { this.eat(); const e = this.expr(); this.eat('punc', ')'); return e; }
    if (t.k === 'id') {
      if (t.v === 'true' || t.v === 'false') { this.eat(); return { k: 'lit', v: t.v === 'true' }; }
      if (t.v === 'nil') { this.eat(); return { k: 'lit', v: null }; }
      if (this.peek(1)?.k === 'punc' && this.peek(1)?.v === '(') {
        if (!LOOKUP_SET.has(t.v)) throw new Error(`'${t.v}' is not callable`);
        this.eat(); this.eat('punc', '(');
        const args: Expr[] = [];
        if (t.v === 'collection' || t.v === 'product' || t.v === 'menu') args.push(this.handleArg(t.v));
        else if (t.v === 'collections') { if (!this.is('punc', ')')) throw new Error('collections() takes no arguments'); }
        else if (t.v === 'url') {
          if (this.is('punc', ')')) throw new Error('url() takes one argument: a path or an expression');
          args.push(this.expr());
          if (!this.is('punc', ')')) throw new Error('url() takes one argument: a path or an expression');
        }
        else if (!this.is('punc', ')')) {
          do { const a = this.peek(); if (!a || (a.k !== 'str' && a.k !== 'num')) throw new Error(`${t.v}() takes literal arguments`); args.push(this.primary()); } while (this.is('punc', ',') && this.eat());
        }
        this.eat('punc', ')');
        const lookup: Expr = { k: 'lookup', fn: t.v as LookupName, args };
        const p = this.tail();
        return p.length ? { k: 'path', p, from: lookup } : lookup;
      }
      this.eat();
      return { k: 'path', p: [t.v, ...this.tail()] };
    }
    throw new Error(`unexpected '${t.v}'`);
  }
  /** The one argument of collection(), product() and menu(): a handle literal or a setting path of that type. */
  handleArg(fn: 'collection' | 'product' | 'menu'): Expr {
    const bad = new Error(`${fn}() takes a handle or a ${fn} setting`);
    const a = this.peek();
    let arg: Expr;
    if (a?.k === 'str') { this.eat(); arg = { k: 'lit', v: a.v }; }
    else if (a?.k === 'id' && !(this.peek(1)?.k === 'punc' && this.peek(1)?.v === '(')) {
      this.eat();
      let p: (string | number)[];
      try { p = [a.v, ...this.tail()]; } catch { throw bad; }
      if (!isSettingPath(p)) throw bad;
      arg = { k: 'path', p };
    } else throw bad;
    if (!this.is('punc', ')')) throw bad;
    return arg;
  }
  tail(): (string | number)[] {
    const p: (string | number)[] = [];
    for (;;) {
      if (this.is('punc', '.')) { this.eat(); p.push(this.eat('id').v); continue; }
      if (this.is('punc', '[')) { this.eat(); const n = this.eat('num').v; if (!/^\d+$/.test(n)) throw new Error('index must be a whole number'); p.push(Number(n)); this.eat('punc', ']'); continue; }
      if (this.is('punc', '(')) throw new Error('method calls are not allowed');
      return p;
    }
  }
}

/**
 * `section.settings.<name>`, `block.settings.<name>` or `settings.<name>`: the paths a
 * merchant's choice can come from (collection() arguments and loop limits).
 */
export function isSettingPath(p: readonly unknown[]): boolean {
  if ((p[0] === 'section' || p[0] === 'block') && p[1] === 'settings') return p.length === 3 && typeof p[2] === 'string';
  return p[0] === 'settings' && p.length === 2 && typeof p[1] === 'string';
}

export function parseExpr(src: string): { expr?: Expr; error?: string } {
  const toks = tokenize(src);
  if (typeof toks === 'string') return { error: toks };
  if (toks.length === 0) return { error: 'empty expression' };
  try {
    const p = new P(toks);
    const expr = p.expr();
    if (!p.done()) return { error: `unexpected '${p.peek()!.v}'` };
    return { expr };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function parseFor(src: string): { as: string; src: Expr; limit?: number; limitExpr?: Expr } | { error: string } {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+?)(?:\s+limit:\s*(\S+))?$/.exec(src.trim());
  if (!m) return { error: "expected 'name in expression [limit:n]'" };
  const r = parseExpr(m[2]!);
  if (!r.expr) return { error: r.error ?? 'invalid expression' };
  if (m[3] !== undefined) {
    if (/^\d+$/.test(m[3])) return { as: m[1]!, src: r.expr, limit: Number(m[3]) };
    const p = /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)*$/.test(m[3]) ? m[3].split('.') : [];
    if (!isSettingPath(p)) return { error: 'limit must be a whole number or a setting (section.settings.x, block.settings.x or settings.x)' };
    return { as: m[1]!, src: r.expr, limitExpr: { k: 'path', p } };
  }
  return { as: m[1]!, src: r.expr };
}
