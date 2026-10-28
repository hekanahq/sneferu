import { describe, it, expect } from 'vitest';
import { FONTS, DEFAULT_ARABIC_FONT } from './fonts';

describe('font catalogue', () => {
  it('every file name matches the naming rule', () => {
    for (const f of Object.values(FONTS).flatMap((e) => e.files)) expect(f.file).toMatch(/^[a-z0-9-]+-(arabic|latin)-[0-9_]+\.woff2$/);
  });
  it('file names are unique and the contract names are exact', () => {
    const names = Object.values(FONTS).flatMap((e) => e.files.map((f) => f.file));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('cairo-arabic-200_1000.woff2');
    expect(names).toContain('cairo-latin-200_1000.woff2');
    expect(names).toContain('ibm-plex-sans-arabic-arabic-400.woff2');
    expect(names).toContain('baloo-bhaijaan-2-latin-400_800.woff2');
    expect(names).toContain('playfair-display-latin-400_900.woff2');
    expect(names).toContain('bebas-neue-latin-400.woff2');
    expect(names).toContain('amiri-arabic-700.woff2');
    expect(names).toContain('lalezar-arabic-400.woff2');
    expect(names).toContain('changa-arabic-200_800.woff2');
    expect(names).toContain('markazi-text-latin-400_700.woff2');
    expect(names).toContain('dm-sans-latin-100_1000.woff2');
  });
  it('keys equal the family, scripts match the files, and Cairo is the Arabic default', () => {
    for (const [k, e] of Object.entries(FONTS)) {
      expect(e.family).toBe(k);
      expect([...new Set(e.files.map((f) => f.subset))].sort()).toEqual([...e.scripts].sort());
      expect(e.google).toMatch(/^[A-Za-z0-9+]+:wght@[0-9.;]+$/);
    }
    expect(FONTS[DEFAULT_ARABIC_FONT]!.scripts).toContain('arabic');
    expect(Object.keys(FONTS)).toHaveLength(28);
    expect(FONTS.Inter!.scripts).toEqual(['latin']);
    expect(FONTS['Playfair Display']!.generic).toBe('serif');
    expect(FONTS['Amiri']!.generic).toBe('serif');
    expect(FONTS['Markazi Text']!.generic).toBe('serif');
    expect(FONTS['El Messiri']!.scripts).toEqual(['arabic', 'latin']);
  });
});
