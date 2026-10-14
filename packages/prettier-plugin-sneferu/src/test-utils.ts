import * as prettier from 'prettier';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { compileTheme, lower, parseTemplate, type ThemeFile } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import plugin from './index';

export const registry = createDefaultRegistry();

export const fmt = (src: string, o: prettier.Options = {}) =>
  prettier.format(src, { parser: 'sneferu', plugins: [plugin], ...o });

/** What the compiler makes of one template: lowered IR, schema and diagnostic codes. */
export function meaning(src: string): string {
  const p = parseTemplate(src, 'f.sneferu');
  return JSON.stringify({ ir: lower(p.nodes, registry), schema: p.schema, diagnostics: p.diagnostics.map((d) => d.code) }, null, 1);
}

export function readTheme(dir: string): ThemeFile[] {
  const out: ThemeFile[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      // what the CLI's loadTheme skips: dot entries, and README/LICENSE/CHANGELOG/docs at the top
      if (name.startsWith('.') || name === 'node_modules' || (d === dir && /^(readme|license|licence|changelog)(\.(md|txt))?$|^docs$|^dist$/i.test(name))) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push({ path: relative(dir, p), bytes: readFileSync(p) });
    }
  };
  walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Formats every .sneferu and .json file of a theme, as `sneferu format` does. */
export async function formatTheme(files: ThemeFile[]): Promise<ThemeFile[]> {
  const dec = new TextDecoder();
  return Promise.all(files.map(async (f) => {
    const text = dec.decode(f.bytes);
    if (f.path.endsWith('.sneferu') || f.path.endsWith('.snf')) return { path: f.path, bytes: Buffer.from(await fmt(text)) };
    if (f.path.endsWith('.json')) return { path: f.path, bytes: Buffer.from(await prettier.format(text, { parser: 'json', printWidth: 120 })) };
    return f;
  }));
}

export const compile = (files: ThemeFile[]) => compileTheme(files, registry);
