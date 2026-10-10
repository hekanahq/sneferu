import { describe, it, expect } from 'vitest';
import { lex } from './lexer';

describe('lex', () => {
  it('splits HTML, interpolation, directives and schema with locations', () => {
    const src = '<section class="a {{ x }}">\n  مرحبا {{ product.title }}{% if a %}<br/>{% endif %}\n</section>\n<hk-schema>{"name":"x"}</hk-schema>';
    const { tokens, diagnostics } = lex(src, 'sections/a.sneferu');
    expect(diagnostics).toEqual([]);
    expect(tokens.map((t) => t.t)).toEqual(['open', 'text', 'interp', 'dir', 'open', 'dir', 'text', 'close', 'text', 'schema']);
    const open = tokens[0] as Extract<(typeof tokens)[number], { t: 'open' }>;
    expect(open.attrs).toEqual([{ name: 'class', value: 'a {{ x }}', loc: { line: 1, col: 10 } }]);
    expect((tokens[1] as { v: string }).v).toBe('\n  مرحبا ');
    expect(tokens[2]).toMatchObject({ t: 'interp', src: 'product.title', loc: { line: 2, col: 9 } });
    expect(tokens[4]).toMatchObject({ t: 'open', name: 'br', selfClosing: true });
    expect(tokens[9]).toMatchObject({ t: 'schema', json: '{"name":"x"}' });
  });

  it('drops HTML comments and reports unterminated constructs', () => {
    expect(lex('<!-- x -->a', 'f').tokens).toEqual([{ t: 'text', v: 'a', loc: { line: 1, col: 11 } }]);
    const codes = (s: string) => lex(s, 'f').diagnostics.map((d) => d.code);
    expect(codes('{{ x')).toEqual(['SN1001']);
    expect(codes('{% if x')).toEqual(['SN1002']);
    expect(codes('<div class="x')).toEqual(['SN1003']);
    expect(codes('<hk-schema>{}')).toEqual(['SN1004']);
  });
});
