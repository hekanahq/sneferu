import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

const r = createDefaultRegistry();
const render = (props: Record<string, unknown>, locale: 'ar' | 'en' = 'en') => {
  const css: string[] = [];
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr', t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return r.get('hk-newsletter-form')!.render(props, c);
};

describe('hk-newsletter-form', () => {
  it('renders one email input and a disabled button until the platform script runs', () => {
    const html = render({});
    expect(html).toMatch(/^<form class="sn-c1 sn-newsletter"/);
    expect(html).toContain('data-hk-controller="newsletter"');
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).toContain('type="email" name="email" required maxlength="254" autocomplete="email"');
    expect(html).toContain('class="sn-btn sn-btn-solid sn-newsletter-button" disabled>Subscribe</button>');
    expect(html).toContain('role="status" aria-live="polite" hidden');
    expect(html).not.toContain('action=');
  });

  it('uses Arabic built-in copy and lets the theme override the words', () => {
    expect(render({}, 'ar')).toContain('>اشترك</button>');
    const html = render({ label: 'Mail', buttonLabel: 'Join', placeholder: 'you@x.com', successMessage: 'Welcome', showLabel: true });
    expect(html).toContain('for="c1-email">Mail</label>');
    expect(html).not.toContain('sn-visually-hidden');
    expect(html).toContain('>Join</button>');
    expect(html).toContain('placeholder="you@x.com"');
    expect(html).toContain('Welcome');
  });

  it('escapes prop text', () => {
    const html = render({ label: '"><script>', placeholder: '"><img>' });
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img>');
  });
});
