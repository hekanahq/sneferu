import { coerceSetting, defaultsOf, err, escapeAttr, validateIR, type Diagnostic, type FieldSchema, type HkTag, type IRNode, type TagRegistry } from '@hekana/sneferu-core';
import type { RenderContext, Scope } from './context';
import { Budget, own, renderNodes, type Env } from './render';
import type { Limits } from './budget';

interface Schemaed { ir: IRNode[]; schema: { settings: FieldSchema } }
export interface ArtifactLike {
  manifest: { id: string };
  layout: IRNode[];
  templates: Record<string, IRNode[]>;
  templateSections: Record<string, { type: string; settings: Record<string, unknown> }[]>;
  sections: Record<string, Schemaed & { schema: { name?: unknown; version?: number; settings: FieldSchema } }>;
  blocks: Record<string, Schemaed>;
  snippets: Record<string, IRNode[]>;
}
export interface PageNode { id: string; type: string; props?: Record<string, unknown>; children?: PageNode[]; hidden?: boolean }

const settingsFor = (schema: FieldSchema, props: Record<string, unknown> = {}) => {
  const out: Record<string, unknown> = { ...defaultsOf(schema) };
  for (const [k, f] of Object.entries(schema)) if (Object.hasOwn(props, k) && props[k] !== undefined) out[k] = coerceSetting(f, props[k]);
  return out;
};

export function renderPage(
  artifact: ArtifactLike,
  opts: { template: string; sections?: PageNode[]; ctx: RenderContext; registry: TagRegistry; scope?: Scope; limits?: Limits },
): { html: string; css: string; controllers: string[]; diagnostics: Diagnostic[] } {
  const known = new Set([...opts.registry.names(), 'hk-block']);
  const trees: IRNode[][] = [artifact.layout, ...Object.values(artifact.templates), ...Object.values(artifact.snippets),
    ...Object.values(artifact.sections).map((s) => s.ir), ...Object.values(artifact.blocks).map((b) => b.ir)];
  const bad = trees.flatMap((t) => validateIR(t, known));
  if (bad.length) return { html: '', css: '', controllers: [], diagnostics: bad };

  const template = own(artifact.templates, opts.template);
  if (!template) return { html: '', css: '', controllers: [], diagnostics: [err('SN4010', `template '${opts.template}' not found`)] };

  const env: Env = { ctx: opts.ctx, registry: opts.registry, snippets: artifact.snippets, slots: {}, budget: new Budget(opts.limits), css: [], controllers: new Set(), diagnostics: [], ids: { n: 0 }, depth: 0, include: 0 };
  const base: Scope = { ...(opts.scope ?? {}), store: opts.ctx.store, locale: opts.ctx.locale, dir: opts.ctx.dir };

  const sections: PageNode[] = opts.sections ?? (own(artifact.templateSections, opts.template) ?? []).map((s, i) => ({ id: `default-${i}`, type: s.type, props: s.settings }));

  const renderSection = (node: PageNode): string => {
    const def = own(artifact.sections, node.type);
    if (!def) { env.diagnostics.push(err('SN4011', `section '${node.type}' is not in this theme`)); return `<!-- section ${escapeAttr(node.id)} unavailable -->`; }
    const blocks = (node.children ?? []).filter((c) => !c.hidden).map((c) => ({ id: c.id, type: c.type, settings: settingsFor(own(artifact.blocks, c.type)?.schema.settings ?? {}, c.props) }));
    const scope: Scope = { ...base, section: { id: node.id, type: node.type, settings: settingsFor(def.schema.settings, node.props), blocks } };
    const unavailable = `<!-- section ${escapeAttr(node.id)} unavailable -->`;
    if (env.budget.exceeded) return unavailable;
    // each section renders against what is left of the page budget, so one runaway
    // section degrades alone and the surrounding layout stays balanced
    const sub = env.budget.child();
    const html = renderNodes(def.ir, scope, { ...env, budget: sub, slots: {}, depth: 0 });
    if (sub.exceeded) return unavailable;
    const out = `<div data-hk-section="${escapeAttr(node.id)}">${html}</div>`;
    env.budget.absorb(sub, out.length);
    if (env.budget.exceeded && !env.budget.reported) { env.budget.reported = true; env.diagnostics.push(err('SN4001', `render stopped: ${env.budget.exceeded} budget exceeded`)); }
    return out;
  };

  env.blocks = artifact.blocks;

  const content = () => renderNodes(template, base, { ...env, slots: { sections: () => sections.filter((s) => !s.hidden).map(renderSection).join('') } });
  const inner = renderNodes(artifact.layout, base, { ...env, slots: { content } });
  const html = `<div data-hk-theme="${escapeAttr(artifact.manifest.id)}" dir="${opts.ctx.dir}" lang="${opts.ctx.locale}">${inner}</div>`;
  return { html, css: env.css.join('\n'), controllers: [...env.controllers], diagnostics: env.diagnostics };
}
