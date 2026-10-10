import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  it('loadTheme refuses symlinks', () => {
    runInit(dir, {});
    symlinkSync('/etc/passwd', join(dir, 'assets', 'leak.css'));
    expect(() => loadTheme(dir)).toThrow(/symlink/);
  });
});
