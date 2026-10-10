import { describe, it, expect } from 'vitest';
import { TagRegistry } from './registry';
import type { HkTag } from './tags';
import { coerceSetting, defaultsOf, type FieldSchema } from './fields';

const schema: FieldSchema = {
  title: { type: 'text', label: { ar: 'العنوان', en: 'Title' }, default: 'Hi' },
  columns: { type: 'range', label: { ar: 'أعمدة', en: 'Columns' }, min: 1, max: 6, default: 3, responsive: true },
  style: { type: 'select', label: { ar: 'نمط', en: 'Style' }, options: ['solid', 'outline'], default: 'solid' },
  show: { type: 'boolean', label: { ar: 'إظهار', en: 'Show' }, default: true },
  accent: { type: 'color', label: { ar: 'لون', en: 'Colour' }, default: 'theme:accent' },
};

describe('fields', () => {
  it('collects defaults', () => {
    expect(defaultsOf(schema)).toEqual({ title: 'Hi', columns: 3, style: 'solid', show: true, accent: 'theme:accent' });
  });
  it('coerces values and falls back to defaults', () => {
    expect(coerceSetting(schema.columns!, 99)).toBe(6);
    expect(coerceSetting(schema.columns!, '2')).toBe(2);
    expect(coerceSetting(schema.style!, 'neon')).toBe('solid');
    expect(coerceSetting(schema.show!, 'yes')).toBe(true);
    expect(coerceSetting(schema.accent!, 'red; background:url(x)')).toBe('theme:accent');
    expect(coerceSetting(schema.accent!, '#A3E635')).toBe('#A3E635');
    expect(coerceSetting(schema.columns!, { base: 4, mobile: 1 })).toEqual({ base: 4, mobile: 1 });
  });
});

describe('TagRegistry', () => {
  it('registers and rejects duplicates', () => {
    const r = new TagRegistry();
    const tag: HkTag = { name: 'hk-x', version: 1, category: 'ui', props: {}, allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
      render: () => '<x></x>', editor: { label: { ar: 'س', en: 'X' }, group: 'ui', insertable: true } };
    r.register(tag);
    expect(r.has('hk-x')).toBe(true);
    expect(() => r.register(tag)).toThrow(/already registered/);
    expect([...r.names()]).toEqual(['hk-x']);
  });
});
