import { describe, it, expect } from 'vitest';
import { sectionAllowedOn, TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, withDefaults, type Artifact } from '@hekana/sneferu-compiler';
import { BASE_TAGS, createDefaultRegistry } from '@hekana/sneferu-components';
import { renderPage, type RenderContext } from '@hekana/sneferu-runtime';
import { DEFAULT_THEME_FILES } from '@hekana/sneferu-templates-default';

const registry = createDefaultRegistry();
const own = (): Artifact => compileTheme(DEFAULT_THEME_FILES, registry, { defaults: false }).artifact!;

function render(props: Record<string, unknown>, locale: 'ar' | 'en' = 'ar') {
  const art = withDefaults(own(), registry);
  const ctx = { locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP', store: { name: 'S' }, settings: {}, data: {}, collections: {}, products: {},
    translations: {}, fallbackTranslations: {}, assetUrl: (p: string) => p, imageUrl: (r: unknown) => String(r), url: (p: string) => p } as unknown as RenderContext;
  return renderPage(art as never, { template: 'index', ctx, registry, scope: {} as never, sections: [{ id: 's1', type: 'announcement-banner', props }] });
}

describe('announcement banner section in every theme', () => {
  it('a stored artifact gets the section without a re-publish, stable under a second pass', () => {
    const before = own();
    expect(before.sections['announcement-banner']).toBeUndefined();
    const after = withDefaults(before, registry);
    expect(after.sections['announcement-banner']).toBeDefined();
    expect(withDefaults(after, registry).hash).toBe(after.hash);
  });

  it('is bilingual, has six message slots with links, motion, speed and colours', () => {
    const s = withDefaults(own(), registry).sections['announcement-banner']!;
    expect(s.schema.name).toEqual({ ar: 'شريط إعلانات', en: 'Announcement bar' });
    const keys = Object.keys(s.schema.settings);
    for (const k of ['m1', 'l1', 'm6', 'l6', 'motion', 'speed', 'background', 'color', 'dismissible']) expect(keys, k).toContain(k);
    expect(keys).not.toContain('m7');
  });

  it('is offered on page templates and in the announcement group, not in the cart or header', () => {
    const s = withDefaults(own(), registry).sections['announcement-banner']!;
    for (const ok of ['index', 'product', 'collection', 'page', 'announcement']) expect(sectionAllowedOn(s.schema, ok), ok).toBe(true);
    for (const no of ['cart', 'checkout', 'header', 'footer']) expect(sectionAllowedOn(s.schema, no), no).toBe(false);
  });

  it('a theme that defines its own announcement-banner keeps it', () => {
    const mine = own();
    const marker = { ir: [{ k: 'html' as const, s: '<i>mine</i>' }], schema: { name: { ar: 'م', en: 'M' }, version: 1, settings: {} } };
    expect(withDefaults({ ...mine, sections: { ...mine.sections, 'announcement-banner': marker } }, registry).sections['announcement-banner']).toBe(marker);
  });

  it('a theme with its own announcement-bar section keeps it next to the platform one', () => {
    const mine = own();
    const marker = { ir: [{ k: 'html' as const, s: '<i>bar</i>' }], schema: { name: { ar: 'ش', en: 'Bar' }, version: 1, settings: {} } };
    const out = withDefaults({ ...mine, sections: { ...mine.sections, 'announcement-bar': marker } }, registry);
    expect(out.sections['announcement-bar']).toBe(marker);
    expect(out.sections['announcement-banner']).toBeDefined();
  });

  it('an older registry without the tag changes nothing', () => {
    const bare = new TagRegistry();
    for (const t of BASE_TAGS) if (t.name !== 'hk-announcement') bare.register(t);
    expect(withDefaults(own(), bare).sections['announcement-banner']).toBeUndefined();
  });
});

describe('announcement banner rendering', () => {
  const two = { m1: 'شحن مجاني', l1: '/collections/all', m2: 'خصم 10%', motion: 'static' };

  it('prints nothing when no message is filled in', () => {
    const r = render({ motion: 'marquee' });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).not.toContain('sn-announcement');
  });

  it('static: every filled message on one wrapping line, links only where set', () => {
    const r = render(two);
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('sn-ann-static');
    expect(r.html).toContain('<a class="sn-ann-i" href="/collections/all">شحن مجاني</a>');
    expect(r.html).toContain('<span class="sn-ann-i">خصم 10%</span>');
    expect(r.html).not.toMatch(/<script/);
    expect(r.css).not.toContain('@keyframes sn-ann-');
  });

  it('escapes text and refuses a javascript: link', () => {
    const r = render({ m1: '<img src=x onerror=1>', l1: 'javascript:alert(1)', m2: 'ok' });
    expect(r.html).not.toContain('<img');
    expect(r.html).not.toMatch(/javascript:/i);
  });

  it('rotate: stacks the messages, fades them in turn, and each has its own delay', () => {
    const r = render({ ...two, motion: 'rotate', speed: 5 });
    const id = /sn-announcement/.test(r.html) ? /class="(sn-[^" ]+) sn-announcement/.exec(r.html)![1]! : '';
    expect(r.html).toContain('sn-ann-stack');
    expect(r.css).toContain(`@keyframes sn-ann-${id.slice(3)}`);
    expect(r.css).toContain('.sn-ann-stack>.sn-ann-i:nth-child(1){animation-delay:0s}');
    expect(r.css).toMatch(/nth-child\(2\)\{animation-delay:5s\}/);
  });

  it('rotate with a single message is static', () => {
    const r = render({ m1: 'واحدة', motion: 'rotate' });
    expect(r.html).toContain('sn-ann-static');
    expect(r.css).not.toContain('@keyframes sn-ann-');
  });

  it('marquee: two copies of the track, the second hidden from assistive tech', () => {
    const r = render({ ...two, motion: 'marquee' });
    expect(r.html.match(/sn-ann-group/g)!.length).toBe(2);
    expect(r.html).toContain('class="sn-ann-group" aria-hidden="true"');
  });

  it('marquee direction follows the reading direction', () => {
    expect(render({ ...two, motion: 'marquee' }, 'ar').css).toContain('translateX(50%)');
    expect(render({ ...two, motion: 'marquee' }, 'en').css).toContain('translateX(-50%)');
  });

  it('every animation is switched off for reduced motion', () => {
    for (const motion of ['rotate', 'marquee']) {
      const r = render({ ...two, motion });
      expect(r.css, motion).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*animation:none/);
    }
  });

  it('a faster speed scrolls in less time', () => {
    const secs = (speed: number) => Number(/animation:sn-ann-\S+ (\d+)s linear infinite/.exec(render({ m1: 'x'.repeat(120), m2: 'y'.repeat(120), motion: 'marquee', speed }).css)![1]);
    expect(secs(10)).toBeLessThan(secs(1));
  });

  it('dismissible adds a keyboard-reachable close control and nothing runs', () => {
    const r = render({ ...two, dismissible: true });
    expect(r.html).toContain('<input type="checkbox" class="sn-ann-x" aria-label="إغلاق">');
    expect(r.css).toContain(':has(>.sn-ann-x:checked){display:none}');
    expect(render(two).html).not.toContain('sn-ann-x');
  });

  it('is not left behind by a stale text colour: only a theme token or hex is accepted', () => {
    expect(render({ ...two, color: 'theme:background' }).css).toContain('color:var(--hk-color-background)');
    expect(render({ ...two, color: 'red;position:fixed' }).css).not.toMatch(/\.sn-announcement[^}]*color:red/);
    expect(render({ ...two, color: 'red;position:fixed' }).css).not.toContain('red;position');
  });
});
