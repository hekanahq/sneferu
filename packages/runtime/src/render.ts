import { err, escapeAttr, escapeText, safeToken, safeUrl, toStr, type Diagnostic, type IRNode, type IRValue, type TagRegistry } from '@hekana/sneferu-core';
import type { RenderContext, Scope } from './context';
import { evaluate } from './evaluate';
import { Budget } from './budget';
export { Budget } from './budget';

export interface Env {
  ctx: RenderContext; registry: TagRegistry; snippets: Record<string, IRNode[]>;
  slots: Record<string, () => string>; budget: Budget; css: string[]; controllers: Set<string>;
  diagnostics: Diagnostic[]; ids: { n: number }; depth: number; include: number;
}

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

export function renderNodes(nodes: IRNode[], scope: Scope, env: Env): string {
  if (env.depth > env.budget.maxDepth) { env.diagnostics.push(err('SN4003', 'maximum nesting depth reached')); return ''; }
  let html = '';
  const add = (s: string) => { if (env.budget.out(s.length)) html += s; };
  for (const n of nodes) {
    if (env.budget.exceeded) break;
    switch (n.k) {
      case 'html': add(n.s); break;
      case 'text': add(escapeText(toStr(evaluate(n.e, scope, env.ctx)))); break;
      case 't': add(escapeText(env.ctx.translations[n.key] ?? env.ctx.fallbackTranslations[n.key] ?? n.key)); break;
      case 'el': {
        const attrs = n.attrs.map((a) => {
          if (a.parts.length === 0) return ` ${a.name}`;
          const raw = a.parts.map((p) => (typeof p === 'string' ? p : toStr(evaluate(p, scope, env.ctx)))).join('');
          const val = a.sink === 'url' ? safeUrl(raw) : a.sink === 'token' ? safeToken(raw) : raw;
          return ` ${a.name}="${escapeAttr(val)}"`;
        }).join('');
        add(`<${n.tag}${attrs}>`);
        if (n.void) break;
        add(renderNodes(n.children, scope, { ...env, depth: env.depth + 1 }));
        add(`</${n.tag}>`);
        break;
      }
      case 'if': {
        const branch = n.branches.find((b) => !!evaluate(b.test, scope, env.ctx));
        const body = branch ? branch.body : n.else;
        if (body) add(renderNodes(body, scope, env));
        break;
      }
      case 'loop': {
        const src = evaluate(n.src, scope, env.ctx);
        const list = Array.isArray(src) ? src.slice(0, n.limit) : [];
        list.forEach((item, index) => {
          if (env.budget.exceeded || !env.budget.iter()) return;
          add(renderNodes(n.body, { ...scope, [n.as]: item, forloop: { index: index + 1, first: index === 0, last: index === list.length - 1 } }, env));
        });
        if (env.budget.exceeded && !env.diagnostics.some((d) => d.code === 'SN4001')) env.diagnostics.push(err('SN4001', `render stopped: ${env.budget.exceeded} budget exceeded`));
        break;
      }
      case 'slot': { const fill = env.slots[n.name]; if (fill) add(fill()); break; }
      case 'render': {
        const body = env.snippets[n.snippet];
        if (!body) { env.diagnostics.push(err('SN4004', `snippet '${n.snippet}' not found`)); break; }
        if (env.include >= env.budget.maxInclude) { env.diagnostics.push(err('SN4002', `include depth exceeded at '${n.snippet}'`)); break; }
        const args = Object.fromEntries(Object.entries(n.args).map(([k, e]) => [k, evaluate(e, scope, env.ctx)]));
        add(renderNodes(body, { ...scope, ...args }, { ...env, include: env.include + 1 }));
        break;
      }
      case 'comp': {
        const tag = env.registry.get(n.tag);
        if (!tag) { env.diagnostics.push(err('SN4005', `component ${n.tag} not available`)); break; }
        if (!env.budget.node()) break;
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(n.props)) props[k] = resolveValue(v, scope, env);
        const id = `c${++env.ids.n}`;
        if (tag.controller) env.controllers.add(tag.controller);
        try {
          add(tag.render(props, {
            id, locale: env.ctx.locale, dir: env.ctx.dir, data: scope,
            css: (rule) => env.css.push(rule),
            controller: (name) => env.controllers.add(name),
            t: (key) => env.ctx.translations[key] ?? env.ctx.fallbackTranslations[key] ?? key,
            renderChildren: () => renderNodes(n.children, scope, { ...env, depth: env.depth + 1 }),
          }));
        } catch (e) {
          env.diagnostics.push(err('SN4006', `${n.tag} failed: ${(e as Error).message}`));
        }
        break;
      }
    }
  }
  return html;
}
