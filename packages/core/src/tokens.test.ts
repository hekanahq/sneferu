import { describe, it, expect } from 'vitest';
import { tokenSettings } from './tokens';
import { FIELD_INSPECTORS, FIELD_TYPES } from './fields';
import { sectionAllowedOn } from './page-types';

describe('tokenSettings', () => {
  it('has a colour per token plus fonts, radius, spacing, buttons and width, all grouped', () => {
    const s = tokenSettings({ colors: { primary: '#111111', 'on-sale': '#ff0000', 'Bad': '#000000', __proto__: '#000000' } as never });
    expect(Object.keys(s)).toEqual(['token_color_primary', 'token_color_on_sale', 'token_font_heading', 'token_font_body', 'token_font_mono', 'token_radius', 'token_spacing', 'token_button_style', 'token_container_width']);
    for (const f of Object.values(s)) { expect(f.group).toBeTruthy(); expect(f.label.en).toBeTruthy(); expect(f.label.ar).toBeTruthy(); expect(f.default).toBeDefined(); }
    expect(s.token_font_body!.options).toContain('Cairo');
    expect(tokenSettings(undefined).token_radius!.default).toBe(8);
    expect(tokenSettings({ fonts: { body: 'NotAFont' } }).token_font_body!.default).toBe('default');
  });
});

describe('field inspector metadata', () => {
  it('covers every field type', () => {
    expect(Object.keys(FIELD_INSPECTORS).sort()).toEqual([...FIELD_TYPES].sort());
    expect(FIELD_INSPECTORS.data.editable).toBe(false);
  });
});

describe('sectionAllowedOn', () => {
  it('allows everywhere without a list, else page type, exact alternate or group', () => {
    expect(sectionAllowedOn({}, 'cart')).toBe(true);
    expect(sectionAllowedOn(undefined, 'header')).toBe(true);
    expect(sectionAllowedOn({ templates: ['product'] }, 'product.codes')).toBe(true);
    expect(sectionAllowedOn({ templates: ['product.codes'] }, 'product')).toBe(false);
    expect(sectionAllowedOn({ templates: ['header'] }, 'footer')).toBe(false);
    expect(sectionAllowedOn({ templates: ['header'] }, 'header')).toBe(true);
  });
});
