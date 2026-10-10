import { describe, it, expect } from 'vitest';
import { escapeText, escapeAttr, safeUrl, safeToken, jsonAttr, toStr } from './escape';

describe('escaping', () => {
  it('escapes text and attributes', () => {
    expect(escapeText('<b>"x"&\'</b>')).toBe('&lt;b&gt;"x"&amp;\'&lt;/b&gt;');
    expect(escapeAttr('a"b\'c<>&')).toBe('a&quot;b&#39;c&lt;&gt;&amp;');
  });
  it('keeps Arabic untouched', () => {
    expect(escapeText('كروت الألعاب')).toBe('كروت الألعاب');
    expect(escapeAttr('عن المتجر')).toBe('عن المتجر');
  });
  it('allows only safe URL schemes', () => {
    for (const ok of ['https://x.com/a', '/products/a', '#top', '?q=1', 'mailto:a@b.c', 'tel:+201000000000', 'products/a'])
      expect(safeUrl(ok)).toBe(ok);
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', 'http://x.com', 'java\nscript:x', '//evil.com'])
      expect(safeUrl(bad)).toBe('#');
  });
  it('sanitises class/id tokens and serialises JSON for attributes', () => {
    expect(safeToken('card "x" <y> hero-1')).toBe('card x y hero-1');
    expect(jsonAttr({ a: '<"x">' })).toBe('{&quot;a&quot;:&quot;\\u003c\\&quot;x\\&quot;\\u003e&quot;}');
  });
  it('stringifies values', () => {
    expect(toStr(null)).toBe(''); expect(toStr(undefined)).toBe(''); expect(toStr(3)).toBe('3'); expect(toStr(false)).toBe('false');
    expect(toStr({ a: 1 })).toBe('');
  });
});
