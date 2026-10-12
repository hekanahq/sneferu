import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { DEFAULT_THEME_TEXTS } from '@hekana/sneferu-templates-default';

/** The scaffolds `sneferu init --template <name>` knows. `starter` is the complete default store. */
export const INIT_TEMPLATES = ['starter'] as const;
export type InitTemplate = (typeof INIT_TEMPLATES)[number];

const filesOf = (template: InitTemplate): Readonly<Record<string, string>> => {
  switch (template) {
    case 'starter': return DEFAULT_THEME_TEXTS;
  }
};

export function runInit(target: string, opts: { force?: boolean; template?: string }): void {
  const template = opts.template ?? 'starter';
  if (!(INIT_TEMPLATES as readonly string[]).includes(template)) throw new Error(`unknown template '${template.slice(0, 40)}'; available: ${INIT_TEMPLATES.join(', ')}`);
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length > 0 && !opts.force) throw new Error(`${dir} is not empty (use --force to write anyway)`);
  mkdirSync(dir, { recursive: true });
  const files = filesOf(template as InitTemplate);
  for (const [path, text] of Object.entries(files)) {
    if (path === 'theme.json') continue;
    const file = join(dir, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  const id = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').padEnd(3, 'x').slice(0, 41);
  const text = files['theme.json']!;
  const next = JSON.stringify(/^[a-z]/.test(id) ? id : `t-${id}`);
  // swap the id in place, so the scaffold stays exactly as `sneferu format` writes it
  const out = text.replace(/("id"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}${next}`);
  if (JSON.parse(out).id !== JSON.parse(next)) throw new Error('could not set the theme id in theme.json');
  const title = id.split('-').filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
  const named = out
    .replace(/("name"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}${JSON.stringify(title)}`)
    .replace(/("description"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}"A Sneferu theme."`);
  const parsed = JSON.parse(named) as { name?: string; description?: string };
  if (parsed.name !== title || parsed.description !== 'A Sneferu theme.') throw new Error('could not set the theme name in theme.json');
  writeFileSync(join(dir, 'theme.json'), named);
}
