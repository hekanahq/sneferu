import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runBuild } from './commands/build';
import { loadTheme } from './load';

let dir: string;
beforeEach(() => { dir = join(mkdtempSync(join(tmpdir(), 'snf-')), 'my-shop'); });

describe('cli commands', () => {
  it('init creates a valid starter named after the folder', () => {
    runInit(dir, {});
    expect(JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8')).id).toBe('my-shop');
    const v = runValidate(dir);
    expect(v.ok).toBe(true);
    expect(v.output).toContain('✔ theme my-shop@0.1.0 is valid');
  });
  it('init names the theme after its folder', () => {
    const d = join(dirname(dir), 'neon-arcade');
    runInit(d, {});
    const m = JSON.parse(readFileSync(join(d, 'theme.json'), 'utf8'));
    expect(m.id).toBe('neon-arcade');
    expect(m.name).toBe('Neon Arcade');
    expect(JSON.stringify(m.description)).not.toMatch(/starter/i);
    expect(runValidate(d).ok).toBe(true);
  });
  it('init refuses a non-empty folder without --force', () => {
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'x.txt'), 'x');
    expect(() => runInit(dir, {})).toThrow(/not empty/);
    runInit(dir, { force: true });
    expect(existsSync(join(dir, 'theme.json'))).toBe(true);
  });
  it('validate prints located diagnostics with suggestions', () => {
    runInit(dir, {});
    writeFileSync(join(dir, 'sections', 'hero.sneferu'), '<hk-grid mobile-colums="1"></hk-grid><hk-schema>{"name":{"ar":"ب","en":"H"},"version":1,"settings":{}}</hk-schema>');
    const v = runValidate(dir);
    expect(v.ok).toBe(false);
    expect(v.output).toContain('sections/hero.sneferu:1:10 error SN2004 unknown property "mobile-colums" on <hk-grid>. Did you mean "mobile-columns"?');
  });
  it('build writes a versioned artifact and copies assets', () => {
    runInit(dir, {});
    const b = runBuild(dir);
    expect(b.ok).toBe(true);
    const art = JSON.parse(readFileSync(b.artifactPath!, 'utf8'));
    expect(art.schema).toBe('sneferu/artifact@1');
    expect(b.artifactPath!.endsWith('dist/my-shop-0.1.0.sneferu.json')).toBe(true);
    expect(existsSync(join(dir, 'dist', 'assets', 'theme.css'))).toBe(true);
  });
  it('validate ignores README, LICENSE, CHANGELOG and a top-level docs/ folder', () => {
    runInit(dir, {});
    for (const f of ['README.md', 'LICENSE', 'CHANGELOG.md', 'readme.txt']) writeFileSync(join(dir, f), '# notes');
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs', 'shot.webp'), 'x');
    expect(runValidate(dir).ok).toBe(true);
    const paths = loadTheme(dir).map((f) => f.path);
    expect(paths.some((p) => /readme|license|changelog|^docs\//i.test(p))).toBe(false);
    // only at the top: a README inside sections/ is still an error
    writeFileSync(join(dir, 'sections', 'README.md'), 'x');
    expect(runValidate(dir).ok).toBe(false);
  });
  it('loadTheme refuses symlinks', () => {
    runInit(dir, {});
    symlinkSync('/etc/passwd', join(dir, 'assets', 'leak.css'));
    expect(() => loadTheme(dir)).toThrow(/symlink/);
  });
  it('build reports loadTheme errors instead of throwing (M5)', () => {
    runInit(dir, {});
    symlinkSync('/etc/passwd', join(dir, 'assets', 'leak.css'));
    let b: ReturnType<typeof runBuild> | undefined;
    expect(() => { b = runBuild(dir); }).not.toThrow();
    expect(b!.ok).toBe(false);
    expect(b!.output).toContain('SN3002 symlinks are not allowed');
  });
  it('build never reads its own --out folder (M5)', () => {
    runInit(dir, {});
    mkdirSync(join(dir, 'out', 'nested'), { recursive: true });
    writeFileSync(join(dir, 'out', 'nested', 'junk.exe'), 'x');
    expect(runBuild(dir, 'out').ok).toBe(true);
    expect(runBuild(dir, 'out').ok).toBe(true);
    expect(loadTheme(dir, { exclude: [join(dir, 'out')] }).some((f) => f.path.startsWith('out/'))).toBe(false);
    expect(loadTheme(dir).some((f) => f.path.startsWith('out/'))).toBe(true);
  });
});
