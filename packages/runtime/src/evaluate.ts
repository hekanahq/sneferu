import type { Expr } from '@hekana/sneferu-core';
import type { RenderContext, Scope } from './context';
import { FILTER_IMPLS } from './filters';
import { translate } from './translate';

const MAX_CATEGORIES = 50;
const BLOCKED = new Set(['__proto__', 'prototype', 'constructor']);
const own = (o: object, k: string | number) => Object.prototype.hasOwnProperty.call(o, k);

function get(base: unknown, key: string | number): unknown {
  if (base === null || base === undefined) return undefined;
  if (typeof key === 'string' && BLOCKED.has(key)) return undefined;
  if (typeof base === 'string') return key === 'size' ? base.length : undefined;
  if (typeof base !== 'object') return undefined;
  if (Array.isArray(base) && key === 'size') return base.length;
  if (!own(base, key)) return undefined;
  const v = (base as Record<string | number, unknown>)[key];
  return typeof v === 'function' ? undefined : v;
}

function lookup(fn: string, args: unknown[], ctx: RenderContext): unknown {
  const a0 = String(args[0] ?? '');
  switch (fn) {
    // a merchant who never picked a collection gives '' or undefined: an empty list, never a lookup
    case 'collection': return typeof args[0] === 'string' && args[0] !== '' && own(ctx.collections, args[0]) ? ctx.collections[args[0]] : { products: [] };
    case 'collections': return Array.isArray(ctx.categories) ? ctx.categories.slice(0, MAX_CATEGORIES) : [];
    case 'product': return own(ctx.products, a0) ? ctx.products[a0] : undefined;
    case 't': return translate(ctx, a0);
    case 'settings': return get(ctx.settings, a0);
    case 'asset_url': return ctx.assetUrl(a0);
    default: return undefined;
  }
}

/** Template truthiness: nil, false, 0, NaN, '' and empty arrays are false. */
export const truthy = (v: unknown): boolean => (Array.isArray(v) ? v.length > 0 : !!v);

function run(e: Expr, scope: Scope, ctx: RenderContext): unknown {
  switch (e.k) {
    case 'lit': return e.v;
    case 'path': {
      let v: unknown;
      const keys = [...e.p];
      if (e.from) v = evaluate(e.from, scope, ctx);
      else {
        const head = keys.shift();
        v = typeof head !== 'string' || BLOCKED.has(head) ? undefined
          : own(scope, head) ? scope[head] : head === 'store' ? ctx.store : head === 'settings' ? ctx.settings : undefined;
      }
      for (const k of keys) v = get(v, k);
      return typeof v === 'function' ? undefined : v;
    }
    case 'lookup': return lookup(e.fn, e.args.map((a) => evaluate(a, scope, ctx)), ctx);
    case 'not': return !truthy(evaluate(e.a, scope, ctx));
    case 'and': return truthy(evaluate(e.a, scope, ctx)) && truthy(evaluate(e.b, scope, ctx));
    case 'or': return truthy(evaluate(e.a, scope, ctx)) || truthy(evaluate(e.b, scope, ctx));
    case 'cmp': {
      const a = evaluate(e.a, scope, ctx);
      const b = evaluate(e.b, scope, ctx);
      if (e.op === '==') return a === b;
      if (e.op === '!=') return a !== b;
      if (typeof a !== 'number' || typeof b !== 'number') return false;
      return e.op === '>' ? a > b : e.op === '<' ? a < b : e.op === '>=' ? a >= b : a <= b;
    }
    case 'filter': {
      const impl = own(FILTER_IMPLS, e.name) ? FILTER_IMPLS[e.name] : undefined;
      return impl ? impl(evaluate(e.input, scope, ctx), e.args.map((x) => evaluate(x, scope, ctx)), ctx) : undefined;
    }
    default: return undefined;
  }
}

/** Never throws; missing data is undefined; never returns functions. */
export function evaluate(e: Expr, scope: Scope, ctx: RenderContext): unknown {
  try {
    const v = run(e, scope, ctx);
    return typeof v === 'function' ? undefined : v;
  } catch {
    return undefined;
  }
}
