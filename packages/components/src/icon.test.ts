import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';
import { ICONS, ICON_NAMES } from './icons';
import { iconSvg } from './icon';

const mk = (locale: 'ar' | 'en' = 'ar') => {
  const css: string[] = [];
  const c: TagRenderContext = { id: 'c1', css: (r) => css.push(r), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr', t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return { c, css };
};
const r = createDefaultRegistry();
const render = (tag: string, props: Record<string, unknown>, locale: 'ar' | 'en' = 'ar') => { const { c, css } = mk(locale); return { html: r.get(tag)!.render(props, c), css }; };

const LISTED = 'arrow-left arrow-right arrow-up-right chevron-left chevron-right chevron-down chevron-up check x plus minus menu search shopping-cart shopping-bag heart star user mail phone map-pin truck package gift tag credit-card wallet banknote percent clock calendar download upload file file-text image play pause volume-2 globe lock shield-check info alert-circle help-circle message-circle share-2 external-link link copy trash-2 settings filter sliders-horizontal grid list home store sparkles zap flame trophy gamepad-2 headphones monitor smartphone book-open graduation-cap code layers key'.split(' ');
/** One shape element with geometry attributes only; values are numbers, path data or point lists. */
const NUM = '[0-9a-zA-Z .,-]*';
const SHAPE = new RegExp([
  `<path d="${NUM}"/>`,
  `<circle(?: (?:cx|cy|r)="${NUM}")+/>`,
  `<ellipse(?: (?:cx|cy|rx|ry)="${NUM}")+/>`,
  `<rect(?: (?:x|y|width|height|rx|ry)="${NUM}")+/>`,
  `<line(?: (?:x1|y1|x2|y2)="${NUM}")+/>`,
  `<(?:polyline|polygon) points="${NUM}"/>`,
].map((s) => `(?:${s})`).join('|'), 'y');

describe('icon set', () => {
  it('has every listed icon, and ICON_NAMES is the set in order', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(60);
    for (const n of LISTED) expect(Object.hasOwn(ICONS, n), n).toBe(true);
    expect(ICON_NAMES).toEqual(Object.keys(ICONS));
  });
  it('every entry is only shape elements with geometry attributes (emitted raw inside <svg>)', () => {
    for (const [name, markup] of Object.entries(ICONS)) {
      expect(markup.length, name).toBeGreaterThan(0);
      SHAPE.lastIndex = 0;
      let i = 0;
      while (i < markup.length) {
        SHAPE.lastIndex = i;
        const m = SHAPE.exec(markup);
        expect(m, `${name} at ${i}: ${markup.slice(i, i + 40)}`).not.toBeNull();
        i = SHAPE.lastIndex;
      }
    }
  });
});

describe('iconSvg', () => {
  it('renders a decorative icon by default and a labelled one with role="img"', () => {
    expect(iconSvg('search', 20, 2)).toBe(`<svg class="sn-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.search}</svg>`);
    expect(iconSvg('search', 24, 1.5, 'Search "all"')).toContain('stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Search &quot;all&quot;">');
    expect(iconSvg('search', 24, 2, '')).toContain('aria-hidden="true"');
    expect(iconSvg('nope', 20, 2)).toBe('');
    expect(iconSvg('__proto__', 20, 2)).toBe('');
    expect(iconSvg('toString', 20, 2)).toBe('');
  });
});

describe('hk-icon', () => {
  it('unknown name renders nothing', () => {
    expect(render('hk-icon', { name: 'nope' }).html).toBe('');
    expect(render('hk-icon', {}).html).toBe('');
    expect(render('hk-icon', { name: 'constructor' }).html).toBe('');
  });
  it('label gives role="img" and aria-label', () => {
    expect(render('hk-icon', { name: 'search', label: 'Search' }).html).toContain('role="img" aria-label="Search"');
    expect(render('hk-icon', { name: 'search' }).html).toContain('aria-hidden="true"');
  });
  it('clamps size and stroke', () => {
    expect(render('hk-icon', { name: 'search', size: 999 }).html).toContain('width="96"');
    expect(render('hk-icon', { name: 'search', size: 2 }).html).toContain('width="12" height="12"');
    expect(render('hk-icon', { name: 'search', size: 'x' }).html).toContain('width="20"');
    expect(render('hk-icon', { name: 'search', stroke: 9 }).html).toContain('stroke-width="3"');
    expect(render('hk-icon', { name: 'search', stroke: 1.3 }).html).toContain('stroke-width="1.5"');
    expect(render('hk-icon', { name: 'search', stroke: '"><script>' }).html).toContain('stroke-width="2"');
  });
  it('direction-bearing icons flip on RTL pages, with the rule emitted', () => {
    const ar = render('hk-icon', { name: 'arrow-right' });
    expect(ar.html).toMatch(/^<svg class="sn-icon sn-flip"/);
    expect(ar.css).toEqual(['[dir=rtl] .sn-flip{transform:scaleX(-1)}']);
    const en = render('hk-icon', { name: 'arrow-right' }, 'en');
    expect(en.html).toMatch(/^<svg class="sn-icon"/);
    expect(en.css).toEqual([]);
    expect(render('hk-icon', { name: 'search' }).html).toMatch(/^<svg class="sn-icon"/);
    for (const n of ['arrow-left', 'chevron-left', 'chevron-right']) expect(render('hk-icon', { name: n }).html, n).toContain('sn-flip');
  });
  it('keeps class/id/title/data-* and never lets attributes override its accessibility', () => {
    const { html } = render('hk-icon', { name: 'search', class: 'big', id: 'i', 'data-x': '1', role: 'button', 'aria-label': 'x', 'aria-hidden': 'false' });
    expect(html).toMatch(/^<svg class="sn-icon big" id="i" data-x="1" xmlns/);
    expect(html.match(/aria-hidden/g)).toHaveLength(1);
    expect(html).not.toContain('role=');
    expect(html).not.toContain('aria-label');
  });
});

describe('hk-button icons', () => {
  it('icon at the start by default, decorative, flipped on RTL', () => {
    const { html, css } = render('hk-button', { label: 'Shop', href: '/products', icon: 'arrow-right' });
    expect(html).toMatch(/<svg class="sn-icon sn-flip"[^>]*aria-hidden="true">/);
    expect(html).toMatch(/^<a class="sn-c1 sn-btn sn-btn-solid" href="\/products"><svg [^]*<\/svg>Shop<\/a>$/);
    expect(css).toContain('.sn-c1{display:inline-flex;align-items:center;gap:.5em}');
  });
  it('icon at the end, and unknown icons are ignored', () => {
    expect(render('hk-button', { label: 'Shop', href: '/p', icon: 'search', iconPosition: 'end' }, 'en').html).toMatch(/^<a [^>]*href="\/en\/p">Shop<svg class="sn-icon"[^]*<\/svg><\/a>$/);
    const plain = render('hk-button', { label: 'Shop', href: '/p', icon: 'nope' });
    expect(plain.html).toBe('<a class="sn-c1 sn-btn sn-btn-solid" href="/p">Shop</a>');
    expect(plain.css).toEqual([]);
  });
});
