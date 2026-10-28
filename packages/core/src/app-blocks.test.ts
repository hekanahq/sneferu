import { describe, it, expect } from 'vitest';
import {
  APP_BLOCKS,
  appBlockAvailable,
  appBlockFrameQuery,
  appBlockOfSection,
  appBlockSectionSettings,
  appBlockSectionType,
  appBlockSettings,
  findAppBlock,
  validateAppBlocks,
  type AppBlockDef,
} from './app-blocks';

const sample: AppBlockDef = {
  app: 'demo_app',
  block: 'card',
  path: '/hk2/app-block/demo/card',
  templates: ['product', 'cart'],
  context: 'none',
  settings: {
    heading: { type: 'text', label: { ar: 'ع', en: 'H' }, localized: true, maxLength: 5, default: '' },
    size: { type: 'number', label: { ar: 'ح', en: 'S' }, min: 1, max: 3, default: 2, frame: true },
    mode: { type: 'select', label: { ar: 'ن', en: 'M' }, options: ['a', 'b'], default: 'a', frame: true },
  },
  name: { ar: 'ب', en: 'Card' },
  description: { ar: 'و', en: 'Desc' },
};

describe('app block registry', () => {
  it('lists Subscriptions subscribe on the product page and is itself valid', () => {
    expect(validateAppBlocks(APP_BLOCKS)).toEqual([]);
    const d = findAppBlock('customer_subscriptions', 'subscribe')!;
    expect(d.path).toBe('/hk2/app-block/subscriptions/subscribe');
    expect(d.templates).toEqual(['product']);
    expect(d.context).toBe('product');
  });
  it('rejects an unknown app, an unknown block and a pair from two apps', () => {
    expect(findAppBlock('nope', 'subscribe')).toBeUndefined();
    expect(findAppBlock('customer_subscriptions', 'nope')).toBeUndefined();
    expect(findAppBlock('customer_subscriptions', 'icon')).toBeUndefined();
    expect(findAppBlock(undefined, 'subscribe')).toBeUndefined();
    expect(findAppBlock('constructor', '__proto__')).toBeUndefined();
  });
  it('refuses entries that point outside /hk2/app-block, repeat, or lack a label', () => {
    const bad = { ...sample, path: 'https://evil.example/x' };
    expect(validateAppBlocks([bad])[0]).toContain('path');
    expect(validateAppBlocks([sample, sample]).join()).toContain('listed twice');
    expect(validateAppBlocks([{ ...sample, path: '/hk2/app-block/a/../b' }]).join()).toContain('path');
    expect(validateAppBlocks([{ ...sample, templates: ['nowhere'] }]).join()).toContain('not a page type');
    expect(validateAppBlocks([{ ...sample, name: { ar: '', en: 'x' } }]).join()).toContain('name');
    expect(validateAppBlocks([{ ...sample, app: 'Bad App' }]).join()).toContain('app id');
  });
  it('keeps only declared settings, coerced to their type and limits', () => {
    const s = appBlockSettings(sample, { heading: 'abcdefgh', size: '9', mode: 'zzz', extra: '<script>' }, 'en');
    expect(s).toEqual({ heading: 'abcde', size: 3, mode: 'a' });
    expect(appBlockSettings(sample, null, 'ar')).toEqual({ heading: '', size: 2, mode: 'a' });
    expect(appBlockSettings(sample, { heading: { ar: 'مرحبا', en: 'Hi' } }, 'ar').heading).toBe('مرحبا');
  });
  it('forwards only frame settings, encoded, to the framed page', () => {
    const q = appBlockFrameQuery(sample, { heading: 'x', size: 3, mode: 'b' });
    expect(q).toBe('s_size=3&s_mode=b');
    expect(appBlockFrameQuery(sample, {})).toBe('');
  });
  it('derives the editor section name and offers it only when the app is installed', () => {
    const t = appBlockSectionType(findAppBlock('customer_subscriptions', 'subscribe')!);
    expect(t).toBe('app-customer-subscriptions-subscribe');
    expect(t.startsWith('hk-')).toBe(false);
    expect(appBlockOfSection(t)!.block).toBe('subscribe');
    expect(appBlockOfSection('hero')).toBeUndefined();
    expect(appBlockAvailable(t, [])).toBe(false);
    expect(appBlockAvailable(t, ['other'])).toBe(false);
    expect(appBlockAvailable(t, ['customer_subscriptions'])).toBe(true);
    expect(appBlockAvailable('hero', [])).toBe(true);
  });
  it('gives the editor section the entry settings without the frame flag, plus spacing', () => {
    const f = appBlockSectionSettings(sample);
    expect(Object.keys(f)).toEqual(['heading', 'size', 'mode', 'padding_y']);
    expect('frame' in f.size!).toBe(false);
  });
});
