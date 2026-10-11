import { describe, it, expect } from 'vitest';
import { safeUrl } from '@hekana/sneferu-core';
import { sanitizeRichText } from './sanitize';

const A = (href?: string, body = 'x') => `<a${href === undefined ? '' : ` href="${href}"`} rel="nofollow noopener">${body}</a>`;

const cases: [string, string][] = [
  ['<p>Hi <b>there</b></p>', '<p>Hi <b>there</b></p>'],
  ['<img src=x onerror=alert(1)>', ''],
  ['<a href="javascript:alert(1)">x</a>', '<a rel="nofollow noopener">x</a>'],
  ['<a href="https://x.com" onclick="y">x</a>', '<a href="https://x.com" rel="nofollow noopener">x</a>'],
  ['<p style="color:red" class="z">t</p>', '<p>t</p>'],
  ['<style>p{}</style><p>a</p>', '<p>a</p>'],
  ['<b><script>alert(1)</script>ok</b>', '<b>ok</b>'],
  ['&lt;script&gt;x', '&lt;script&gt;x'],
  ['<p>a<p>b', '<p>a</p><p>b</p>'],
  ['<svg><a href="javascript:1">x</a></svg>', ''],
  ['<a href="//evil.com">x</a>', '<a rel="nofollow noopener">x</a>'],
  ['<ul><li>1<li>2</ul>', '<ul><li>1</li><li>2</li></ul>'],
  ['<h1>T</h1>', 'T'],
  ['<!-- c --><p>x</p>', '<p>x</p>'],
  ['<p>"q" & \'a\'</p>', '<p>"q" &amp; \'a\'</p>'],
];

/** Hostile and edge inputs beyond the brief's table. */
const more: [string, string][] = [
  // entity-encoded schemes are decoded once, then checked
  ['<a href="java&#115;cript:alert(1)">x</a>', A()],
  ['<a href="&#x6A;avascript:alert(1)">x</a>', A()],
  ['<a href="&#106&#97&#118&#97&#115&#99&#114&#105&#112&#116&#58alert(1)">x</a>', A()],
  ['<a href=" javascript:alert(1)">x</a>', A()],
  ['<a href="javascript&colon;alert(1)">x</a>', A()],
  ['<a href="java&Tab;script:alert(1)">x</a>', A()],
  ['<a href="java&NewLine;script:alert(1)">x</a>', A()],
  ['<a href="&sol;&sol;evil.com">x</a>', A()],
  ['<a href="/&bsol;evil.com">x</a>', A()],
  ['<a href="javascript&amp;colon;alert(1)">x</a>', A('javascript&amp;colon;alert(1)')],
  ['<a href="java\tscript:alert(1)">x</a>', A()],
  ['<a href="JaVaScRiPt:alert(1)">x</a>', A()],
  ['<a href="data:text/html,<script>alert(1)</script>">x</a>', A()],
  ['<a href="vbscript:x">x</a>', A()],
  ['<a href="http://x.com">x</a>', A()],
  ['<a href="/\\evil.com">x</a>', A()],
  ['<a href="#">x</a>', A()],
  // safe links survive, re-escaped
  ['<a href="/p?a=1&amp;b=2">x</a>', A('/p?a=1&amp;b=2')],
  ['<a href=\'https://x.com/"onmouseover=1\'>x</a>', A('https://x.com/&quot;onmouseover=1')],
  ['<a href=https://x.com/a>x</a>', A('https://x.com/a')],
  ['<A HREF="mailto:a@b.co">x</A>', A('mailto:a@b.co')],
  ['<a href="tel:0100">x</a>', A('tel:0100')],
  ['<a href="#size">x</a>', A('#size')],
  ['<a href="https://x.com" href="javascript:1">x</a>', A('https://x.com')],
  ['<a rel="opener" target="_blank" href="/x">x</a>', A('/x')],
  ['<a href="/a"><a href="/b">y</a></a>', `${A('/a', '')}${A('/b', 'y')}`],
  // tag soup
  ['<scr<script>ipt>alert(1)</script>', 'ipt&gt;alert(1)'],
  ['<<p>>x', '&lt;<p>&gt;x</p>'],
  ['<p>cut <b', '<p>cut </p>'],
  ['<a href="x', ''],
  ['a < b > c', 'a &lt; b &gt; c'],
  ['<p onclick=alert(1)>x</p>', '<p>x</p>'],
  ['<p/onclick=alert(1)>x</p>', '<p>x</p>'],
  ['<P>X</P>', '<p>X</p>'],
  ['<b>open', '<b>open</b>'],
  ['</p>stray</b>', 'stray'],
  ['<p>a</b>c</p>', '<p>ac</p>'],
  ['<b><p>x</b>y</p>', '<b><p>x</p></b>y'],
  ['<p><b>a<p>c', '<p><b>a</b></p><p>c</p>'],
  ['<p>a<ul><li>b</ul>', '<p>a</p><ul><li>b</li></ul>'],
  ['<h2>a<h3>b', '<h2>a</h2><h3>b</h3>'],
  ['<ul><li>a<ul><li>b</ul><li>c</ul>', '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'],
  ['<br/>x<br>', '<br>x<br>'],
  ['</br>', ''],
  ['<div>a</div><section>b</section>', 'ab'],
  // dropped containers, raw text and the classic mutation-XSS shapes
  ['<noscript><p title="</noscript><img src=x onerror=alert(1)>">', '"&gt;'],
  ['<style><img src=x onerror=1></style>', ''],
  ['<textarea><p>x</textarea>ok', 'ok'],
  ['<title><b>x</title>ok', 'ok'],
  ['<template><script>alert(1)</script></template>ok', 'ok'],
  ['<math><mi><a href="javascript:1">x</a></mi></math>ok', 'ok'],
  ['<svg><svg></svg>in</svg>out', 'out'],
  ['<svg/><p>x</p>', '<p>x</p>'],
  ['<iframe src="https://x"><p>x</p></iframe>ok', 'ok'],
  ['<object data="x"><p>x</p></object>ok', 'ok'],
  ['<script>unclosed', ''],
  ['<script src="x"></script ><p>ok</p>', '<p>ok</p>'],
  ['<xmp><img src=x onerror=1></xmp>ok', 'ok'],
  ['<plaintext><b>x', ''],
  ['<!--><img src=x onerror=1>-->ok', 'ok'],
  ['<!-- unclosed <p>x</p>', ''],
  ['<!DOCTYPE html><p>x</p>', '<p>x</p>'],
  ['<![CDATA[<img src=x onerror=1>]]>ok', ']]&gt;ok'],
  ['<?xml x?><p>x</p>', '<p>x</p>'],
  ['<form action="javascript:1"><input value="x"><button>go</button></form>', 'go'],
  ['<base href="https://evil.com"><meta http-equiv="refresh"><link rel="import">', ''],
  // entities
  ['&amp;lt;script&amp;gt;', '&amp;lt;script&amp;gt;'],
  ['&lt;img src=x onerror=1&gt;', '&lt;img src=x onerror=1&gt;'],
  ['a&nbsp;b &copy; &hellip;', 'a\u00A0b © …'],
  ['&rlm;&lrm;&zwj;', '\u200F\u200E\u200D'],
  ['&#0;&#xD800;&#x110000;', '\uFFFD\uFFFD\uFFFD'],
  ['&unknown; &amp', '&amp;unknown; &amp;amp'],
  ['&constructor;&toString;&hasOwnProperty;', '&amp;constructor;&amp;toString;&amp;hasOwnProperty;'],
  ['a\u0000b', 'ab'],
  // content in Arabic is kept as is
  ['<p>مرحبا <strong>بك</strong></p>', '<p>مرحبا <strong>بك</strong></p>'],
  ['<h4>a</h4><blockquote>q</blockquote><span>s</span><s>x</s><u>u</u><i>i</i><em>e</em>', '<h4>a</h4><blockquote>q</blockquote><span>s</span><s>x</s><u>u</u><i>i</i><em>e</em>'],
];

describe('sanitizeRichText', () => {
  it.each(cases)('%s', (input, out) => expect(sanitizeRichText(input)).toBe(out));
  it.each(more)('hostile: %s', (input, out) => expect(sanitizeRichText(input)).toBe(out));

  it('output re-parses to itself (idempotent)', () => {
    for (const [i] of [...cases, ...more]) {
      const once = sanitizeRichText(i);
      expect(sanitizeRichText(once), i).toBe(once);
    }
  });

  it('returns empty for anything that is not a string', () => {
    for (const v of [null, undefined, 1, {}, ['<p>x</p>'], { toString: () => '<script>' }]) expect(sanitizeRichText(v as never)).toBe('');
  });

  it('caps output at maxChars (default 100 000), still balanced and idempotent', () => {
    const big = `<p><b>${'x'.repeat(200_000)}</b></p>`;
    const out = sanitizeRichText(big);
    expect(out.length).toBeLessThanOrEqual(100_000);
    expect(out.startsWith('<p><b>xxx')).toBe(true);
    expect(out.endsWith('x</b></p>')).toBe(true);
    expect(sanitizeRichText(out)).toBe(out);
    const small = sanitizeRichText('<p>abc &amp; def</p><p>second</p>', { maxChars: 16 });
    expect(small.length).toBeLessThanOrEqual(16);
    expect(small).toBe('<p>abc &amp;</p>');
    expect(sanitizeRichText('<p>x</p>', { maxChars: 3 })).toBe('');
    expect(sanitizeRichText('ab', { maxChars: Number.NaN })).toBe('ab');
    // never splits a surrogate pair
    expect(sanitizeRichText('a😀', { maxChars: 2 })).toBe('a');
  });

  it('survives deep nesting and huge soups without recursion', () => {
    const deep = '<b>'.repeat(50_000) + 'x' + '</b>'.repeat(50_000);
    const out = sanitizeRichText(deep);
    expect(out).toContain('x');
    expect((out.match(/<b>/g) ?? []).length).toBeLessThanOrEqual(64);
    expect(sanitizeRichText(out)).toBe(out);
    expect(sanitizeRichText('<a '.repeat(30_000)).length).toBe(0);
  });

  it('never emits an attribute other than href/rel (seeded fuzz)', () => {
    let seed = 0x5eed;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
    const tags = ['p', 'b', 'a', 'A', 'li', 'ul', 'script', 'style', 'svg', 'math', 'img', 'iframe', 'span', 'h2', 'div', 'textarea', 'noscript', 'template', 'br', 'x-y', 'title'];
    const attrs = ['href', 'HREF', 'onclick', 'onerror', 'style', 'src', 'rel', 'class', 'id', 'x', 'formaction', 'xlink:href', ''];
    const vals = ['"javascript:alert(1)"', "'https://x.com'", 'https://x.com', '"//evil"', '"java&#115;cript:1"', '"a\'b"', "'a\"b'", '"<script>"', '"/p?a=1&b=2"', '"x', '>', '"&quot;onmouseover=1"', '"#"'];
    const bits = ['text', '&amp;', '&lt;', '&#60;', '<', '>', '"', "'", '=', '/', '-->', '<!--', '</', ' ', '\n', 'مرحبا', '&', '<!', '<?'];
    const gen = () => {
      let s = '';
      const n = 1 + Math.floor(rnd() * 25);
      for (let i = 0; i < n; i++) {
        const r = rnd();
        if (r < 0.4) {
          s += `<${pick(tags)}`;
          const k = Math.floor(rnd() * 4);
          for (let j = 0; j < k; j++) s += `${pick([' ', '/', '\n', '\t'])}${pick(attrs)}${rnd() < 0.7 ? `=${pick(vals)}` : ''}`;
          s += rnd() < 0.9 ? pick(['>', '/>']) : '';
        } else if (r < 0.6) s += `</${pick(tags)}${rnd() < 0.9 ? '>' : ''}`;
        else s += pick(bits);
      }
      return s;
    };
    const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'span']);
    let withHref = 0;
    let withTags = 0;
    for (let i = 0; i < 500; i++) {
      const input = gen();
      const out = sanitizeRichText(input);
      if (out.includes(' href="')) withHref++;
      if (/<\w/.test(out)) withTags++;
      for (const m of out.matchAll(/<(?!\/)[^>]*>/g)) {
        expect(m[0], input).toMatch(/^<\w+(\s+(href|rel)="[^"<>]*")*\s*>$/);
        expect(ALLOWED.has(/^<(\w+)/.exec(m[0])![1]!), input).toBe(true);
        const href = /href="([^"]*)"/.exec(m[0]);
        if (href) {
          const decoded = href[1]!.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          expect(safeUrl(decoded), input).toBe(decoded);
          expect(decoded).not.toBe('#');
        }
      }
      for (const m of out.matchAll(/<\/([^>]*)>/g)) expect(ALLOWED.has(m[1]!), input).toBe(true);
      // with every tag removed, no markup character is left raw
      expect(out.replace(/<\/?\w+[^<>]*>/g, ''), input).not.toMatch(/[<>]/);
      expect(sanitizeRichText(out), input).toBe(out);
    }
    // the generator really exercises kept links and markup
    expect(withHref).toBeGreaterThan(5);
    expect(withTags).toBeGreaterThan(200);
  });
});
