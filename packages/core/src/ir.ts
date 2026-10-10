import type { FilterName, LookupName } from './version';

export type Expr =
  | { k: 'lit'; v: string | number | boolean | null }
  /** `from` = property access on a lookup result, e.g. collection('x').products */
  | { k: 'path'; p: (string | number)[]; from?: Expr }
  | { k: 'lookup'; fn: LookupName; args: Expr[] }
  | { k: 'cmp'; op: '==' | '!=' | '>' | '<' | '>=' | '<='; a: Expr; b: Expr }
  | { k: 'and' | 'or'; a: Expr; b: Expr }
  | { k: 'not'; a: Expr }
  | { k: 'filter'; name: FilterName; input: Expr; args: Expr[] };

/** A component prop: a static value, an expression, or per-breakpoint values. */
export type IRValue =
  | { k: 'static'; v: unknown }
  | { k: 'expr'; e: Expr }
  | { k: 'responsive'; base?: IRValue; tablet?: IRValue; mobile?: IRValue };

export type AttrSink = 'text' | 'url' | 'token';
export interface IRAttr { name: string; parts: (string | Expr)[]; sink: AttrSink }

export type IRNode =
  | { k: 'html'; s: string }
  | { k: 'text'; e: Expr }
  | { k: 'el'; tag: string; attrs: IRAttr[]; children: IRNode[]; void?: boolean }
  | { k: 'if'; branches: { test: Expr; body: IRNode[] }[]; else?: IRNode[] }
  | { k: 'loop'; as: string; src: Expr; limit: number; body: IRNode[] }
  | { k: 'comp'; tag: string; props: Record<string, IRValue>; children: IRNode[] }
  | { k: 'slot'; name: string }
  | { k: 'render'; snippet: string; args: Record<string, Expr> }
  | { k: 't'; key: string };
