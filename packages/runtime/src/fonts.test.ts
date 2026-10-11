import { describe, it, expect } from 'vitest';
import { FONTS } from '@hekana/sneferu-core';
import { themeFontCss } from './fonts';

const B = '/hk2/fonts/';
const m = (fonts?: unknown, id = 't') => ({ id, tokens: fonts === undefined ? undefined : { fonts } });
const faces = (css: string) => [...css.matchAll(/url\(([^)]*)\)/g)].map((x) => x[1]!.slice(B.length));

describe('themeFontCss', () => {
  it('Inter body on an Arabic page falls back to Cairo', () => {
    const css = themeFontCss(m({ body: 'Inter' }), 'ar', B);
    expect(css).toContain('--hk-font-body:"Inter","Cairo",sans-serif');
    expect(css).toContain('cairo-arabic-');
    expect(css).not.toContain('cairo-latin-');
    expect(css).toContain('inter-latin-100_900.woff2');
    expect(css).not.toContain('inter-arabic');
  });
  it('English page with no fonts declared emits nothing', () => {
    expect(themeFontCss({ id: 't' }, 'en', B)).toBe('');
    expect(themeFontCss(m({}), 'en', B)).toBe('');
  });
  it('Arabic page with no fonts declared uses Cairo', () => {
    const css = themeFontCss({ id: 't' }, 'ar', B);
    expect(css).toContain('--hk-font-body:"Cairo",sans-serif');
    expect(css).toContain('--hk-font-heading:"Cairo",sans-serif');
    expect(css).toContain('--hk-font-mono:ui-monospace');
    expect(faces(css).sort()).toEqual(['cairo-arabic-200_1000.woff2', 'cairo-latin-200_1000.woff2']);
    expect(css).toContain('[data-hk-theme="t"] :is(h1,h2,h3,h4,h5,h6){font-family:var(--hk-font-heading)}');
  });
  it('English page loads both subsets of declared families but adds no Cairo fallback', () => {
    const css = themeFontCss(m({ heading: 'Cairo', body: 'Inter', mono: 'Martian Mono' }), 'en', B);
    expect(faces(css).sort()).toEqual(['cairo-arabic-200_1000.woff2', 'cairo-latin-200_1000.woff2', 'inter-latin-100_900.woff2', 'martian-mono-latin-100_800.woff2']);
    expect(css).toContain('--hk-font-mono:"Martian Mono",monospace');
    expect(css).toContain('font-display:swap');
    expect(css).toContain('unicode-range:U+0000-00FF');
    expect(css).toContain('format("woff2")');
  });
  it('static fonts get one face per weight', () => {
    const css = themeFontCss(m({ body: 'Tajawal' }), 'ar', B);
    expect(faces(css)).toHaveLength(8);
    expect(css).toContain('font-weight:700;');
  });
  it('mono on an Arabic page also falls back to Cairo', () => {
    expect(themeFontCss(m({ mono: 'JetBrains Mono' }), 'ar', B)).toContain('--hk-font-mono:"JetBrains Mono","Cairo",monospace');
  });
  it('refuses an unsafe fontBase', () => {
    for (const base of ['javascript:x/', '', '//evil.com/', 'http://x/', '/a b/', '/a)/', '/a"/', '/a/b', 'https://x/\\', '/a;}/']) {
      const css = themeFontCss(m({ body: 'Inter' }), 'en', base);
      expect(css, base).not.toContain('@font-face');
      expect(css).toContain('--hk-font-body:"Inter",sans-serif');
    }
    expect(themeFontCss(m({ body: 'Inter' }), 'en', 'https://cdn.hekana.com/f/')).toContain('url(https://cdn.hekana.com/f/inter-latin-100_900.woff2)');
  });
  it('escapes the theme id', () => {
    for (const id of ['a"]{}', 'a\\', 'a\n}x{', '</style><script>']) {
      const css = themeFontCss(m({ body: 'Inter' }, id), 'en', B);
      expect(css).not.toContain('</style');
      expect(css).not.toMatch(/\[data-hk-theme="[^"]*"[^\]{]*"/);
      expect(css.split('\n')).toHaveLength(1);
      expect(css).not.toMatch(/[^\\]\\"/);
    }
  });
  it('ignores font names that are not in the catalogue and never echoes them', () => {
    const css = themeFontCss(m({ body: 'x";}</style><b>', heading: '__proto__', mono: 'toString' }), 'en', B);
    expect(css).toBe('');
    expect(themeFontCss(m({ body: 'Inter', heading: 'evil{}' }), 'en', B)).not.toContain('evil');
  });
  it('tolerates a malformed manifest', () => {
    expect(themeFontCss({ id: 't', tokens: { fonts: 'Inter' } }, 'en', B)).toBe('');
    expect(themeFontCss({ id: 't', tokens: null }, 'en', B)).toBe('');
  });
  it('only emits catalogue file names', () => {
    const all = new Set(Object.values(FONTS).flatMap((e) => e.files.map((f) => f.file)));
    for (const name of Object.keys(FONTS)) for (const locale of ['ar', 'en'] as const) for (const f of faces(themeFontCss(m({ body: name }), locale, B))) expect(all.has(f)).toBe(true);
  });
  it('empty fontBase writes variables only', () => {
    const css = themeFontCss(m({ body: 'Inter' }), 'ar', '');
    expect(css).not.toContain('@font-face');
    expect(css).toContain('--hk-font-body:"Inter","Cairo",sans-serif');
  });
});
