import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as prettier from 'prettier';
import sneferuPlugin from '@hekana/prettier-plugin-sneferu';
import { lower, parseTemplate } from '@hekana/sneferu-compiler';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { loadTheme } from '../load';

/** The files `sneferu format` owns: templates, the manifest and the locales. */
export const isFormattable = (p: string): boolean => p.endsWith('.sneferu') || p === 'theme.json' || /^locales\/[^/]+\.json$/.test(p);

const registry = createDefaultRegistry();
/** What the compiler makes of a file; formatting must leave it unchanged. */
function meaning(path: string, text: string): string {
  if (path.endsWith('.json')) { try { return JSON.stringify(JSON.parse(text)); } catch { return `invalid:${text}`; } }
  const p = parseTemplate(text, path);
  return JSON.stringify({ ir: lower(p.nodes, registry), schema: p.schema, d: p.diagnostics.map((d) => d.code) });
}

/** Formats one file's text with the theme's Prettier config (if any) and the Sneferu plugin. */
export async function formatText(absPath: string, text: string): Promise<string> {
  const config = (await prettier.resolveConfig(absPath, { editorconfig: true })) ?? {};
  const { plugins: _ignored, ...rest } = config;
  return prettier.format(text, {
    printWidth: 120,
    ...rest,
    filepath: absPath,
    parser: absPath.endsWith('.sneferu') ? 'sneferu' : 'json',
    plugins: [sneferuPlugin],
  });
}

export async function runFormat(dir: string, opts: { check?: boolean } = {}): Promise<{ ok: boolean; output: string; changed: string[] }> {
  let files;
  try { files = loadTheme(dir); } catch (e) { return { ok: false, output: `error ${(e as Error).message}`, changed: [] }; }
  const lines: string[] = [];
  const changed: string[] = [];
  let failed = 0;
  const targets = files.filter((f) => isFormattable(f.path));
  for (const f of targets) {
    const abs = resolve(join(dir, f.path));
    const text = readFileSync(abs, 'utf8');
    let out: string;
    try { out = await formatText(abs, text); } catch (e) {
      failed++;
      lines.push(`${f.path} error ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    if (out === text) continue;
    if (meaning(f.path, out) !== meaning(f.path, text)) {
      // never write a change the compiler would see; this is a formatter bug
      failed++;
      lines.push(`${f.path} error formatting would change what this file compiles to; left as it is (please report this)`);
      continue;
    }
    changed.push(f.path);
    if (opts.check) lines.push(`${f.path} is not formatted`);
    else { writeFileSync(abs, out); lines.push(`${f.path} formatted`); }
  }
  const n = targets.length;
  if (opts.check) lines.push(changed.length || failed ? `✖ ${changed.length} of ${n} file${n === 1 ? '' : 's'} need formatting${failed ? `, ${failed} could not be formatted` : ''} (run sneferu format)` : `✔ all ${n} files are formatted`);
  else lines.push(failed ? `✖ formatted ${changed.length} of ${n} files, ${failed} could not be formatted` : `✔ formatted ${changed.length} of ${n} files`);
  return { ok: failed === 0 && !(opts.check && changed.length > 0), output: lines.join('\n'), changed };
}
