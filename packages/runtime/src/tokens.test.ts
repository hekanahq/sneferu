import { describe, expect, it } from 'vitest';
import { onColor, themeTokenCss } from './tokens';

describe('onColor picks the text colour with the higher contrast', () => {
  it('near-black on a light peach (white would be 2.3:1)', () => expect(onColor('#E9946C')).toBe('#111111'));
  it('white on a dark navy', () => expect(onColor('#0A1122')).toBe('#FFFFFF'));
  it('near-black on a mid orange, white on a deep orange', () => {
    expect(onColor('#E2622E')).toBe('#111111');
    expect(onColor('#B94A1B')).toBe('#FFFFFF');
  });
  it('short hex and bad values', () => {
    expect(onColor('#fff')).toBe('#111111');
    expect(onColor('red')).toBeUndefined();
  });
});

describe('a theme on-colour token wins over the derived one', () => {
  it('keeps the theme on-accent and derives on-primary', () => {
    const css = themeTokenCss({ id: 'own', tokens: { colors: { primary: '#0A1122', accent: '#E9946C', 'on-accent': '#1F2433' } } });
    expect(css).toContain('--hk-color-on-accent:#1F2433');
    expect(css).not.toContain('--hk-color-on-accent:#111111');
    expect(css).toContain('--hk-color-on-primary:#FFFFFF');
  });
  it('without one, the derived colour is used', () => {
    expect(themeTokenCss({ id: 'own', tokens: { colors: { accent: '#E9946C' } } })).toContain('--hk-color-on-accent:#111111');
  });
});
