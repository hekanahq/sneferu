import { describe, it, expect } from 'vitest';
import { coerceSetting, type Field } from './fields';

const f: Field = { type: 'text', label: { ar: 'x', en: 'x' }, localized: true, default: { ar: 'أهلا', en: 'Hello' } };

describe('localized text settings', () => {
  it('resolves {ar,en} by locale with fallback', () => {
    expect(coerceSetting(f, undefined, 'en')).toBe('Hello');
    expect(coerceSetting(f, { ar: 'مرحبا' }, 'en')).toBe('مرحبا');
    expect(coerceSetting(f, 'plain', 'ar')).toBe('plain');
    expect(coerceSetting(f, { ar: 1, en: {} }, 'ar')).toBe('أهلا');
    expect(coerceSetting(f, { ar: 'a' })).toEqual({ ar: 'a' });
  });
  it('maxLength applies per locale', () => {
    expect(coerceSetting({ ...f, maxLength: 3 }, { en: 'abcdef' }, 'en')).toBe('abc');
  });
  it('non-localized text ignores objects', () => {
    expect(coerceSetting({ type: 'text', label: { ar: '', en: '' }, default: 'd' }, { en: 'x' }, 'en')).toBe('d');
  });
  it('a plain-string default resolves too, and nothing resolves to an empty string', () => {
    expect(coerceSetting({ ...f, default: 'plain' }, undefined, 'en')).toBe('plain');
    expect(coerceSetting({ ...f, default: undefined }, {}, 'en')).toBe('');
  });
  it('works for textarea and rich_text', () => {
    expect(coerceSetting({ ...f, type: 'rich_text' }, { en: '<p>x</p>' }, 'en')).toBe('<p>x</p>');
    expect(coerceSetting({ ...f, type: 'textarea' }, { ar: 'س' }, 'en')).toBe('س');
  });
});
