import { describe, expect, it } from 'vitest';
import { parseTemplate } from './parser';

const html = (src: string) => JSON.stringify(parseTemplate(src, 'f').nodes, (k, v) => (k === 'loc' ? undefined : v));

describe('whitespace normalisation', () => {
  it('collapses runs and drops whitespace next to blocks and at block edges', () => {
    expect(html('<div>\n  <p>\n    Hello   there\n  </p>\n</div>\n')).toBe(html('<div><p>Hello there</p></div>'));
  });
  it('keeps one space where inline content needs it', () => {
    expect(html('<p><b>a</b>\n   <i>b</i></p>')).toBe(html('<p><b>a</b> <i>b</i></p>'));
    expect(html('<p><b>a</b><i>b</i></p>')).not.toBe(html('<p><b>a</b> <i>b</i></p>'));
    expect(html('<span> x </span>')).toBe(html('<span> x </span>'));
  });
  it('drops whitespace between flex and grid items, but not inside a text run', () => {
    expect(html('<hk-stack>\n  <hk-button label="a" href="/" />\n  <hk-button label="b" href="/" />\n</hk-stack>')).toBe(html('<hk-stack><hk-button label="a" href="/" /><hk-button label="b" href="/" /></hk-stack>'));
    expect(html('<hk-stack>{{ a }} {{ b }}</hk-stack>')).not.toBe(html('<hk-stack>{{ a }}{{ b }}</hk-stack>'));
  });
  it('keeps whitespace at the edges of if and for bodies unless a block is next to it', () => {
    expect(html('<p>{% if a %} x {% endif %}</p>')).not.toBe(html('<p>{% if a %}x{% endif %}</p>'));
    expect(html('<div>{% if a %}\n  <p>x</p>\n{% endif %}</div>')).toBe(html('<div>{% if a %}<p>x</p>{% endif %}</div>'));
  });
  it('treats comments and the schema as invisible: the text either side is one run', () => {
    expect(html('<p>a <!-- c --> b</p>')).toBe(html('<p>a b</p>'));
    expect(html('<p>a<!-- c -->b</p>')).toBe(html('<p>ab</p>'));
  });
  it('leaves pre exactly as written; a no-break space is content', () => {
    expect(parseTemplate('<pre>  a\n   b </pre>', 'f').nodes[0]).toMatchObject({ children: [{ t: 'text', v: '  a\n   b ' }] });
    expect(parseTemplate('<p>a  b</p>', 'f').nodes[0]).toMatchObject({ children: [{ t: 'text', v: 'a  b' }] });
  });
});
