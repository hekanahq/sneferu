import { err, LIMITS, escapeAttr, escapeText, safeToken, safeUrl, svgCase, toStr, type Diagnostic, type IRNode, type IRValue, type TagRegistry } from '@hekana/sneferu-core';
import type { RenderContext, Scope } from './context';
import { evaluate, truthy } from './evaluate';
import { translate } from './translate';
import { Budget } from './budget';
export { Budget } from './budget';

/** A loop limit read from a setting: a whole number clamped to 1..loopMax, anything else the default. */
export function clampLimit(v: unknown): number {
  if (typeof v !== 'number' && (typeof v !== 'string' || v.trim() === '')) return LIMITS.loopDefault;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, LIMITS.loopMax) : LIMITS.loopDefault;
}

const isPart = (c: IRNode): c is Extract<IRNode, { k: 'comp' }> => c.k === 'comp' && c.tag === 'hk-part';
/** A part's name is static only; an expression never matches. */
const partName = (c: Extract<IRNode, { k: 'comp' }>): string | undefined => {
  const v = Object.hasOwn(c.props, 'name') ? c.props.name : undefined;
  return v && v.k === 'static' && typeof v.v === 'string' ? v.v : undefined;
};

export interface Env {
  ctx: RenderContext; registry: TagRegistry; snippets: Record<string, IRNode[]>;
  slots: Record<string, () => string>; budget: Budget; css: string[]; controllers: Set<string>;
  diagnostics: Diagnostic[]; ids: { n: number; prefix?: string }; depth: number; include: number;
  /** Block definitions; when present, <hk-block of="…"/> renders them with the caller's env. */
  blocks?: Record<string, { ir: IRNode[] }>;
}

/** Own-property lookup: author/merchant strings must never reach Object.prototype. */
export function own<T>(obj: Record<string, T> | undefined, key: string): T | undefined {
  return obj && Object.hasOwn(obj, key) ? obj[key] : undefined;
}

function noteExceeded(env: Env): void {
  const b = env.budget;
  if (b.exceeded && !b.reported) { b.reported = true; env.diagnostics.push(err('SN4001', `render stopped: ${b.exceeded} budget exceeded`)); }
}

const tr = (env: Env, key: string): string => translate(env.ctx, key);

function resolveValue(v: IRValue, scope: Scope, env: Env): unknown {
  if (v.k === 'static') return v.v;
  if (v.k === 'expr') return evaluate(v.e, scope, env.ctx);
  const out: Record<string, unknown> = {};
  for (const bp of ['base', 'tablet', 'mobile'] as const) {
    const part = v[bp];
    if (part) out[bp] = resolveValue(part, scope, env);
  }
  return out;
}

/** Push a diagnostic at most once per page. */
function reportOnce(env: Env, code: string, message: string): void {
  if (env.budget.once(code)) env.diagnostics.push(err(code, message));
}

export function renderNodes(nodes: IRNode[], scope: Scope, env: Env): string {
  if (env.depth > env.budget.maxDepth) { reportOnce(env, 'SN4003', 'maximum nesting depth reached'); return ''; }
  let html = '';
  // add: a counted leaf write. raw: output already counted by a nested render.
  const add = (s: string): boolean => { if (env.budget.out(s.length)) { html += s; return true; } noteExceeded(env); return false; };
  const raw = (s: string) => { html += s; };
  for (const n of nodes) {
    // every node visited, of every kind, is charged: fan-out cannot outrun the budget
    if (env.budget.exceeded || !env.budget.node()) { noteExceeded(env); break; }
    switch (n.k) {
      case 'html': add(n.s); break;
      case 'text': add(escapeText(toStr(evaluate(n.e, scope, env.ctx)))); break;
      case 't': add(escapeText(tr(env, n.key))); break;
      case 'el': {
        const attrs = n.attrs.map((a) => {
          if (a.parts.length === 0) return ` ${svgCase(a.name)}`;
          const raw = a.parts.map((p) => (typeof p === 'string' ? p : toStr(evaluate(p, scope, env.ctx)))).join('');
          const val = a.sink === 'url' ? safeUrl(raw) : a.sink === 'token' ? safeToken(raw) : raw;
          return ` ${svgCase(a.name)}="${escapeAttr(val)}"`;
        }).join('');
        if (!add(`<${svgCase(n.tag)}${attrs}>`)) break;
        if (n.void) break;
        raw(renderNodes(n.children, scope, { ...env, depth: env.depth + 1 }));
        const close = `</${svgCase(n.tag)}>`;
        env.budget.force(close.length); raw(close);
        break;
      }
      case 'if': {
        const branch = n.branches.find((b) => truthy(evaluate(b.test, scope, env.ctx)));
        const body = branch ? branch.body : n.else;
        if (body) raw(renderNodes(body, scope, env));
        break;
      }
      case 'loop': {
        const src = evaluate(n.src, scope, env.ctx);
        const limit = typeof n.limit === 'number' ? n.limit : clampLimit(evaluate(n.limit, scope, env.ctx));
        const list = Array.isArray(src) ? src.slice(0, limit) : [];
        list.forEach((item, index) => {
          if (env.budget.exceeded || !env.budget.iter()) return;
          raw(renderNodes(n.body, { ...scope, [n.as]: item, forloop: { index: index + 1, first: index === 0, last: index === list.length - 1 } }, env));
        });
        noteExceeded(env);
        break;
      }
      case 'slot': {
        const fill = own(env.slots, n.name); if (fill) raw(fill()); break;
      }
      case 'render': {
        const body = own(env.snippets, n.snippet);
        if (!body) { env.diagnostics.push(err('SN4004', `snippet '${n.snippet}' not found`)); break; }
        if (env.include >= env.budget.maxInclude) { reportOnce(env, 'SN4002', `include depth exceeded at '${n.snippet}'`); break; }
        const args = Object.fromEntries(Object.entries(n.args).map(([k, e]) => [k, evaluate(e, scope, env.ctx)]));
        raw(renderNodes(body, { ...scope, ...args }, { ...env, include: env.include + 1 }));
        break;
      }
      case 'comp': {
        if (n.tag === 'hk-block' && env.blocks) {
            const b = evaluate(n.props.of && n.props.of.k === 'expr' ? n.props.of.e : { k: 'path', p: [] }, scope, env.ctx) as { id?: unknown; type?: unknown } | undefined;
          if (typeof b !== 'object' || b === null) break;
          const def = typeof b.type === 'string' ? own(env.blocks, b.type) : undefined;
          if (!def) { env.diagnostics.push(err('SN4012', `block type '${toStr(b.type)}' is not in this theme`)); break; }
          if (env.include >= env.budget.maxInclude) { reportOnce(env, 'SN4002', 'block include depth exceeded'); break; }
          const open = `<div data-hk-block="${escapeAttr(toStr(b.id))}">`;
          if (!add(open)) break;
          raw(renderNodes(def.ir, { ...scope, block: b }, { ...env, depth: env.depth + 1, include: env.include + 1 }));
          const close = '</div>';
          env.budget.force(close.length); raw(close);
          break;
        }
        if (n.tag === 'hk-part') break; // rendered only by its parent, through renderChildren(name)
        const tag = env.registry.get(n.tag);
        if (!tag) { env.diagnostics.push(err('SN4005', `component ${n.tag} not available`)); break; }
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(n.props)) props[k] = resolveValue(v, scope, env);
        const id = `${env.ids.prefix ?? ''}c${++env.ids.n}`;
        if (tag.controller) env.controllers.add(tag.controller);
        let childLen = 0;
        try {
          const out = tag.render(props, {
            id, locale: env.ctx.locale, dir: env.ctx.dir, data: scope,
            css: (rule) => env.css.push(rule),
            controller: (name) => env.controllers.add(name),
            t: (key) => tr(env, key),
            renderChildren: (part?: string) => {
              const kids = part === undefined ? n.children.filter((c) => !isPart(c))
                : n.children.flatMap((c) => (isPart(c) && partName(c) === part ? c.children : []));
              const r = renderNodes(kids, scope, { ...env, depth: env.depth + 1 });
              childLen += r.length;
              return r;
            },
          });
          // children were counted by their own render; count only the component's own markup
          if (env.budget.out(Math.max(0, out.length - childLen))) raw(out); else noteExceeded(env);
        } catch (e) {
          env.diagnostics.push(err('SN4006', `${n.tag} failed: ${(e as Error).message}`));
        }
        break;
      }
    }
  }
  return html;
}
