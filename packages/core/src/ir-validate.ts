import { err, type Diagnostic } from './diagnostics';
import { FILTERS, LIMITS, LOOKUPS } from './version';
import { checkRawHtml, isAllowedElement, isForbiddenAttribute, isUrlAttribute } from './policy';

const KINDS = new Set(['html', 'text', 'el', 'if', 'loop', 'comp', 'slot', 'render', 't']);
const EXPR_KINDS = new Set(['lit', 'path', 'lookup', 'cmp', 'and', 'or', 'not', 'filter']);
const FILTER_SET = new Set<string>(FILTERS);
const LOOKUP_SET = new Set<string>(LOOKUPS);
const SINKS = new Set(['text', 'url', 'token']);
const TAG_RE = /^[a-z][a-z0-9-]*$/;
const ATTR_RE = /^[a-z_:][a-z0-9_:.-]*$/;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Re-checks an IR tree at load time. The compiler is not the only boundary:
 * an artifact read from storage is untrusted input until this passes.
 * Never throws for JSON-shaped input.
 */
export function validateIR(nodes: unknown, knownTags: ReadonlySet<string>): Diagnostic[] {
  const out: Diagnostic[] = [];
  let deepReported = false;
  const tooDeep = (depth: number): boolean => {
    if (depth <= LIMITS.renderDepth) return false;
    if (!deepReported) { deepReported = true; out.push(err('SN9009', 'IR nested too deeply')); }
    return true;
  };
  const exprs = (list: unknown, d: number): void => {
    if (list === undefined) return;
    if (!Array.isArray(list)) { out.push(err('SN9008', 'expected an array of expressions')); return; }
    list.forEach((x) => expr(x, d));
  };
  const expr = (e: unknown, d: number): void => {
    if (tooDeep(d)) return;
    if (!isObj(e) || !EXPR_KINDS.has(String(e.k))) { out.push(err('SN9005', `invalid expression ${String(JSON.stringify(e) ?? e).slice(0, 60)}`)); return; }
    switch (e.k) {
      case 'path': if (e.from !== undefined) expr(e.from, d + 1); break;
      case 'lookup': if (!LOOKUP_SET.has(String(e.fn))) out.push(err('SN9006', `unknown lookup ${String(e.fn)}`)); exprs(e.args, d + 1); break;
      case 'filter': if (!FILTER_SET.has(String(e.name))) out.push(err('SN9003', `unknown filter ${String(e.name)}`)); expr(e.input, d + 1); exprs(e.args, d + 1); break;
      case 'cmp': case 'and': case 'or': expr(e.a, d + 1); expr(e.b, d + 1); break;
      case 'not': expr(e.a, d + 1); break;
      default: break;
    }
  };
  const value = (v: unknown, d: number): void => {
    if (tooDeep(d)) return;
    if (!isObj(v)) { out.push(err('SN9007', 'invalid prop value')); return; }
    if (v.k === 'expr') expr(v.e, d + 1);
    else if (v.k === 'responsive') ['base', 'tablet', 'mobile'].forEach((bp) => v[bp] !== undefined && value(v[bp], d + 1));
    else if (v.k !== 'static') out.push(err('SN9007', 'invalid prop value'));
  };
  const attr = (a: unknown, d: number): void => {
    if (!isObj(a) || typeof a.name !== 'string' || !Array.isArray(a.parts)) { out.push(err('SN9008', 'invalid attribute')); return; }
    const name = a.name;
    if (!ATTR_RE.test(name) || isForbiddenAttribute(name)) out.push(err('SN9012', `attribute not allowed: ${name}`));
    if (typeof a.sink !== 'string' || !SINKS.has(a.sink)) out.push(err('SN9013', `invalid sink for ${name}`));
    else if (isUrlAttribute(name) && a.sink !== 'url') out.push(err('SN9013', `attribute ${name} requires url sink`));
    if (name === 'style' && a.parts.some((p) => typeof p !== 'string')) out.push(err('SN9012', 'style attribute must be static'));
    a.parts.forEach((p) => typeof p !== 'string' && expr(p, d + 1));
  };
  const walk = (list: unknown, d: number): void => {
    if (tooDeep(d)) return;
    if (!Array.isArray(list)) { out.push(err('SN9008', 'children must be an array')); return; }
    for (const n of list) {
      if (!isObj(n) || !KINDS.has(String(n.k))) { out.push(err('SN9001', `unknown IR node ${String(JSON.stringify(isObj(n) ? n.k : n))}`)); continue; }
      switch (n.k) {
        case 'html': {
          if (typeof n.s !== 'string') { out.push(err('SN9010', 'html node needs a string')); break; }
          const why = checkRawHtml(n.s);
          if (why) out.push(err('SN9014', `unsafe html: ${why}`));
          break;
        }
        case 'text': expr(n.e, d + 1); break;
        case 'el':
          if (typeof n.tag !== 'string' || !TAG_RE.test(n.tag) || !isAllowedElement(n.tag)) out.push(err('SN9011', `element not allowed: ${String(n.tag)}`));
          if (!Array.isArray(n.attrs)) out.push(err('SN9008', 'el attrs must be an array')); else n.attrs.forEach((a) => attr(a, d + 1));
          walk(n.children, d + 1); break;
        case 'if':
          if (!Array.isArray(n.branches)) out.push(err('SN9008', 'if branches must be an array'));
          else n.branches.forEach((b: unknown) => {
            if (!isObj(b)) { out.push(err('SN9008', 'invalid if branch')); return; }
            expr(b.test, d + 1); walk(b.body, d + 1);
          });
          if (n.else !== undefined) walk(n.else, d + 1);
          break;
        case 'loop':
          if (typeof n.limit !== 'number' || !Number.isInteger(n.limit) || n.limit < 1 || n.limit > LIMITS.loopMax) out.push(err('SN9004', `loop limit ${String(n.limit)} outside 1..${LIMITS.loopMax}`));
          expr(n.src, d + 1); walk(n.body, d + 1); break;
        case 'comp':
          if (!knownTags.has(String(n.tag))) out.push(err('SN9002', `unknown component ${String(n.tag)}`));
          if (!isObj(n.props)) out.push(err('SN9007', 'comp props must be an object')); else Object.values(n.props).forEach((v) => value(v, d + 1));
          walk(n.children, d + 1); break;
        case 'render':
          if (!isObj(n.args)) out.push(err('SN9008', 'render args must be an object')); else Object.values(n.args).forEach((x) => expr(x, d + 1));
          break;
        default: break;
      }
    }
  };
  walk(nodes, 0);
  return out;
}
