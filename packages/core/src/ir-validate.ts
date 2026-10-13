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
/** A loop limit: a whole number in range, or a plain path into section, block or theme settings. */
const LIMIT_ROOTS = new Set(['section', 'block', 'settings']);
const validLimit = (l: unknown): boolean => {
  if (typeof l === 'number') return Number.isInteger(l) && l >= 1 && l <= LIMITS.loopMax;
  if (typeof l !== 'object' || l === null || Array.isArray(l)) return false;
  const e = l as Record<string, unknown>;
  return e.k === 'path' && e.from === undefined && Array.isArray(e.p) && e.p.length >= 2 && LIMIT_ROOTS.has(e.p[0] as string)
    && e.p.every((x) => typeof x === 'string' || (typeof x === 'number' && Number.isInteger(x) && x >= 0));
};
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * `section.settings.<name>`, `block.settings.<name>` or `settings.<name>`: the paths a
 * merchant's choice can come from (collection() arguments and loop limits).
 */
export function isSettingPath(p: readonly unknown[]): boolean {
  if ((p[0] === 'section' || p[0] === 'block') && p[1] === 'settings') return p.length === 3 && typeof p[2] === 'string';
  return p[0] === 'settings' && p.length === 2 && typeof p[1] === 'string';
}

/** Lookups whose one argument is a handle: a string literal, or a plain setting path (never computed from page data). */
const HANDLE_LOOKUPS = new Set(['collection', 'product', 'menu']);
const validHandleArgs = (args: unknown): boolean => {
  if (!Array.isArray(args) || args.length !== 1) return false;
  const a = args[0];
  if (!isObj(a)) return false;
  if (a.k === 'lit') return typeof a.v === 'string';
  return a.k === 'path' && a.from === undefined && Array.isArray(a.p) && isSettingPath(a.p);
};

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
      case 'lookup':
        if (!LOOKUP_SET.has(String(e.fn))) out.push(err('SN9006', `unknown lookup ${String(e.fn)}`));
        else if (HANDLE_LOOKUPS.has(String(e.fn)) && !validHandleArgs(e.args)) out.push(err('SN9017', `${String(e.fn)}() needs one handle: a string or a setting path`));
        exprs(e.args, d + 1); break;
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
          if (!validLimit(n.limit)) out.push(err('SN9004', `loop limit ${String(JSON.stringify(n.limit) ?? n.limit).slice(0, 60)}: expected 1..${LIMITS.loopMax} or a section, block or theme setting`));
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
