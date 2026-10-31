import { describe, it, expect } from 'vitest';
import type { TagRenderContext } from '@hekana/sneferu-core';
import { hkContainer, hkGrid, hkSection, hkStack } from './layout';

const mk = () => { const css: string[] = []; const c: TagRenderContext = { id: 'c1', css: (r) => css.push(r), controller: () => {}, data: {}, locale: 'ar', dir: 'rtl', t: (k) => k, renderChildren: () => '<i></i>', url: (p) => p }; return { c, css }; };

describe('layout tags', () => {
  it('hk-grid emits responsive columns', () => {
    const { c, css } = mk();
    expect(hkGrid.render({ columns: { base: 4, tablet: 2, mobile: 1 }, gap: 24 }, c)).toBe('<div class="sn-c1 sn-grid"><i></i></div>');
    expect(css).toEqual([
      '.sn-c1{display:grid}',
      '.sn-c1{grid-template-columns:repeat(4,minmax(0,1fr))}',
      '@media (max-width:1023px){.sn-c1{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media (max-width:639px){.sn-c1{grid-template-columns:repeat(1,minmax(0,1fr))}}',
      '.sn-c1{gap:24px}',
    ]);
  });
  it('hk-section and hk-container stay valid when the content width is none (full)', () => {
    const { c, css } = mk();
    hkSection.render({}, c);
    hkContainer.render({}, c);
    expect(css.join('')).toContain('max-width:var(--hk-content-width,1280px)');
    expect(css.join('')).toContain('padding-inline:var(--hk-gutter,16px)');
  });
  it('hk-section contains content unless full-bleed and maps theme colours', () => {
    const { c, css } = mk();
    expect(hkSection.render({ background: 'theme:secondary', paddingY: 48 }, c)).toBe('<section class="sn-c1"><div class="sn-inner"><i></i></div></section>');
    expect(css).toContain('.sn-c1{background:var(--hk-color-secondary)}');
    expect(css).toContain('.sn-c1>.sn-inner{max-width:var(--hk-content-width,1280px);margin-inline:auto;padding-inline:var(--hk-gutter,16px)}');
    expect(css).toContain('.sn-c1{padding-block:48px}');
  });
  it('rejects unsafe values instead of emitting them', () => {
    const { c, css } = mk();
    hkStack.render({ direction: 'row;}body{display:none', gap: 'x' }, c);
    expect(css.join('')).not.toContain('body');
    expect(css.join('')).not.toContain('display:none');
  });
  it('hk-grid keeps display:grid when only tablet/mobile columns are valid (M2)', () => {
    const { c, css } = mk();
    hkGrid.render({ columns: { base: 99, mobile: 1 } }, c);
    expect(css[0]).toBe('.sn-c1{display:grid}');
    expect(css).toContain('@media (max-width:639px){.sn-c1{grid-template-columns:repeat(1,minmax(0,1fr))}}');
  });
});
