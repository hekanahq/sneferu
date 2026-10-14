import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INIT_TEMPLATES, formatTemplateList, runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runBuild } from './commands/build';
import { runFormat } from './commands/format';
import { loadTheme } from './load';

const scratch = () => mkdtempSync(join(tmpdir(), 'snf-tpl-'));
const artifacts = (out: string) => readdirSync(out).filter((f) => f.endsWith('.json')).sort().map((f) => readFileSync(join(out, f), 'utf8'));

describe('sneferu init --template', () => {
  it('lists every template with a description', () => {
    const list = formatTemplateList();
    for (const t of INIT_TEMPLATES) expect(list).toContain(t);
    for (const line of list.split('\n')) expect(line.trim().split(/\s{2,}/)[1]?.length ?? 0, line).toBeGreaterThan(10);
  });
  it('a bad name names the available templates', () => {
    expect(() => runInit(join(scratch(), 'x'), { template: 'nope' })).toThrow(/unknown template 'nope'[\s\S]*arcade[\s\S]*bento/);
  });

  describe.each(INIT_TEMPLATES)('%s', (template) => {
    it('init, validate, format --check and build pass, and the artifact hash is stable', async () => {
      const base = scratch();
      const dir = join(base, 'my-store');
      runInit(dir, { template });
      const manifest = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8')) as { id: string; name: string };
      expect(manifest.id).toBe('my-store');
      expect(manifest.name).toBe('My Store');
      expect(existsSync(join(dir, 'docs'))).toBe(false);
      expect(existsSync(join(dir, 'node_modules'))).toBe(false);
      expect(runValidate(dir).ok, runValidate(dir).output).toBe(true);
      const fmt = await runFormat(dir, { check: true });
      expect(fmt.ok, fmt.output).toBe(true);
      const a = runBuild(dir, join(base, 'out-a'));
      expect(a.ok, a.output).toBe(true);
      runBuild(dir, join(base, 'out-b'));
      expect(artifacts(join(base, 'out-b'))).toEqual(artifacts(join(base, 'out-a')));
      expect(artifacts(join(base, 'out-a'))).toHaveLength(1);
      // a second scaffold of the same template is byte-identical
      const again = join(base, 'again', 'my-store');
      runInit(again, { template });
      expect(runBuild(again, join(base, 'out-c')).ok).toBe(true);
      expect(artifacts(join(base, 'out-c'))).toEqual(artifacts(join(base, 'out-a')));
    });
    it('is a complete store: every page type, the three groups, both locales', () => {
      const dir = join(scratch(), 'shop');
      runInit(dir, { template });
      for (const f of ['templates/index.snf', 'templates/product.snf', 'templates/collection.snf', 'templates/search.snf', 'templates/cart.snf', 'templates/404.snf', 'templates/page.snf', 'groups/header.json', 'groups/footer.json', 'groups/announcement.json', 'locales/ar.json', 'locales/en.json', 'layout/theme.snf']) {
        expect(existsSync(join(dir, f)), f).toBe(true);
      }
    });
    it('writes AGENTS.md and CLAUDE.md, which validate, push and build skip: the artifact is the same without them', () => {
      const base = scratch();
      const dir = join(base, 'shop');
      runInit(dir, { template });
      const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
      expect(agents).toContain('npx sneferu');
      expect(agents).toContain('https://hekana.dev/llms-full.txt');
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toContain('@AGENTS.md');
      expect(loadTheme(dir).map((f) => f.path).filter((p) => /agents|claude/i.test(p))).toEqual([]);
      expect(runValidate(dir).ok).toBe(true);
      expect(runBuild(dir, join(base, 'with')).ok).toBe(true);
      rmSync(join(dir, 'AGENTS.md'));
      rmSync(join(dir, 'CLAUDE.md'));
      expect(runBuild(dir, join(base, 'without')).ok).toBe(true);
      expect(artifacts(join(base, 'with'))).toEqual(artifacts(join(base, 'without')));
      // only at the top: an AGENTS.md inside sections/ is still a theme file, and an error
      writeFileSync(join(dir, 'sections', 'AGENTS.md'), 'x');
      expect(runValidate(dir).ok).toBe(false);
    });
  });
});
