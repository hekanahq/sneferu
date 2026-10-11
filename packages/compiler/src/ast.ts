import type { Expr } from '@hekana/sneferu-core';
import type { Loc } from './lexer';

export interface AstAttr { name: string; parts: (string | Expr)[]; loc: Loc }
export type AstNode =
  | { t: 'text'; v: string; loc: Loc }
  | { t: 'interp'; expr: Expr; loc: Loc }
  | { t: 'el'; tag: string; attrs: AstAttr[]; children: AstNode[]; selfClosing: boolean; loc: Loc }
  | { t: 'if'; branches: { test: Expr; body: AstNode[] }[]; else?: AstNode[]; loc: Loc }
  | { t: 'for'; as: string; src: Expr; limit?: number; limitExpr?: Expr; body: AstNode[]; loc: Loc }
  | { t: 'render'; snippet: string; args: Record<string, Expr>; loc: Loc };

export const VOID_ELEMENTS = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'source', 'track', 'wbr']);
