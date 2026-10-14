import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_THEME_TEXTS } from '@hekana/sneferu-templates-default';
import { THEME_AGENTS_MD, THEME_CLAUDE_MD } from '../theme-agents';

/** The scaffolds `sneferu init --template <name>` knows. `starter` is the SDK's default store; the rest are the example themes. */
export const INIT_TEMPLATES = ['starter', 'arcade', 'console', 'esports', 'creator', 'license', 'bento'] as const;
export type InitTemplate = (typeof INIT_TEMPLATES)[number];

const STARTER_DESCRIPTION = 'A complete store to start from: header, footer, every page type, tokens you can edit.';

/** The folder the example themes are bundled in: `templates/` in the published package, the repo's examples when run from source. */
function templatesRoot(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'templates'))) return join(dir, 'templates');
    const examples = join(dir, 'examples', 'themes');
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) && existsSync(examples)) return examples;
    dir = dirname(dir);
  }
  return undefined;
}

const SKIP = new Set(['node_modules', 'dist', 'docs', '.turbo']);
function readTree(root: string, rel = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(join(root, rel)).sort()) {
    if (SKIP.has(name)) continue;
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(join(root, r)).isDirectory()) Object.assign(out, readTree(root, r));
    else out[r] = readFileSync(join(root, r), 'utf8');
  }
  return out;
}

function filesOf(template: InitTemplate): Readonly<Record<string, string>> {
  if (template === 'starter') return DEFAULT_THEME_TEXTS;
  const root = templatesRoot();
  const dir = root ? join(root, template) : undefined;
  if (!dir || !existsSync(join(dir, 'theme.json'))) throw new Error(`the '${template}' template is not bundled in this install`);
  const files = readTree(dir);
  // a README is a tutorial for the example; its screenshots are not bundled
  if (files['README.md']) files['README.md'] = files['README.md'].split('\n').filter((l) => !/!\[[^\]]*\]\(docs\//.test(l)).join('\n');
  return files;
}

/** One line per template for `--list` and for the error on a bad name. */
export function listTemplates(): { name: InitTemplate; description: string }[] {
  const root = templatesRoot();
  return INIT_TEMPLATES.map((name) => {
    let description = name === 'starter' ? STARTER_DESCRIPTION : '';
    if (name !== 'starter' && root && existsSync(join(root, name, 'theme.json'))) {
      try { description = (JSON.parse(readFileSync(join(root, name, 'theme.json'), 'utf8')) as { description?: string }).description ?? ''; } catch { /* listed without a description */ }
    }
    return { name, description };
  });
}

export function formatTemplateList(): string {
  const rows = listTemplates();
  const w = Math.max(...rows.map((r) => r.name.length));
  return rows.map((r) => `  ${r.name.padEnd(w)}  ${r.description}`).join('\n');
}

export function runInit(target: string, opts: { force?: boolean; template?: string }): void {
  const template = opts.template ?? 'starter';
  if (!(INIT_TEMPLATES as readonly string[]).includes(template)) throw new Error(`unknown template '${template.slice(0, 40)}'. Available templates:\n${formatTemplateList()}`);
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length > 0 && !opts.force) throw new Error(`${dir} is not empty (use --force to write anyway)`);
  // every scaffold gets the agent notes (AGENTS.md, CLAUDE.md); a template's own copy wins
  const files = { 'AGENTS.md': THEME_AGENTS_MD, 'CLAUDE.md': THEME_CLAUDE_MD, ...filesOf(template as InitTemplate) };
  mkdirSync(dir, { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    if (path === 'theme.json') continue;
    const file = resolve(dir, path);
    if (!file.startsWith(dir + sep)) throw new Error(`unsafe path in template: ${path}`);
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
  let named = out.replace(/("name"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}${JSON.stringify(title)}`);
  // the starter's description is generic; an example keeps its own
  if (template === 'starter') named = named.replace(/("description"\s*:\s*)"[^"]*"/, (_m, k: string) => `${k}"A Sneferu theme."`);
  const parsed = JSON.parse(named) as { name?: string; description?: string };
  if (parsed.name !== title || (template === 'starter' && parsed.description !== 'A Sneferu theme.')) throw new Error('could not set the theme name in theme.json');
  writeFileSync(join(dir, 'theme.json'), named);
}
