import { LIMITS, svgCase, isUrlAttribute, escapeAttr, escapeText, type IRAttr, type IRNode, type IRValue, type TagRegistry } from '@hekana/sneferu-core';
import { VOID_ELEMENTS, type AstNode } from './ast';
import { propOf } from './validate';

const sinkOf = (name: string): IRAttr['sink'] => (isUrlAttribute(name) ? 'url' : name === 'class' || name === 'id' ? 'token' : 'text');

const isStatic = (n: AstNode): boolean =>
  n.t === 'text' || (n.t === 'el' && !n.tag.startsWith('hk-') && n.attrs.every((a) => a.parts.every((p) => typeof p === 'string')) && n.children.every(isStatic));

function staticHtml(n: AstNode): string {
  if (n.t === 'text') return escapeText(n.v).replace(/&amp;(#?[a-zA-Z0-9]+;)/g, '&$1'); // keep author entities like &amp;
  if (n.t !== 'el') return '';
  const attrs = n.attrs.map((a) => (a.parts.length === 0 ? ` ${svgCase(a.name)}` : ` ${svgCase(a.name)}="${escapeAttr((a.parts as string[]).join(''))}"`)).join('');
  const tag = svgCase(n.tag);
  if (VOID_ELEMENTS.has(n.tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${n.children.map(staticHtml).join('')}</${tag}>`;
}

function coerceStatic(raw: string, type: string | undefined): unknown {
  if ((type === 'number' || type === 'range') && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  if (type === 'boolean') return raw === '' || raw === 'true';
  return raw;
}

export function lower(nodes: AstNode[], registry: TagRegistry): IRNode[] {
  const out: IRNode[] = [];
  const emit = (n: IRNode) => {
    const last = out[out.length - 1];
    if (n.k === 'html' && last?.k === 'html') last.s += n.s;
    else out.push(n);
  };
  for (const n of nodes) {
    if (isStatic(n)) { emit({ k: 'html', s: staticHtml(n) }); continue; }
    switch (n.t) {
      case 'interp':
        if (n.expr.k === 'lookup' && n.expr.fn === 't' && n.expr.args.length === 1 && n.expr.args[0]!.k === 'lit') emit({ k: 't', key: String((n.expr.args[0] as { v: unknown }).v) });
        else emit({ k: 'text', e: n.expr });
        break;
      case 'if':
        emit({ k: 'if', branches: n.branches.map((b) => ({ test: b.test, body: lower(b.body, registry) })), ...(n.else ? { else: lower(n.else, registry) } : {}) });
        break;
      case 'for':
        emit({ k: 'loop', as: n.as, src: n.src, limit: Math.min(n.limit ?? LIMITS.loopDefault, LIMITS.loopMax), body: lower(n.body, registry) });
        break;
      case 'render':
        emit({ k: 'render', snippet: n.snippet, args: n.args });
        break;
      case 'el': {
        if (n.tag === 'hk-slot') { emit({ k: 'slot', name: String(n.attrs.find((a) => a.name === 'name')?.parts[0] ?? 'content') }); break; }
        if (n.tag === 'hk-sections') { emit({ k: 'slot', name: 'sections' }); break; }
        if (n.tag.startsWith('hk-')) {
          const tag = registry.get(n.tag);
          const props: Record<string, IRValue> = {};
          for (const a of n.attrs) {
            const { prop, bp } = propOf(a.name);
            const field = tag?.props[prop];
            const value: IRValue = a.parts.length === 1 && typeof a.parts[0] !== 'string'
              ? { k: 'expr', e: a.parts[0]! }
              : a.parts.every((p) => typeof p === 'string')
                ? { k: 'static', v: coerceStatic((a.parts as string[]).join(''), field?.type) }
                : { k: 'expr', e: { k: 'filter', name: 'join', input: { k: 'lit', v: null }, args: a.parts.map((p) => (typeof p === 'string' ? { k: 'lit' as const, v: p } : p)) } };
            const key = a.name.startsWith('data-') || a.name.startsWith('aria-') || a.name === 'class' || a.name === 'id' || a.name === 'role' || a.name === 'title' ? a.name : prop;
            if (bp === 'base' && !tag?.responsive.includes(prop)) props[key] = value;
            else {
              const prev = props[key];
              const r: Extract<IRValue, { k: 'responsive' }> = prev && prev.k === 'responsive' ? prev : { k: 'responsive' };
              r[bp] = value;
              props[key] = r;
            }
          }
          emit({ k: 'comp', tag: n.tag, props, children: lower(n.children, registry) });
          break;
        }
        const attrs: IRAttr[] = n.attrs.map((a) => ({ name: a.name, sink: sinkOf(a.name), parts: a.parts }));
        emit({ k: 'el', tag: n.tag, attrs, children: lower(n.children, registry), ...(VOID_ELEMENTS.has(n.tag) ? { void: true } : {}) });
        break;
      }
      default: break;
    }
  }
  return out;
}
