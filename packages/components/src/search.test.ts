import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

type Opts = { locale?: 'ar' | 'en'; id?: string; url?: (p: string) => string; t?: Record<string, string> };
const r = createDefaultRegistry();
const render = (tag: string, props: Record<string, unknown>, o: Opts = {}) => {
  const css: string[] = [];
  const locale = o.locale ?? 'ar';
  const c: TagRenderContext = { id: o.id ?? 'c1', css: (x) => css.push(x), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (k) => o.t?.[k] ?? k, renderChildren: () => '', url: o.url ?? ((p) => defaultUrl(p, locale)) };
  return { html: r.get(tag)!.render(props, c), css };
};
const ICON = /<svg class="sn-icon"[^>]*aria-hidden="true">/;

describe('hk-search-form', () => {
  it('renders a GET search form to the locale-aware /search with one q input', () => {
    const { html } = render('hk-search-form', { placeholder: '"><script>' }, { locale: 'en' });
    expect(html).toContain('action="/en/search"');
    expect(html).toContain('placeholder="&quot;&gt;&lt;script&gt;"');
    expect(html).not.toMatch(/<input(?![^>]*name="q")/); // exactly one input, name=q
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).not.toContain('<script');
    expect(html).toMatch(/^<form class="sn-c1 sn-search" role="search" method="get" action="\/en\/search"><label class="sn-search-label sn-visually-hidden" for="c1-q">Search<\/label><input id="c1-q" type="search" name="q" maxlength="100" autocomplete="off" enterkeyhint="search" placeholder="&quot;&gt;&lt;script&gt;"><button type="submit" class="sn-search-button" aria-label="Search"><svg [^]*<\/svg><\/button><\/form>$/);
    expect(render('hk-search-form', {}).html).toContain('action="/search"');
  });
  it('label: the prop, else t("search"), else the built-in word; shown only with show-label', () => {
    const q = render('hk-search-form', { label: 'Find "it" <b>' }, { locale: 'en' }).html;
    expect(q).toContain('for="c1-q">Find "it" &lt;b&gt;</label>');
    expect(q).toContain('aria-label="Find &quot;it&quot; &lt;b&gt;"');
    expect(render('hk-search-form', { label: 'Find' }, { locale: 'en' }).html).toContain('aria-label="Find"');
    expect(render('hk-search-form', {}, { t: { search: 'دوّر' } }).html).toContain('>دوّر</label>');
    expect(render('hk-search-form', {}, { locale: 'en' }).html).toContain('>Search</label>');
    expect(render('hk-search-form', {}).html).toContain('>بحث</label>');
    expect(render('hk-search-form', { showLabel: true }, { locale: 'en' }).html).toContain('<label class="sn-search-label" for="c1-q">');
  });
  it('button: icon by default, button-label as text, never empty', () => {
    expect(render('hk-search-form', {}).html).toMatch(ICON);
    const both = render('hk-search-form', { buttonLabel: '<b>Go</b>' }, { locale: 'en' }).html;
    expect(both).toMatch(/<button type="submit" class="sn-search-button" aria-label="Search"><svg [^]*<\/svg>&lt;b&gt;Go&lt;\/b&gt;<\/button>/);
    expect(render('hk-search-form', { icon: false, buttonLabel: 'Go' }, { locale: 'en' }).html).toContain('aria-label="Search">Go</button>');
    // no icon and no button text: the label is the button text, so the button is never blank
    expect(render('hk-search-form', { icon: false }, { locale: 'en' }).html).toContain('aria-label="Search">Search</button>');
  });
  it('the host resolver is used for action and its result is checked', () => {
    expect(render('hk-search-form', {}, { url: (p) => `/store-x${p}` }).html).toContain('action="/store-x/search"');
    expect(render('hk-search-form', {}, { url: () => 'javascript:alert(1)' }).html).toContain('action="#"');
    expect(render('hk-search-form', {}, { url: () => '"><img src=x onerror=alert(1)>' }).html).not.toContain('<img');
  });
  it('no action, method or extra field can be set from the template', () => {
    const { html } = render('hk-search-form', { action: 'https://evil.example/collect', method: 'post', name: 'x', hidden: 'y', formaction: 'z', onsubmit: 'alert(1)', role: 'button', 'aria-label': 'x', 'data-x': '1', class: 'top', id: 'sf' });
    expect(html).toMatch(/^<form class="sn-c1 sn-search top" data-x="1" id="sf" role="search" method="get" action="\/search">/);
    expect(html).not.toContain('evil');
    expect(html).not.toContain('post');
    expect(html).not.toContain('onsubmit');
    expect(html).not.toContain('formaction');
    expect(html.match(/role=/g)).toHaveLength(1);
  });
  it('ids come from the instance id and stay attribute-safe', () => {
    const { html } = render('hk-search-form', {}, { id: 's-hero-c3' });
    expect(html).toContain('for="s-hero-c3-q"');
    expect(html).toContain('<input id="s-hero-c3-q"');
  });
  it('emits scoped CSS: flex row, 44px touch targets, visually-hidden helper', () => {
    const { css } = render('hk-search-form', {});
    const all = css.join('\n');
    expect(all).toContain('.sn-c1{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px}');
    expect(all).toMatch(/\.sn-c1 input\{[^}]*min-height:44px/);
    expect(all).toMatch(/\.sn-c1 \.sn-search-button\{[^}]*min-width:44px;min-height:44px/);
    expect(all).toContain('.sn-visually-hidden{position:absolute');
  });
});
