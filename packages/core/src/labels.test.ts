import { describe, it, expect } from 'vitest';
import { normalizeFieldLabels, normalizeLabel } from './labels';
import { TagRegistry } from './registry';

describe('normalizeLabel', () => {
  it('accepts a plain string, { en } and { ar, en }', () => {
    expect(normalizeLabel('Title')).toEqual({ ar: 'Title', en: 'Title' });
    expect(normalizeLabel({ en: 'Title' })).toEqual({ ar: 'Title', en: 'Title' });
    expect(normalizeLabel({ ar: 'العنوان', en: 'Title' })).toEqual({ ar: 'العنوان', en: 'Title' });
  });
  it('uses en when ar is empty', () => expect(normalizeLabel({ ar: '  ', en: 'Title' })).toEqual({ ar: 'Title', en: 'Title' }));
  it.each([undefined, null, '', '   ', 5, [], {}, { ar: 'العنوان' }, { en: '' }, { en: 'T', ar: 5 }])('rejects %j', (v) => {
    expect(normalizeLabel(v)).toBeUndefined();
  });
});

describe('normalizeFieldLabels', () => {
  it('normalizes every label and keeps the rest of each field', () => {
    const r = normalizeFieldLabels({
      title: { type: 'text', label: 'Title', default: 'Hi' },
      count: { type: 'range', label: { en: 'Count' }, min: 1, max: 4 },
      both: { type: 'boolean', label: { ar: 'إظهار', en: 'Show' } },
      none: { type: 'text' },
    });
    expect(r.bad).toEqual([]);
    expect(r.schema).toEqual({
      title: { type: 'text', label: { ar: 'Title', en: 'Title' }, default: 'Hi' },
      count: { type: 'range', label: { ar: 'Count', en: 'Count' }, min: 1, max: 4 },
      both: { type: 'boolean', label: { ar: 'إظهار', en: 'Show' } },
      none: { type: 'text' },
    });
  });
  it('reports unreadable labels and leaves them as written', () => {
    const r = normalizeFieldLabels({ a: { type: 'text', label: { ar: 'فقط' } } });
    expect(r.bad).toEqual(['a']);
    expect(r.schema.a!.label).toEqual({ ar: 'فقط' });
  });
  it('treats a non-object schema as empty', () => expect(normalizeFieldLabels([])).toEqual({ schema: {}, bad: [] }));
});

describe('TagRegistry labels', () => {
  const tag = (label: unknown, propLabel: unknown) => ({
    name: 'hk-x' as const, version: 1, category: 'ui' as const, props: { text: { type: 'text' as const, label: propLabel as string } },
    allowedParents: '*' as const, allowedChildren: '*' as const, responsive: [], bindable: '*' as const,
    render: () => '', editor: { label: label as string, group: 'content', insertable: true },
  });
  it('stores English-only editor and prop labels as { ar, en }', () => {
    const t = new TagRegistry().register(tag('Box', { en: 'Text' })).get('hk-x')!;
    expect(t.editor.label).toEqual({ ar: 'Box', en: 'Box' });
    expect(t.props.text!.label).toEqual({ ar: 'Text', en: 'Text' });
    expect(t.render({}, {} as never)).toBe('');
  });
  it('refuses a tag without a readable label', () => {
    expect(() => new TagRegistry().register(tag({ ar: 'صندوق' }, 'Text'))).toThrow(/editor label/);
    expect(() => new TagRegistry().register(tag('Box', 7))).toThrow(/prop label/);
  });
});
