import { err, type Diagnostic } from './diagnostics';
import { FILTERS, LIMITS, LOOKUPS } from './version';

const KINDS = new Set(['html', 'text', 'el', 'if', 'loop', 'comp', 'slot', 'render', 't']);
const EXPR_KINDS = new Set(['lit', 'path', 'lookup', 'cmp', 'and', 'or', 'not', 'filter']);
const FILTER_SET = new Set<string>(FILTERS);
const LOOKUP_SET = new Set<string>(LOOKUPS);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/**
 * Re-checks an IR tree at load time. The compiler is not the only boundary:
 * an artifact read from storage is untrusted input until this passes.
 */
export function validateIR(nodes: unknown, knownTags: ReadonlySet<string>): Diagnostic[] {
  const out: Diagnostic[] = [];
  const expr = (e: unknown): void => {
    if (!isObj(e) || !EXPR_KINDS.has(String(e.k))) { out.push(err('SN9005', `invalid expression ${JSON.stringify(e)?.slice(0, 60)}`)); return; }
    switch (e.k) {
      case 'path': if (e.from !== undefined) expr(e.from); break;
      case 'lookup': if (!LOOKUP_SET.has(String(e.fn))) out.push(err('SN9006', `unknown lookup ${String(e.fn)}`)); ((e.args as unknown[]) ?? []).forEach(expr); break;
      case 'filter': if (!FILTER_SET.has(String(e.name))) out.push(err('SN9003', `unknown filter ${String(e.name)}`)); expr(e.input); ((e.args as unknown[]) ?? []).forEach(expr); break;
      case 'cmp': case 'and': case 'or': expr(e.a); expr(e.b); break;
      case 'not': expr(e.a); break;
      default: break;
    }
  };
  const value = (v: unknown): void => {
    if (!isObj(v)) { out.push(err('SN9007', 'invalid prop value')); return; }
    if (v.k === 'expr') expr(v.e);
    else if (v.k === 'responsive') ['base', 'tablet', 'mobile'].forEach((bp) => v[bp] !== undefined && value(v[bp]));
    else if (v.k !== 'static') out.push(err('SN9007', 'invalid prop value'));
  };
  const walk = (list: unknown): void => {
    if (!Array.isArray(list)) { out.push(err('SN9008', 'children must be an array')); return; }
    for (const n of list) {
      if (!isObj(n) || !KINDS.has(String(n.k))) { out.push(err('SN9001', `unknown IR node ${JSON.stringify(isObj(n) ? n.k : n)}`)); continue; }
      switch (n.k) {
        case 'text': expr(n.e); break;
        case 'el': (n.attrs as { parts: unknown[] }[]).forEach((a) => a.parts.forEach((p) => typeof p !== 'string' && expr(p))); walk(n.children); break;
        case 'if': (n.branches as { test: unknown; body: unknown }[]).forEach((b) => { expr(b.test); walk(b.body); }); if (n.else) walk(n.else); break;
        case 'loop':
          if (typeof n.limit !== 'number' || n.limit < 1 || n.limit > LIMITS.loopMax) out.push(err('SN9004', `loop limit ${String(n.limit)} outside 1..${LIMITS.loopMax}`));
          expr(n.src); walk(n.body); break;
        case 'comp':
          if (!knownTags.has(String(n.tag))) out.push(err('SN9002', `unknown component ${String(n.tag)}`));
          Object.values(n.props as Record<string, unknown>).forEach(value); walk(n.children); break;
        case 'render': Object.values(n.args as Record<string, unknown>).forEach(expr); break;
        default: break;
      }
    }
  };
  walk(nodes);
  return out;
}
