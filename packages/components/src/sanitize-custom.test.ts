import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';
import { sanitizeCustomHtml } from './sanitize-custom';
import { sanitizeScopedCss } from './sanitize-css';

const H = (s: string, o = {}) => sanitizeCustomHtml(s, o);
const S = '.sn-t';
const C = (s: string, o: { maxChars?: number } = {}) => sanitizeScopedCss(s, { scope: S, key: 't', idPrefix: 'cx-', ...o });

const TAGS = new Set(['p', 'div', 'span', 'a', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark', 'blockquote', 'figure', 'figcaption', 'code', 'pre', 'cite', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'iframe']);
const ATTRS = new Set(['class', 'id', 'dir', 'lang', 'title', 'aria-label', 'aria-hidden', 'role', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading', 'colspan', 'rowspan', 'sandbox', 'referrerpolicy', 'allow', 'allowfullscreen']);
/** Parses the output the way a browser would see it: only allow-listed tags, only allow-listed attributes, safe URLs, no stray `<`. */
function audit(out: string): void {
  const re = /<(\/?)([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"<>]*")?)*)>/g;
  let rest = out.replace(re, (_m, _c, name: string, attrs: string) => {
    expect(TAGS.has(name), `tag ${name}`).toBe(true);
    for (const a of attrs.matchAll(/\s([a-z-]+)(?:="([^"]*)")?/g)) {
      expect(ATTRS.has(a[1]!), `attr ${a[1]}`).toBe(true);
      if (a[1] === 'href' || a[1] === 'src') expect(a[2]!, `url ${a[2]}`).toMatch(/^(?:https:\/\/|\/(?!\/)|#|mailto:|tel:)/);
    }
    return '';
  });
  rest = rest.replace(/&(?:amp|lt|gt|quot|#39);/g, '');
  expect(rest, 'stray markup').not.toMatch(/[<>]/);
}

describe('custom html: allow-list', () => {
  it('keeps the wider set and rebuilds attributes', () => {
    expect(H('<div class="a b" id="x" dir="rtl" lang="ar" role="note" aria-label="L" title="T"><h1>H</h1><p>p<br>q</p><hr></div>'))
      .toBe('<div class="a b" id="cx-x" dir="rtl" lang="ar" title="T" aria-label="L" role="note"><h1>H</h1><p>p<br>q</p><hr></div>');
    expect(H('<table><thead><tr><th colspan="2" rowspan=1>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'))
      .toBe('<table><thead><tr><th colspan="2" rowspan="1">a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>');
    expect(H('<figure><img src="https://cdn.x/a.png" alt="A &amp; B" width="100" height=50 onerror=x><figcaption>c</figcaption></figure>'))
      .toBe('<figure><img src="https://cdn.x/a.png" alt="A &amp; B" width="100" height="50" loading="lazy"><figcaption>c</figcaption></figure>');
  });
  it('links get rel, safe hrefs only, target only _blank', () => {
    expect(H('<a href="https://x.com" target="_blank" onclick="y">x</a>')).toBe('<a href="https://x.com" target="_blank" rel="nofollow noopener">x</a>');
    expect(H('<a href="/p" target="_top">x</a>')).toBe('<a href="/p" rel="nofollow noopener">x</a>');
    expect(H('<a href="#top">x</a>')).toBe('<a href="#cx-top" rel="nofollow noopener">x</a>');
    expect(H('<a name="n">x</a>')).toBe('<a rel="nofollow noopener">x</a>');
  });
  it('honours a custom id prefix and never double-prefixes', () => {
    expect(H('<p id="a"></p><a href="#a">x</a>', { idPrefix: 'n7-' })).toBe('<p id="n7-a"></p><a href="#n7-a" rel="nofollow noopener">x</a>');
  });
  it('drops images that are not https or same-origin', () => {
    for (const src of ['http://x.com/a.png', 'data:image/png;base64,AAAA', 'javascript:alert(1)', '//evil.com/a.png', 'ftp://x/a', '', 'blob:x']) {
      expect(H(`<img src="${src}">`)).toBe('');
    }
    expect(H('<img>')).toBe('');
    expect(H('<img src="/media/a.png">')).toBe('<img src="/media/a.png" alt="" loading="lazy">');
  });
  it('drops script, style, form controls, object/embed, svg/math and their contents', () => {
    const out = H('a<script>alert(1)</script>b<style>*{x:y}</style>c<link rel=stylesheet href=//x>d<form action=/x><input name=a><button>go</button><textarea>t</textarea></form>e<object data=x>o</object><embed src=x>f<svg><script>1</script><a href=x>s</a></svg>g<math><mi>x</mi></math>h<template><p>t</p></template>i<noscript><p>n</p></noscript>j<base href=//x><meta http-equiv=refresh content=0>');
    expect(out).toBe('abcdgoefghij');
  });
  it('rewrites ids so they cannot clobber page globals', () => {
    expect(H('<a id="location"></a><p id="__proto__"></p><p id="1bad"></p>')).toBe('<a id="cx-location" rel="nofollow noopener"></a><p></p><p></p>');
  });
});

describe('custom html: iframe', () => {
  it('only YouTube and Vimeo embeds, with fixed sandbox attributes', () => {
    const y = H('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" sandbox="allow-top-navigation" allow="camera" srcdoc="<script>1</script>" onload="x"></iframe>');
    expect(y).toBe('<iframe title="Video" src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>');
    expect(H('<iframe src="https://player.vimeo.com/video/123456789?h=abc"></iframe>')).toContain('src="https://player.vimeo.com/video/123456789?h=abc"');
    expect(H('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=5&amp;rel=0"></iframe>')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ?start=5&amp;rel=0');
  });
  it('rejects every other iframe, and swallows its content', () => {
    for (const src of ['https://evil.com/embed/dQw4w9WgXcQ', 'http://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com.evil.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'data:text/html,<script>1</script>', 'https://player.vimeo.com/video/abc', '//www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ/../../x', '']) {
      expect(H(`a<iframe src="${src}"><p>inner</p></iframe>b`)).toBe('ab');
    }
    expect(H('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">')).toBe(''); // unterminated: the rest of the document is iframe content
    expect(H('<svg><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></svg>x')).toBe('x');
  });
});

describe('custom html: XSS corpus', () => {
  const corpus = [
    '<script>alert(1)</script>', '<SCRIPT SRC=//x></SCRIPT>', '<scr<script>ipt>alert(1)</scr</script>ipt>', '<img src=x onerror=alert(1)>', '<img src="https://x/a.png" onerror="alert(1)">',
    '<svg onload=alert(1)>', '<svg><script>alert(1)</script></svg>', '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>', '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
    '<a href="javascript:alert(1)">x</a>', '<a href="JaVaScRiPt:alert(1)">x</a>', '<a href="java\tscript:alert(1)">x</a>', '<a href="java&#9;script:alert(1)">x</a>', '<a href="java&Tab;script&colon;alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>', '<a href="&#x6A;avascript&#58;alert(1)">x</a>', '<a href=" \n javascript:alert(1)">x</a>', '<a href="\u0001javascript:alert(1)">x</a>', '<a href="vbscript:x">x</a>',
    '<a href="data:text/html,<script>alert(1)</script>">x</a>', '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>', '<img src="data:image/svg+xml,<svg onload=alert(1)>">',
    '<p style="background:url(javascript:alert(1))">x</p>', '<p style="x:expression(alert(1))">x</p>', '<div onmouseover=alert(1)>x</div>', '<div ONCLICK=alert(1)>x</div>', '<div/onclick=alert(1)>x</div>',
    '<body onload=alert(1)>', '<input autofocus onfocus=alert(1)>', '<button formaction=javascript:alert(1)>x</button>', '<form><button formaction="javascript:alert(1)">x</button></form>',
    '<object data="javascript:alert(1)"></object>', '<embed src="javascript:alert(1)">', '<link rel=stylesheet href="javascript:alert(1)">', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<base href="javascript:alert(1)//">', '<iframe srcdoc="<script>alert(1)</script>"></iframe>', '<iframe src="javascript:alert(1)"></iframe>', '<style>@import "javascript:alert(1)";</style>',
    '<style>body{background:url(javascript:alert(1))}</style>', '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>', '<textarea></textarea><img src=x onerror=alert(1)>',
    '<title><img src=x onerror=alert(1)></title>', '<xmp><img src=x onerror=alert(1)></xmp>', '<plaintext><img src=x onerror=alert(1)>', '<template><img src=x onerror=alert(1)></template>',
    '<!--><img src=x onerror=alert(1)>-->', '<!-- --!><img src=x onerror=alert(1)> -->', '<?php echo 1 ?><img src=x onerror=alert(1)>', '<![CDATA[<img src=x onerror=alert(1)>]]>',
    '<a href="https://x" title=\'" onmouseover="alert(1)\'>x</a>', '<a title="x"onmouseover=alert(1)>x</a>', '<a href=https://x/`onmouseover=alert(1)`>x</a>', '<a\nhref="javascript:alert(1)">x</a>',
    '<a href="https://x.com/&quot; onmouseover=&quot;alert(1)">x</a>', '<img src="https://x/a.png&quot; onerror=&quot;alert(1)">', '<p title="&lt;script&gt;alert(1)&lt;/script&gt;">x</p>',
    '<p class="a&quot; onclick=&quot;alert(1)">x</p>', '<p id="a&quot; onclick=&quot;alert(1)">x</p>', '<p dir="rtl&quot; onclick=&quot;alert(1)">x</p>', '<td colspan="1&quot; onclick=&quot;alert(1)">x</td>',
    '&lt;script&gt;alert(1)&lt;/script&gt;', '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;', '<<script>alert(1)//<</script>', '<<img src=x onerror=alert(1)>', '< script>alert(1)</ script>',
    '<img src=x:alert(alt) onerror=eval(src) alt=0>', '<video><source onerror=alert(1)></video>', '<audio src=x onerror=alert(1)>', '<details open ontoggle=alert(1)>', '<marquee onstart=alert(1)>',
    '<select><style><img src=x onerror=alert(1)></style></select>', '<table><style><img src=x onerror=alert(1)></style></table>', '<a href="https://x.com" rel="opener" target="_blank">x</a>',
  ];
  it.each(corpus)('is harmless: %s', (input) => {
    const out = H(input);
    audit(out);
    expect(H(out)).toBe(out); // idempotent
  });
});

describe('custom html: robustness', () => {
  it('survives unbalanced and misnested tags with balanced output', () => {
    const out = H('<div><p>a<span>b</div></span></p><b><i>x</b></i><ul><li>1<li>2</ul></li><a href="/x"><a href="/y">z');
    const stack: string[] = [];
    for (const m of out.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/g)) {
      if (['br', 'hr', 'img'].includes(m[2]!)) continue;
      if (m[1]) expect(stack.pop()).toBe(m[2]); else stack.push(m[2]!);
    }
    expect(stack).toEqual([]);
    expect(H(out)).toBe(out);
  });
  it('caps nesting depth and output length', () => {
    const bomb = '<div>'.repeat(5000) + 'x' + '</div>'.repeat(5000);
    const out = H(bomb);
    expect(out.length).toBeLessThan(2000);
    expect(H(out)).toBe(out);
    const big = '<p>' + 'a'.repeat(5_000_000) + '</p>';
    const t0 = Date.now();
    const o2 = H(big, { maxChars: 1000 });
    expect(o2.length).toBeLessThanOrEqual(1000);
    expect(o2.endsWith('</p>')).toBe(true);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(H('<a href="https://x.com/' + 'a'.repeat(200_000) + '">x</a>', { maxChars: 500 }).length).toBeLessThanOrEqual(500);
    expect(H('<p ' + 'a=1 '.repeat(200_000) + '>x</p>').length).toBeLessThan(100);
  });
  it('is idempotent on random soup', () => {
    const pool = ['<div>', '</div>', '<p>', '</p>', '<a href="https://x.com">', '<a href="#k" id="k">', '</a>', '<img src="https://x/a.png">', '<img src=x>', '<br>', '<hr>', '<li>', '<ul>', '</ul>', '<table>', '<td colspan=2>', '</td>',
      '<h1>', '</h1>', '<h2>', '<script>', '</script>', '<iframe src="https://player.vimeo.com/video/123456">', '</iframe>', '<svg>', '</svg>', '&amp;', '&lt;', '&#60;', '<', '>', 'text ', '"', "'", '<!--', '-->', '<b>', '</b>', '<span class="a b">'];
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let n = 0; n < 400; n++) {
      let s = '';
      for (let k = 0, len = 1 + Math.floor(rnd() * 40); k < len; k++) s += pool[Math.floor(rnd() * pool.length)];
      const out = H(s);
      expect(H(out)).toBe(out);
      audit(out);
    }
  });
  it('handles non-string input', () => {
    for (const v of [null, undefined, 3, {}, []]) expect(H(v as unknown as string)).toBe('');
  });
});

describe('scoped css', () => {
  it('prefixes every selector with the scope', () => {
    expect(C('.a{color:red}')).toEqual(['.sn-t .a{color:red}']);
    expect(C('h2, .b > p , a:hover{margin:0 auto}')).toEqual(['.sn-t h2,.sn-t .b > p,.sn-t a:hover{margin:0 auto}']);
    expect(C('li:nth-child(2n+1)::before{content:"x"}')).toEqual(['.sn-t li:nth-child(2n+1)::before{content:"x"}']);
    expect(C('a[href^="https://x"]:not(.y){color:#fff}')).toEqual(['.sn-t a[href^="https://x"]:not(.y){color:#fff}']);
    expect(C('#hero{color:red}')).toEqual(['.sn-t #cx-hero{color:red}']);
  });
  it('maps html/body/:root to the block itself', () => {
    expect(C(':root{--c:red}')).toEqual(['.sn-t{--c:red}']);
    expect(C('body{color:red}')).toEqual(['.sn-t{color:red}']);
    expect(C('body > p{color:red}')).toEqual(['.sn-t > p{color:red}']);
    expect(C('html .x{color:red}')).toEqual(['.sn-t .x{color:red}']);
    expect(C('.card{color:var(--MyVar)} :root{--MyVar:#111}')).toEqual(['.sn-t .card{color:var(--MyVar)}', '.sn-t{--MyVar:#111}']);
  });
  it('scopes media queries and namespaces keyframes', () => {
    expect(C('@media (max-width: 600px){.a{display:none}}')).toEqual(['@media (max-width: 600px){.sn-t .a{display:none}}']);
    expect(C('@media (min-width:600px) and (prefers-color-scheme:dark){.a{color:#fff}}')).toHaveLength(1);
    expect(C('@media (min-width:600px){@media (hover:hover){.a{color:red}}}')).toHaveLength(1);
    expect(C('@media foo(x){.a{color:red}}')).toEqual([]);
    const k = C('.a{animation:spin 2s infinite}@keyframes spin{from{opacity:0}50.5%{opacity:.5}to{opacity:1}}');
    expect(k).toEqual(['.sn-t .a{animation:t-spin 2s infinite}', '@keyframes t-spin{from{opacity:0}50.5%{opacity:.5}to{opacity:1}}']);
    expect(C('@keyframes x{from{background:url(a.png)}}')).toEqual([]);
  });
  it('drops @import, @font-face, url(), expression, behavior and friends', () => {
    expect(C('@import url(https://evil.com/x.css);.a{color:red}')).toEqual(['.sn-t .a{color:red}']);
    expect(C('@import "x.css";@charset "utf-8";@namespace x url(y);.a{color:red}')).toEqual(['.sn-t .a{color:red}']);
    expect(C('@font-face{font-family:x;src:url(https://evil/x.woff)}.a{font-family:x}')).toEqual(['.sn-t .a{font-family:x}']);
    for (const d of ['background:url(https://x/a.png)', 'background-image:URL( "https://x/a.png" )', 'background:u\\72l(https://x)', 'background:\\75rl(x)', 'width:expression(alert(1))', 'behavior:url(x.htc)', '-moz-binding:url(x)',
      'background:image-set("a.png" 1x)', 'list-style-image:url(x)', 'content:url(x)', 'content:attr(title)', 'mask-image:url(x)', 'mask:url(x)', '-o-link:"javascript:1"', 'filter:progid:DXImageTransform(x)', 'filter:url(#x)',
      'background:javascript:alert(1)', 'cursor:url(x),auto', 'x:y', 'position:fixed', 'position:sticky', 'position:FIXED', 'z-index:9999', 'z-index:-11', 'z-index:1e9', 'src:url(x)', 'behaviour:x', 'font-family:"a\\"b"']) {
      expect(C(`.a{${d}}`), d).toEqual([]);
    }
  });
  it('keeps safe declarations and clamps position and z-index', () => {
    expect(C('.a{position:absolute;z-index:10;top:0;color:red !important;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:linear-gradient(90deg,#fff,rgba(0,0,0,.5));width:calc(100% - 2rem);transform:translate(-50%,0) rotate(3deg)}'))
      .toEqual(['.sn-t .a{position:absolute;z-index:10;top:0;color:red;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:linear-gradient(90deg,#fff,rgba(0,0,0,.5));width:calc(100% - 2rem);transform:translate(-50%,0) rotate(3deg)}']);
    expect(C('.a{z-index:-10;position:relative;content:"•";content:"a b"}')).toEqual(['.sn-t .a{z-index:-10;position:relative;content:"•";content:"a b"}']);
    expect(C('.a{filter:blur(4px) drop-shadow(0 0 2px #000);filter:url(#a)}')).toEqual(['.sn-t .a{filter:blur(4px) drop-shadow(0 0 2px #000)}']);
  });
  it('cannot escape the block through selectors', () => {
    for (const bad of ['}body{background:red}', '.a}body{background:red}.b{x:y', '.a{color:red}}body{background:red}{', '.a,}body{color:red}', 'body *,html{x:y}', '.a{}', '@media screen{}', ':host{color:red}', '::selection,html:has(body){color:red}',
      '.a:has(.b){color:red}', '*|*{color:red}', 'a{color:red}/*', '.a\\{color:red\\}', '.a/**/{color:red}x{', '.a:is(:is(.b)){color:red}', '.a:not(.b,.c){color:red}', '.a:nth-child(foo){color:red}', '.a >{color:red}', '> .a{color:red}', '.a > > .b{color:red}']) {
      const out = C(bad + '{color:blue}');
      for (const r of out) {
        expect(r.startsWith(S) || r.startsWith('@media')).toBe(true);
        expect(r).not.toMatch(/body\{|html\{|\}\s*body|:host|\*\|/);
        expect(r.match(/\{/g)!.length).toBe(r.match(/\}/g)!.length);
      }
    }
    expect(C('.a{color:red}}body{background:red}.b{color:blue}')).toEqual(['.sn-t .a{color:red}', '.sn-t{background:red}', '.sn-t .b{color:blue}']);
    expect(C('.a{color:red;}}body{background:red}')).toEqual(['.sn-t .a{color:red}', '.sn-t{background:red}']);
    expect(C('.a{color:red} body{background:red}')).toEqual(['.sn-t .a{color:red}', '.sn-t{background:red}']);
    expect(C('.a, body{color:red}').join('')).toBe('.sn-t .a,.sn-t{color:red}');
    expect(C('.a{color:red}</style><script>alert(1)</script>')).toEqual(['.sn-t .a{color:red}']);
    expect(C('.a{content:"</style><script>"}')).toEqual([]);
    expect(C('.a{color:red/* }body{background:red} */;background:blue}')).toEqual(['.sn-t .a{color:red;background:blue}']);
    expect(C('.a{color:red;/* unterminated')).toEqual([]);
  });
  it('every output rule is scoped and clean, for a hostile soup', () => {
    const pool = ['.a', ' ', '{', '}', ';', ':', 'color', 'red', 'url(x)', '@media screen', '@import', '"', "'", '\\', '/*', '*/', '>', '+', '~', ',', 'body', ':root', '(', ')', '[', ']', '#id', 'position:fixed', 'z-index:99', 'a:hover', '<', 'expression(1)', '!important'];
    let seed = 11;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let n = 0; n < 1500; n++) {
      let s = '';
      for (let k = 0, len = 1 + Math.floor(rnd() * 30); k < len; k++) s += pool[Math.floor(rnd() * pool.length)];
      for (const r of C(s)) {
        expect(r).not.toMatch(/[<\\]|url\(|@import|expression\(|fixed|sticky/i);
        const sels = r.startsWith('@media') ? [...r.matchAll(/(?:\{|\})([^{}@]+)\{/g)].map((m) => m[1]!) : [r.slice(0, r.indexOf('{'))];
        for (const sel of sels) for (const one of sel.split(',')) expect(one.startsWith(S)).toBe(true);
        expect(r.match(/\{/g)!.length).toBe(r.match(/\}/g)!.length);
      }
    }
  });
  it('caps rule count and length, and does not blow up on huge input', () => {
    const many = Array.from({ length: 1000 }, (_, i) => `.c${i}{color:red}`).join('');
    expect(C(many).length).toBeLessThanOrEqual(150);
    expect(C(many, { maxChars: 300 }).join('').length).toBeLessThan(600);
    const t0 = Date.now();
    C('.a{color:red}'.repeat(500_000));
    C('.a{' + 'x:y;'.repeat(500_000) + '}');
    C('('.repeat(300_000));
    C('{'.repeat(300_000));
    C('@media screen{'.repeat(50_000));
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(C('.a{' + 'color:red;'.repeat(100) + '}')[0]!.split(';').length).toBeLessThanOrEqual(60);
  });
  it('handles non-string input', () => {
    for (const v of [null, undefined, 3, {}]) expect(C(v as unknown as string)).toEqual([]);
  });
});

describe('hk-custom-html tag', () => {
  const r = createDefaultRegistry();
  const render = (props: Record<string, unknown>, id = 'n7') => {
    const css: string[] = [];
    const c: TagRenderContext = { id, css: (x) => css.push(x), controller: () => {}, data: {}, locale: 'ar', dir: 'rtl', t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, 'ar') };
    return { html: r.get('hk-custom-html')!.render(props, c), css };
  };
  it('is registered with bilingual editor label, multi-line props and any parent', () => {
    const t = r.get('hk-custom-html')!;
    expect(t.editor.label).toEqual({ ar: 'كود مخصص', en: 'Custom HTML' });
    expect(t.props.html!.type).toBe('textarea');
    expect(t.props.css!.type).toBe('textarea');
    expect(t.allowedParents).toBe('*');
  });
  it('renders sanitized html in a scoped wrapper and emits scoped css through ctx.css', () => {
    const { html, css } = render({ html: '<h2 id="a">Hi</h2><script>x</script><a href="#a">go</a>', css: '.x{color:red} h2{color:blue;position:fixed}' });
    expect(html).toBe('<div class="sn-n7 sn-custom-html"><h2 id="n7-a">Hi</h2><a href="#n7-a" rel="nofollow noopener">go</a></div>');
    expect(css).toEqual(['.sn-n7 .x{color:red}', '.sn-n7 h2{color:blue}', '.sn-n7{position:relative!important;isolation:isolate!important;contain:layout paint!important}']);
  });
  it('renders nothing for empty or fully-stripped html, and never emits css then', () => {
    for (const html of ['', '  ', '<script>x</script>', null, undefined, 3, {}]) {
      const out = render({ html, css: '.a{color:red}' });
      expect(out.html).toBe('');
      expect(out.css).toEqual([]);
    }
  });
  it('a hostile css prop cannot reach the page', () => {
    const { css } = render({ html: '<p>x</p>', css: '</style><script>alert(1)</script>@import url(//x);.a{background:url(javascript:1)}' });
    expect(css.slice(0, -1).join('')).toBe('');
    expect(css.join('')).not.toMatch(/[<]|url\(|@import|script/i);
  });
});
