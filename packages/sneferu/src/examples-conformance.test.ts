import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTemplate } from '@hekana/sneferu-compiler';
import { FIELD_INSPECTORS, normalizeLabel } from '@hekana/sneferu-core';
import { COMMERCE_STRINGS } from '@hekana/sneferu-components';
import { lint, themeFiles } from './test-utils/conformance-lint';

/** Every example theme is a complete, editable store: the same rules as the default store, plus its own page types. */
const root = fileURLToPath(new URL('../../../examples/themes', import.meta.url));
const ids = existsSync(root) ? readdirSync(root).filter((d) => existsSync(join(root, d, 'theme.json'))).sort() : [];
const PAGE_TYPES = ['index', 'product', 'collection', 'search', 'cart', '404', 'page'];

/** Hue in degrees and saturation (0..1) of #rrggbb; undefined for other values. */
function hs(hex: string): { h: number; s: number } | undefined {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return undefined;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s };
}

describe.each(ids)('example theme %s is a complete store', (id) => {
  const dir = join(root, id);
  const files = themeFiles(dir);
  const sources = files.filter((p) => /\.(snf|sneferu)$/.test(p));
  const theme = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8')) as { id: string; version: string; tokens?: { colors?: Record<string, string> }; settings?: Record<string, { type?: string; default?: unknown }> };

  it('has a template for every page type, the three groups and a layout that places them', () => {
    for (const t of PAGE_TYPES) expect(files.some((f) => f === `templates/${t}.snf`), `templates/${t}.snf`).toBe(true);
    for (const g of ['announcement', 'header', 'footer']) expect(files, `groups/${g}.json`).toContain(`groups/${g}.json`);
    const layout = readFileSync(join(dir, 'layout/theme.snf'), 'utf8');
    for (const g of ['announcement', 'header', 'footer']) expect(layout, `layout places ${g}`).toContain(`<hk-section-group name="${g}"`);
    expect(theme.id).toBe(id);
  });
  it('has no static copy, link or colour outside settings, locale keys and tokens', () => {
    const problems: string[] = [];
    for (const f of sources) lint(f, parseTemplate(readFileSync(join(dir, f), 'utf8'), f).nodes, problems);
    expect(problems).toEqual([]);
  });
  it('styles with tokens, not colour literals', () => {
    const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? []).toEqual([]);
  });
  it('uses no purple, violet, lavender or pink anywhere in its palette', () => {
    const all = JSON.stringify(theme) + sources.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n') + files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    const bad = [...all.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]).filter((c) => { const v = hs(c); return v && v.s > 0.15 && v.h >= 255 && v.h <= 345; });
    expect(bad).toEqual([]);
  });
  it('declares labelled, bounded settings in both languages on every section and block', () => {
    for (const p of sources.filter((f) => /^(sections|blocks)\//.test(f))) {
      const raw = parseTemplate(readFileSync(join(dir, p), 'utf8'), p).schema as { name?: unknown; settings?: Record<string, Record<string, unknown>>; blocks?: { max?: number } };
      const name = normalizeLabel(raw.name) as { ar: string; en: string } | undefined;
      expect(name?.ar && name?.en, `${p} name`).toBeTruthy();
      for (const [k, f] of Object.entries(raw.settings ?? {})) {
        const l = f.label as { en?: string; ar?: string };
        expect(l?.en && l?.ar, `${p} ${k} label`).toBeTruthy();
        expect(f.default, `${p} ${k} default`).not.toBeUndefined();
        expect(Object.hasOwn(FIELD_INSPECTORS, String(f.type)), `${p} ${k} type ${String(f.type)}`).toBe(true);
        if (f.type === 'text' || f.type === 'textarea') expect(f.maxLength, `${p} ${k} maxLength`).toBeGreaterThan(0);
        if (f.type === 'select') expect((f.options as string[]).includes(String(f.default)), `${p} ${k} default is an option`).toBe(true);
      }
      if (raw.blocks) expect((raw.blocks as { max?: number }).max, `${p} blocks.max`).toBeGreaterThan(0);
    }
  });
  it('has the same locale keys in Arabic and English, and every key it reads', () => {
    const en = JSON.parse(readFileSync(join(dir, 'locales/en.json'), 'utf8')) as Record<string, string>;
    const ar = JSON.parse(readFileSync(join(dir, 'locales/ar.json'), 'utf8')) as Record<string, string>;
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
    const keys = new Set<string>();
    for (const f of sources) for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/\bt\('([a-z_0-9]+)'\)/g)) keys.add(m[1]!);
    expect([...keys].filter((k) => !(k in en) && !(k in COMMERCE_STRINGS))).toEqual([]);
  });
});
