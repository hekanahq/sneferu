import { escapeAttr, escapeText, safeUrl } from '@hekana/sneferu-core';

/**
 * Rich text sanitiser: the only way HTML from data reaches a page.
 *
 * Pure TypeScript (no DOM, no dependencies) so it runs the same in Node and the
 * browser. The input is treated as hostile. It is tokenized the way an HTML
 * parser would split it (tags, comments, raw-text elements, text), and the
 * output is REBUILT from those tokens: tag names come from the allow-list
 * below, the only attribute is a safe `href` on `a` (plus a fixed `rel`), and
 * every piece of text and attribute value is decoded once and re-escaped. No
 * substring of the input is ever copied to the output as markup.
 *
 * The output re-parses to itself (idempotent), its tags are balanced, nesting
 * is capped, and its length never exceeds `maxChars` (default 100 000).
 */

const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'span']);
/** Raw-text elements: everything up to the matching end tag is dropped, unparsed. */
const DROP_RAW = new Set(['script', 'style', 'textarea', 'title', 'iframe', 'noscript', 'xmp', 'noembed', 'noframes', 'plaintext']);
/** Containers whose whole content (markup and text) is dropped. */
const DROP_NESTED = new Set(['template', 'svg', 'math', 'object']);
/** Opening one of these closes an open `p` (as the HTML parser does). */
const CLOSES_P = new Set(['p', 'ul', 'ol', 'h2', 'h3', 'h4', 'blockquote', 'li']);
const HEADINGS = new Set(['h2', 'h3', 'h4']);
/** An `li` closes an open `li` unless one of these sits between them. */
const LI_BARRIER = new Set(['ul', 'ol', 'blockquote', 'h2', 'h3', 'h4']);
const MAX_DEPTH = 64;
const DEFAULT_MAX = 100_000;
/** Per-profile tag-nesting rules for the Writer. */
export interface Rules { closesP: ReadonlySet<string>; headings: ReadonlySet<string>; liBarrier: ReadonlySet<string>; voids: ReadonlySet<string> }
const RICH_RULES: Rules = { closesP: CLOSES_P, headings: HEADINGS, liBarrier: LI_BARRIER, voids: new Set(['br']) };

/** An allow-list profile: which tags survive, how they nest, and the attributes rebuilt for each (null drops the element). */
export interface Profile {
  allowed: ReadonlySet<string>;
  rules: Rules;
  attrs(t: Tag): string | null;
  /** When set, a full `<iframe>…</iframe>` string for an accepted embed (null drops it). */
  iframe?(t: Tag): string | null;
}

const REL = ' rel="nofollow noopener ugc"';

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', shy: '\u00AD', copy: '\u00A9', reg: '\u00AE', trade: '\u2122',
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
  laquo: '\u00AB', raquo: '\u00BB', times: '\u00D7', divide: '\u00F7', deg: '\u00B0', middot: '\u00B7', bull: '\u2022',
  euro: '\u20AC', pound: '\u00A3', cent: '\u00A2', yen: '\u00A5', sect: '\u00A7', para: '\u00B6', plusmn: '\u00B1',
  frac12: '\u00BD', frac14: '\u00BC', frac34: '\u00BE', check: '\u2713', larr: '\u2190', rarr: '\u2192', harr: '\u2194',
  zwj: '\u200D', zwnj: '\u200C', lrm: '\u200E', rlm: '\u200F', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009',
  // used to disguise URL schemes (`javascript&colon;`, `&sol;&sol;host`): decoded so safeUrl sees the real URL
  colon: ':', sol: '/', bsol: '\\', Tab: '\t', NewLine: '\n', lpar: '(', rpar: ')', period: '.', num: '#', quest: '?', equals: '=',
};

const ENTITY = /&(?:#[xX]([0-9a-fA-F]+);?|#([0-9]+);?|([a-zA-Z][a-zA-Z0-9]{0,31});)/g;
const fromCode = (cp: number): string =>
  !Number.isFinite(cp) || cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) ? '\uFFFD' : String.fromCodePoint(cp);

/** Decodes character references once; unknown named references stay as written. NUL is removed. */
export function decode(s: string): string {
  const out = s.indexOf('&') === -1 ? s : s.replace(ENTITY, (m, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
    if (hex !== undefined) return fromCode(hex.length > 8 ? Infinity : parseInt(hex, 16));
    if (dec !== undefined) return fromCode(dec.length > 8 ? Infinity : parseInt(dec, 10));
    return Object.hasOwn(NAMED, name!) ? NAMED[name!]! : m;
  });
  return out.replace(/\u0000/g, '');
}

const isWs = (c: string | undefined) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const isAlpha = (c: string | undefined) => c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));

export interface Tag { name: string; attrs: [string, string][]; selfClosing: boolean; end: number }

/** Reads a tag from `start` (just after `<` or `</`) to its `>`. null when the input ends inside it (the tag is dropped). */
function readTag(s: string, start: number): Tag | null {
  const n = s.length;
  let j = start;
  while (j < n && !isWs(s[j]) && s[j] !== '/' && s[j] !== '>') j++;
  const name = s.slice(start, j).toLowerCase();
  const attrs: [string, string][] = [];
  let selfClosing = false;
  for (;;) {
    while (j < n && (isWs(s[j]) || s[j] === '/')) { if (s[j] === '/' && s[j + 1] === '>') selfClosing = true; j++; }
    if (j >= n) return null;
    if (s[j] === '>') return { name, attrs, selfClosing, end: j + 1 };
    selfClosing = false;
    let k = j + 1;
    while (k < n && !isWs(s[k]) && s[k] !== '/' && s[k] !== '>' && s[k] !== '=') k++;
    const an = s.slice(j, k).toLowerCase();
    j = k;
    while (j < n && isWs(s[j])) j++;
    let value = '';
    if (s[j] === '=') {
      j++;
      while (j < n && isWs(s[j])) j++;
      const q = s[j];
      if (q === '"' || q === "'") {
        const e = s.indexOf(q, j + 1);
        if (e === -1) return null;
        value = s.slice(j + 1, e);
        j = e + 1;
      } else {
        const v0 = j;
        while (j < n && !isWs(s[j]) && s[j] !== '>') j++;
        value = s.slice(v0, j);
      }
    }
    attrs.push([an, value]);
  }
}

const RAW_END = new Map([...DROP_RAW].map((t) => [t, new RegExp(`</${t}[\\t\\n\\f\\r />]`, 'gi')]));

/** Builds the output: balanced tags, an output budget that always leaves room for the closing tags. */
class Writer {
  out = '';
  stack: string[] = [];
  closeLen = 0;
  done = false;
  constructor(private readonly max: number, private readonly r: Rules = RICH_RULES) {}

  private fits(k: number) { return this.out.length + k + this.closeLen <= this.max; }

  text(raw: string) {
    if (this.done) return;
    // never decode more than can fit: an entity expands to at most ~12 characters when escaped
    const budget = Math.max(0, this.max - this.out.length - this.closeLen);
    const t = decode(raw.length > budget * 12 ? raw.slice(0, budget * 12) : raw);
    if (t === '') return;
    const esc = escapeText(t);
    if (this.fits(esc.length)) { this.out += esc; return; }
    for (const ch of t) { // by code point: never splits a surrogate pair
      const e = escapeText(ch);
      if (!this.fits(e.length)) break;
      this.out += e;
    }
    this.done = true;
  }

  closeTo(idx: number) {
    while (this.stack.length > idx) {
      const t = this.stack.pop()!;
      this.out += `</${t}>`;
      this.closeLen -= t.length + 3;
    }
  }

  open(tag: string, attrs: string) {
    if (this.done) return;
    if (this.r.voids.has(tag)) { const v = `<${tag}${attrs}>`; if (this.fits(v.length)) this.out += v; else this.done = true; return; }
    const st = this.stack;
    if (this.r.closesP.has(tag)) { const p = st.lastIndexOf('p'); if (p !== -1) this.closeTo(p); }
    if (this.r.headings.has(tag) && this.r.headings.has(st[st.length - 1] ?? '')) this.closeTo(st.length - 1);
    if (tag === 'li') {
      for (let k = st.length - 1; k >= 0; k--) {
        if (st[k] === 'li') { this.closeTo(k); break; }
        if (this.r.liBarrier.has(st[k]!)) break;
      }
    }
    if (tag === 'a') { const a = st.lastIndexOf('a'); if (a !== -1) this.closeTo(a); }
    if (st.length >= MAX_DEPTH) return; // too deep: the tag is dropped, its text kept
    const start = `<${tag}${attrs}>`;
    if (!this.fits(start.length + tag.length + 3)) { this.done = true; return; }
    this.out += start;
    st.push(tag);
    this.closeLen += tag.length + 3;
  }

  close(tag: string) {
    if (this.done || this.r.voids.has(tag)) return;
    const i = this.stack.lastIndexOf(tag);
    if (i !== -1) this.closeTo(i);
  }

  /** A complete, self-contained element (already escaped, already closed). */
  atomic(html: string) {
    if (this.done || this.stack.length >= MAX_DEPTH) return;
    if (!this.fits(html.length)) { this.done = true; return; }
    this.out += html;
  }

  finish(): string { this.closeTo(0); return this.out; }
}

const hrefAttr = (attrs: [string, string][]): string => {
  const raw = attrs.find(([k]) => k === 'href');
  if (!raw) return REL;
  const url = safeUrl(decode(raw[1]));
  return url === '#' ? REL : ` href="${escapeAttr(url)}"${REL}`;
};

/**
 * Sanitizes merchant or theme rich text for output into a page. See the module
 * comment for the guarantees. Anything that is not a string yields ''.
 */
export function sanitizeWith(html: string, opts: { maxChars?: number } | undefined, P: Profile): string {
  if (typeof html !== 'string' || html === '') return '';
  const m = opts?.maxChars;
  const cap = typeof m === 'number' && Number.isFinite(m) && m >= 0 ? Math.floor(m) : DEFAULT_MAX;
  const w = new Writer(cap, P.rules);
  const s = html.length > cap * 16 ? html.slice(0, cap * 16) : html;
  const n = s.length;
  let drop: { tag: string; depth: number } | null = null;
  let i = 0;
  let text = '';
  const flush = () => { if (text !== '') { if (!drop) w.text(text); text = ''; } };

  while (i < n && !w.done) {
    const lt = s.indexOf('<', i);
    if (lt === -1) { text += s.slice(i); i = n; break; }
    if (lt > i) text += s.slice(i, lt);
    i = lt;
    const c = s[i + 1];
    if (c === '!' || c === '?') { // comment, doctype, CDATA, processing instruction: dropped
      flush();
      if (s.startsWith('<!--', i)) { const e = s.indexOf('-->', i + 4); i = e === -1 ? n : e + 3; }
      else { const e = s.indexOf('>', i + 2); i = e === -1 ? n : e + 1; }
      continue;
    }
    if (c === '/' && s[i + 2] === '>') { i += 3; continue; } // `</>` is nothing
    if (c === '/' && !isAlpha(s[i + 2])) { flush(); const e = s.indexOf('>', i + 2); i = e === -1 ? n : e + 1; continue; }
    if (c === '/') { // end tag
      flush();
      const t = readTag(s, i + 2);
      if (!t) { i = n; break; }
      i = t.end;
      if (drop) { if (t.name === drop.tag && --drop.depth === 0) drop = null; continue; }
      if (P.allowed.has(t.name)) w.close(t.name);
      continue;
    }
    if (!isAlpha(c)) { text += '<'; i++; continue; } // a lone `<` is text
    flush();
    const t = readTag(s, i + 1);
    if (!t) { i = n; break; }
    i = t.end;
    if (DROP_RAW.has(t.name)) { const embed = P.iframe && t.name === 'iframe' && !drop ? P.iframe(t) : null; // skip to the matching end tag without parsing what is inside
      const re = RAW_END.get(t.name)!;
      re.lastIndex = i;
      const found = t.name === 'plaintext' ? null : re.exec(s);
      if (!found) { i = n; break; }
      const endTag = readTag(s, found.index + 2);
      i = endTag ? endTag.end : n; if (embed) w.atomic(embed);
      continue;
    }
    const foreignSelfClosed = t.selfClosing && (t.name === 'svg' || t.name === 'math');
    if (drop) { if (t.name === drop.tag && !foreignSelfClosed) drop.depth++; continue; }
    if (DROP_NESTED.has(t.name)) { if (!foreignSelfClosed) drop = { tag: t.name, depth: 1 }; continue; }
    if (P.allowed.has(t.name)) { const a = P.attrs(t); if (a !== null) w.open(t.name, a); }
  }
  flush();
  return w.finish();
}

const RICH: Profile = { allowed: ALLOWED, rules: RICH_RULES, attrs: (t) => (t.name === 'a' ? hrefAttr(t.attrs) : '') };

export function sanitizeRichText(html: string, opts: { maxChars?: number } = {}): string {
  return sanitizeWith(html, opts, RICH);
}
