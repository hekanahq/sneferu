import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { parseTree } from 'jsonc-parser';
import { runChecks, type CheckOptions, type Finding } from './checks';
import { indexTheme, type Overlay, type ThemeIndex } from './theme';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Problem {
  rel: string;
  code: string;
  source: 'sneferu' | 'sneferu-check';
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  /** [start, end) offsets in the file's text */
  start: number;
  end: number;
  data?: Record<string, unknown>;
}

const registry = createDefaultRegistry();
const enc = new TextEncoder();

/** Offset of a 1-based line/col. */
export function offsetOf(text: string, line: number, col: number): number {
  let o = 0;
  for (let l = 1; l < line; l++) { const n = text.indexOf('\n', o); if (n < 0) return text.length; o = n + 1; }
  return Math.min(text.length, o + Math.max(0, col - 1));
}

/** A sensible end for a diagnostic that only has a start: the tag name, the directive, or the word. */
export function spanAt(text: string, start: number): number {
  const rest = text.slice(start, start + 200);
  const m = /^<\/?[\w-]+/.exec(rest) ?? /^\{[{%][^\n]*?[}%]\}/.exec(rest) ?? /^[\w:.@-]+/.exec(rest);
  return start + (m ? m[0].length : Math.min(1, rest.length));
}

/** For JSON files without a position: the key the message names, else the start. */
function jsonSpan(text: string, message: string): [number, number] {
  const tree = parseTree(text);
  for (const p of tree?.children ?? []) {
    const k = p.children?.[0];
    if (k && typeof k.value === 'string' && (message.includes(`"${k.value}"`) || new RegExp(`\\b${k.value}\\b`).test(message))) return [k.offset, k.offset + k.length];
  }
  return [0, Math.min(1, text.length)];
}

function locate(theme: ThemeIndex, rel: string, f: { line?: number; col?: number; offset?: number; length?: number; message: string }): [number, number] {
  const text = theme.text(rel) ?? '';
  if (f.offset !== undefined) return [f.offset, f.offset + (f.length ?? 0)];
  if (f.line) { const s = offsetOf(text, f.line, f.col ?? 1); return [s, spanAt(text, s)]; }
  if (rel.endsWith('.json')) return jsonSpan(text, f.message);
  return [0, Math.min(1, text.length)];
}

/** Compiles the theme as the editor sees it (open files win over disk) and runs the theme checks. */
export function checkTheme(root: string, overlay: Overlay, opts: CheckOptions & { checks?: boolean } = {}): { problems: Problem[]; theme: ThemeIndex } {
  const theme = indexTheme(root, overlay);
  const files: ThemeFile[] = [];
  for (const rel of theme.files) {
    const abs = join(root, ...rel.split('/'));
    const t = overlay.get(abs);
    try { files.push({ path: rel, bytes: t !== undefined ? enc.encode(t) : readFileSync(abs) }); } catch { /* vanished */ }
  }
  const problems: Problem[] = [];
  let diagnostics;
  try { diagnostics = compileTheme(files, registry).diagnostics; } catch (e) { diagnostics = [{ code: 'SN9015', severity: 'error' as const, message: `compiler failed: ${(e as Error).message}`, file: 'theme.json' }]; }
  for (const d of diagnostics) {
    const rel = d.file && theme.files.includes(d.file) ? d.file : 'theme.json';
    const [start, end] = locate(theme, rel, d);
    problems.push({ rel, code: d.code, source: 'sneferu', severity: d.severity, message: d.message, start, end });
  }
  if (opts.checks !== false) {
    for (const f of runChecks(theme, opts) as Finding[]) {
      const [start, end] = locate(theme, f.rel, f);
      problems.push({ rel: f.rel, code: f.check, source: 'sneferu-check', severity: f.severity, message: f.message, start, end, ...(f.data ? { data: f.data } : {}) });
    }
  }
  return { problems, theme };
}
