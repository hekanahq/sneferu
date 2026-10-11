import * as prettier from 'prettier/standalone';
import type { Options } from 'prettier';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import sneferuPlugin from '@hekana/prettier-plugin-sneferu';
import { lower, parseTemplate } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const registry = createDefaultRegistry();

/** What the compiler makes of a file; formatting must leave it unchanged (the same guard as `sneferu format`). */
export function meaning(path: string, text: string): string {
  if (path.endsWith('.json')) { try { return JSON.stringify(JSON.parse(text)); } catch { return `invalid:${text}`; } }
  const p = parseTemplate(text, path);
  return JSON.stringify({ ir: lower(p.nodes, registry), schema: p.schema, d: p.diagnostics.map((d) => d.code) });
}

/** The nearest JSON Prettier config (.prettierrc or .prettierrc.json) between the file and the theme root. */
export function prettierConfig(file: string, root?: string): Record<string, unknown> {
  let d = dirname(file);
  for (let i = 0; i < 8; i++) {
    for (const name of ['.prettierrc', '.prettierrc.json']) {
      const p = join(d, name);
      if (existsSync(p)) { try { const c = JSON.parse(readFileSync(p, 'utf8')); return c && typeof c === 'object' ? c : {}; } catch { return {}; } }
    }
    if (root && d === root) break;
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  return {};
}

/**
 * Formats a .sneferu file, theme.json or a locale with Prettier and the Sneferu
 * plugin, like `sneferu format`. Returns undefined when the file does not parse
 * or when formatting would change what the compiler makes of it. Editor tab
 * settings are ignored on purpose: the result matches `sneferu format`.
 */
export async function formatDocument(path: string, text: string, opts: { root?: string } = {}): Promise<string | undefined> {
  const { plugins: _p, overrides: _o, ...config } = prettierConfig(path, opts.root) as Record<string, unknown>;
  let out: string;
  try {
    out = await prettier.format(text, {
      printWidth: 120,
      ...config,
      filepath: path,
      parser: path.endsWith('.sneferu') ? 'sneferu' : 'json',
      plugins: [sneferuPlugin, babel, estree],
    } as Options);
  } catch { return undefined; }
  if (out === text) return out;
  return meaning(path, out) === meaning(path, text) ? out : undefined;
}
