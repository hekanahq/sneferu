import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init';
import { runFormat } from './format';
import { runValidate } from './validate';
import { runBuild } from './build';

let dir: string;
beforeEach(() => { dir = join(mkdtempSync(join(tmpdir(), 'snf-fmt-')), 'my-shop'); runInit(dir, {}); });

describe('sneferu format', () => {
  it('init writes a starter that is already formatted', async () => {
    const r = await runFormat(dir, { check: true });
    expect(r.output).toContain('✔ all 46 files are formatted');
    expect(r.ok).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8'))).toMatchObject({ id: 'my-shop', version: '0.1.0' });
  });

  it('--check fails on an unformatted file and format fixes it without changing the build', async () => {
    const hero = join(dir, 'sections', 'hero.snf');
    const before = runBuild(dir, join(dir, '..', 'out1'));
    writeFileSync(hero, readFileSync(hero, 'utf8').replace(/\n( +)/g, '\n$1$1'));
    writeFileSync(join(dir, 'locales', 'en.json'), JSON.stringify(JSON.parse(readFileSync(join(dir, 'locales', 'en.json'), 'utf8'))));
    const unformatted = runBuild(dir, join(dir, '..', 'out2'));
    const check = await runFormat(dir, { check: true });
    expect(check.ok).toBe(false);
    expect(check.output).toContain('sections/hero.snf is not formatted');
    expect(check.output).toContain('locales/en.json is not formatted');
    const r = await runFormat(dir);
    expect(r.ok).toBe(true);
    expect(r.changed.sort()).toEqual(['locales/en.json', 'sections/hero.snf']);
    expect(readFileSync(hero, 'utf8')).toContain('<hk-schema>\n  {\n    "name": {\n      "en": "Hero",');
    expect((await runFormat(dir, { check: true })).ok).toBe(true);
    const after = runBuild(dir, join(dir, '..', 'out3'));
    const art = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
    expect(art(after.artifactPath!)).toEqual(art(before.artifactPath!));
    expect(art(unformatted.artifactPath!)).toEqual(art(before.artifactPath!));
  });

  it('reports a file it cannot parse and leaves it alone', async () => {
    const p = join(dir, 'sections', 'broken.sneferu');
    writeFileSync(p, '<div><span></div>');
    const r = await runFormat(dir);
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/sections\/broken\.sneferu error <\/div> does not close the open <span> \(1:12\)/);
    expect(readFileSync(p, 'utf8')).toBe('<div><span></div>');
  });

  it('uses the theme Prettier config, and tooling files are not part of the theme', async () => {
    writeFileSync(join(dir, '.prettierrc'), JSON.stringify({ plugins: ['@hekana/prettier-plugin-sneferu'], printWidth: 60 }));
    writeFileSync(join(dir, 'package.json'), '{"devDependencies":{"prettier":"^3"}}');
    const r = await runFormat(dir);
    expect(r.ok).toBe(true);
    expect(readFileSync(join(dir, 'sections', 'hero.snf'), 'utf8')).toContain('<hk-heading\n          text="{{ section.settings.title }}"');
    expect(runValidate(dir).ok).toBe(true);
  });
});
