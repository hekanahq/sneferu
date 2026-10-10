import { err, type Diagnostic, type Expr } from '@hekana/sneferu-core';
import { lex, type Loc, type RawAttr } from './lexer';
import { parseExpr, parseFor } from './expr';
import { VOID_ELEMENTS, type AstAttr, type AstNode } from './ast';

type Frame =
  | { kind: 'root'; body: AstNode[] }
  | { kind: 'el'; node: Extract<AstNode, { t: 'el' }>; body: AstNode[] }
  | { kind: 'if'; node: Extract<AstNode, { t: 'if' }>; body: AstNode[] }
  | { kind: 'for'; node: Extract<AstNode, { t: 'for' }>; body: AstNode[] };

export function parseTemplate(src: string, file: string): { nodes: AstNode[]; schema?: unknown; diagnostics: Diagnostic[] } {
  const { tokens, diagnostics } = lex(src, file);
  const root: Frame = { kind: 'root', body: [] };
  const stack: Frame[] = [root];
  let schema: unknown;
  const top = () => stack[stack.length - 1]!;
  const push = (n: AstNode) => top().body.push(n);
  const at = (l: Loc) => ({ file, line: l.line, col: l.col });
  const expr = (s: string, l: Loc): Expr | undefined => {
    const r = parseExpr(s);
    if (!r.expr) diagnostics.push(err('SN1105', `invalid expression '${s}': ${r.error}`, at(l)));
    return r.expr;
  };
  const attrParts = (a: RawAttr): (string | Expr)[] => {
    if (a.value === null) return [];
    const parts: (string | Expr)[] = [];
    const re = /\{\{([\s\S]*?)\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(a.value))) {
      if (m.index > last) parts.push(a.value.slice(last, m.index));
      const e = expr(m[1]!.trim(), a.loc);
      if (e) parts.push(e);
      last = m.index + m[0].length;
    }
    if (last < a.value.length) parts.push(a.value.slice(last));
    return parts;
  };

  for (const tok of tokens) {
    switch (tok.t) {
      case 'text': push({ t: 'text', v: tok.v, loc: tok.loc }); break;
      case 'interp': { const e = expr(tok.src, tok.loc); if (e) push({ t: 'interp', expr: e, loc: tok.loc }); break; }
      case 'schema':
        try { schema = JSON.parse(tok.json); } catch { diagnostics.push(err('SN1107', '<hk-schema> is not valid JSON', at(tok.loc))); }
        break;
      case 'open': {
        const attrs: AstAttr[] = tok.attrs.map((a) => ({ name: a.name, parts: attrParts(a), loc: a.loc }));
        const node: Extract<AstNode, { t: 'el' }> = { t: 'el', tag: tok.name, attrs, children: [], selfClosing: tok.selfClosing, loc: tok.loc };
        push(node);
        if (!tok.selfClosing && !VOID_ELEMENTS.has(tok.name)) stack.push({ kind: 'el', node, body: node.children });
        break;
      }
      case 'close': {
        if (VOID_ELEMENTS.has(tok.name)) break;
        const idx = [...stack].reverse().findIndex((f) => f.kind === 'el' && f.node.tag === tok.name);
        if (idx === -1) { diagnostics.push(err('SN1104', `</${tok.name}> has no matching opening tag`, at(tok.loc))); break; }
        const f = top();
        if (f.kind !== 'el' || f.node.tag !== tok.name) {
          const open = f.kind === 'el' ? `<${f.node.tag}>` : `{% ${f.kind} %}`;
          const ol = (f as { node: { loc: Loc } }).node.loc;
          diagnostics.push(err('SN1103', `</${tok.name}> closes ${open} opened at ${ol.line}:${ol.col}`, at(tok.loc)));
        }
        stack.length = stack.length - 1 - idx;
        break;
      }
      case 'dir': {
        const kw = tok.src.split(/\s+/)[0];
        const arg = tok.src.slice((kw ?? '').length).trim();
        if (kw === 'if') {
          const e = expr(arg, tok.loc);
          const node: Extract<AstNode, { t: 'if' }> = { t: 'if', branches: [{ test: e ?? { k: 'lit', v: false }, body: [] }], loc: tok.loc };
          push(node);
          stack.push({ kind: 'if', node, body: node.branches[0]!.body });
        } else if (kw === 'elsif' || kw === 'else') {
          const f = top();
          if (f.kind !== 'if') { diagnostics.push(err('SN1102', `{% ${kw} %} outside {% if %}`, at(tok.loc))); break; }
          if (kw === 'elsif') {
            const e = expr(arg, tok.loc);
            const b = { test: e ?? ({ k: 'lit', v: false } as Expr), body: [] as AstNode[] };
            f.node.branches.push(b); f.body = b.body;
          } else { f.node.else = []; f.body = f.node.else; }
        } else if (kw === 'endif' || kw === 'endfor') {
          const want = kw === 'endif' ? 'if' : 'for';
          const f = top();
          if (f.kind !== want) { diagnostics.push(err('SN1102', `{% ${kw} %} without matching {% ${want} %}`, at(tok.loc))); break; }
          stack.pop();
        } else if (kw === 'for') {
          const h = parseFor(arg);
          if ('error' in h) { diagnostics.push(err('SN1105', `invalid for: ${h.error}`, at(tok.loc))); break; }
          const node: Extract<AstNode, { t: 'for' }> = { t: 'for', as: h.as, src: h.src, ...(h.limit !== undefined ? { limit: h.limit } : {}), body: [], loc: tok.loc };
          push(node);
          stack.push({ kind: 'for', node, body: node.body });
        } else if (kw === 'render') {
          const m = /^'([a-z0-9-]+)'\s*(?:,\s*(.*))?$/.exec(arg);
          if (!m) { diagnostics.push(err('SN1105', "expected {% render 'name', key: expr %}", at(tok.loc))); break; }
          const args: Record<string, Expr> = {};
          for (const pair of (m[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
            const pm = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(pair);
            const e = pm ? expr(pm[2]!, tok.loc) : undefined;
            if (pm && e) args[pm[1]!] = e;
            else if (!pm) diagnostics.push(err('SN1105', `invalid render argument '${pair}'`, at(tok.loc)));
          }
          push({ t: 'render', snippet: m[1]!, args, loc: tok.loc });
        } else {
          diagnostics.push(err('SN1106', `unknown directive {% ${kw} %}`, at(tok.loc)));
        }
        break;
      }
    }
  }
  for (const f of stack.slice(1)) {
    if (f.kind === 'if' || f.kind === 'for') diagnostics.push(err('SN1101', `{% ${f.kind} %} is never closed`, at(f.node.loc)));
    else if (f.kind === 'el') diagnostics.push(err('SN1101', `<${f.node.tag}> is never closed`, at(f.node.loc)));
  }
  return { nodes: root.body, schema, diagnostics };
}
