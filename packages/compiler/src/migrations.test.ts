import { describe, it, expect } from 'vitest';
import { TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, type ThemeFile } from './compile';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = { id: 'tthm', name: 'T', version: '1.2.0', author: 'a', description: 'd', category: 'c', engine: 'hk2', engineCompatibility: '^2.0.0', defaultLocale: 'en', locales: ['en', 'ar'], settings: { shop_name: { type: 'text', label: 'Shop', default: 'x' } }, tokens: { colors: { primary: '#111111', secondary: '#222222', accent: '#333333', background: '#ffffff', text: '#000000', muted: '#888888' }, fonts: { body: 'Inter' }, radius: { md: '12px' }, layout: { contentWidth: '1100px' } } };
const tag = (name: string, extra: object = {}) => ({ name, version: 1, category: 'layout', props: { name: { type: 'select', label: 'n', options: ['header', 'footer', 'announcement'] } }, allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', render: () => '', editor: { label: 'x', group: 'layout', insertable: false }, ...extra }) as never;
const reg = new TagRegistry().register(tag('hk-section-group')).register(tag('hk-thing', { strings: { greet: { ar: 'اهلا', en: 'Hello' } }, props: {} }));
const sec = (extra = '') => `<div>{{ section.settings.t }}</div><hk-schema>{"name":"S","settings":{"t":{"type":"text","label":"T","default":"x"}}${extra}}</hk-schema>`;
const base = (extra: ThemeFile[] = [], layout = '<hk-section-group name="header" /><main><hk-slot name="content" /></main>'): ThemeFile[] => [
  f('theme.json', JSON.stringify(manifest)), f('layout/theme.sneferu', layout), f('templates/index.sneferu', '<hk-sections />'),
  f('sections/bar.sneferu', sec(',"templates":["header","index"]')), f('sections/body.sneferu', sec(',"templates":["product"]')), f('blocks/link.sneferu', '<a href="/">x</a><hk-schema>{"name":"L","settings":{}}</hk-schema>'),
  ...extra,
];
const c = (files: ThemeFile[]) => compileTheme(files, reg, { defaults: false });
const errs = (files: ThemeFile[]) => c(files).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const without = (files: ThemeFile[], ...paths: string[]) => files.filter((x) => !paths.includes(x.path));

const mig = (name: string, body: object | string) => f(`migrations/${name}.json`, typeof body === 'string' ? body : JSON.stringify(body));

describe('migrations in the artifact', () => {
  it('compiles valid files, sorted by from; none means no field', () => {
    expect(c(base()).artifact!.migrations).toBeUndefined();
    const { artifact, diagnostics } = c(base([
      mig('1.1.0-1.2.0', { from: '1.1.0', to: '1.2.0', settings: { rename: { old_t: 't' } }, sections: { rename: { banner: 'bar' }, remove: ['gone'] }, blocks: { remove: ['oldlink'] } }),
      mig('a', { from: '1.0.0', to: '1.1.0', settings: { rename: { store: 'shop_name' } } }),
    ]));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(artifact!.migrations!.map((m) => m.from)).toEqual(['1.0.0', '1.1.0']);
    expect(artifact!.migrations![1]!.sections).toEqual({ rename: { banner: 'bar' }, remove: ['gone'] });
  });
  it('rejects malformed files (SN3045)', () => {
    for (const body of ['{nope', '[]', { from: '1.0.0' }, { from: '1.0.0', to: '1.1.0', extra: 1 }, { from: '1.0.0', to: '1.1.0', settings: { rename: { '__proto__x!': 't' } } },
      { from: '1.0.0', to: '1.1.0', settings: { rename: { t: 't' } } }, { from: '1.0.0', to: '1.1.0', settings: { rename: { a: 't', b: 't' } } },
      { from: '1.0.0', to: '1.1.0', settings: { rename: { a: 't' }, remove: ['a'] } }, { from: '1.0.0', to: '1.1.0', settings: { remove: 'a' } }]) {
      expect(errs(base([mig('x', body as object | string)]))).toEqual(['SN3045']);
    }
  });
  it('checks versions (SN3046)', () => {
    expect(errs(base([mig('x', { from: '1.1.0', to: '1.0.0' })]))).toEqual(['SN3046']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.3.0' })]))).toEqual(['SN3046']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0' }), mig('y', { from: '1.0.0', to: '1.1.0' })]))).toEqual(['SN3046']);
  });
  it('checks rename targets against the current theme (SN3047)', () => {
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0', settings: { rename: { a: 'nope' } } })]))).toEqual(['SN3047']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0', sections: { rename: { a: 'ghost' } } })]))).toEqual(['SN3047']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0', blocks: { rename: { a: 'bar' } } })]))).toEqual(['SN3047']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0', sections: { remove: ['bar'] } })]))).toEqual(['SN3047']);
    expect(errs(base([mig('x', { from: '1.0.0', to: '1.1.0', settings: { rename: { a: 'shop_name', b: 't' } } })]))).toEqual([]);
  });
});
