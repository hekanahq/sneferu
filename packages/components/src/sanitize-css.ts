/**
 * CSS sanitiser + scoper for the custom HTML block.
 *
 * Like the HTML sanitiser it REBUILDS: selectors and declarations are parsed, each piece is validated against
 * an allow-list, and only re-serialised text is emitted. Nothing from the input is copied through unchecked,
 * so a disagreement between this parser and a browser's can only cause a rule to be dropped, never smuggled.
 */

export interface ScopedCssOptions {
  /** Selector every rule is rooted at, e.g. `.sn-n12`. */
  scope: string;
  /** Used to namespace @keyframes names. */
  key: string;
  /** Must match the prefix `sanitizeCustomHtml` puts on ids (`#x` in a selector becomes `#<idPrefix>x`). */
  idPrefix?: string;
  maxChars?: number;
}

export const CSS_Z_MAX = 10;
const DEFAULT_MAX = 20_000;
const MAX_RULES = 150;
const MAX_DECLS = 60;
const MAX_SELECTORS = 12;
const MAX_SELECTOR_LEN = 240;
const MAX_VALUE_LEN = 300;
const MAX_MEDIA_DEPTH = 2;

const PROP_EXACT = new Set([
  'display', 'visibility', 'opacity', 'overflow', 'overflow-x', 'overflow-y', 'overflow-wrap', 'word-wrap', 'word-break', 'white-space',
  'color', 'background', 'background-color', 'background-image', 'background-position', 'background-position-x', 'background-position-y',
  'background-repeat', 'background-size', 'background-clip', 'background-origin', 'background-blend-mode',
  'box-shadow', 'text-shadow', 'outline', 'outline-color', 'outline-style', 'outline-width', 'outline-offset',
  'border', 'border-radius', 'border-collapse', 'border-spacing', 'box-sizing', 'aspect-ratio', 'object-fit', 'object-position',
  'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'order', 'gap', 'row-gap', 'column-gap',
  'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-start', 'grid-column-end',
  'grid-row', 'grid-row-start', 'grid-row-end', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows',
  'align-content', 'align-items', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'place-content', 'place-items', 'place-self',
  'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant', 'font-stretch', 'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-align-last', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style',
  'text-decoration-thickness', 'text-underline-offset', 'text-indent', 'text-overflow', 'text-transform', 'text-wrap',
  'direction', 'unicode-bidi', 'writing-mode', 'hyphens', 'tab-size', 'quotes', 'vertical-align',
  'list-style', 'list-style-type', 'list-style-position', 'table-layout', 'caption-side', 'empty-cells',
  'float', 'clear', 'cursor', 'pointer-events', 'user-select', 'accent-color', 'caret-color', 'content', 'isolation',
  'position', 'z-index', 'top', 'right', 'bottom', 'left', 'inset',
  'transform', 'transform-origin', 'transform-style', 'perspective', 'perspective-origin', 'backface-visibility', 'translate', 'rotate', 'scale',
  'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function',
  'animation', 'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function', 'animation-iteration-count',
  'animation-direction', 'animation-fill-mode', 'animation-play-state',
  'filter', 'backdrop-filter', 'clip-path', 'columns', 'column-count', 'column-width', 'column-rule',
  'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align',
  '-webkit-line-clamp', '-webkit-box-orient', '-webkit-text-stroke', '-webkit-text-stroke-width', '-webkit-text-stroke-color',
  '-webkit-text-fill-color', '-webkit-background-clip', '-webkit-backdrop-filter', '-webkit-font-smoothing',
]);
const SIDES = '(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?';
const PROP_PATTERNS = [
  new RegExp(`^(?:margin|padding)${SIDES}$`),
  new RegExp(`^border${SIDES}(?:-(?:width|style|color))?$`),
  /^border-(?:top|bottom|start|end)-(?:left|right|start|end)-radius$/,
  /^(?:min-|max-)?(?:width|height|inline-size|block-size)$/,
  /^inset-(?:inline|block)(?:-(?:start|end))?$/,
  /^--[A-Za-z0-9_-]{1,40}$/,
];
const FUNCS = new Set([
  'calc', 'min', 'max', 'clamp', 'var', 'env', 'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix',
  'linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient',
  'translate', 'translatex', 'translatey', 'translatez', 'translate3d', 'scale', 'scalex', 'scaley', 'scale3d', 'rotate', 'rotatex', 'rotatey',
  'rotatez', 'rotate3d', 'skew', 'skewx', 'skewy', 'matrix', 'matrix3d', 'perspective', 'cubic-bezier', 'steps', 'minmax', 'repeat', 'fit-content',
  'blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia',
  'polygon', 'circle', 'ellipse', 'inset',
]);
const BAD_WORDS = /javascript|vbscript|expression|behavior|binding|-o-link|eval\s*\(|url\s*\(|image-set|@/i;
const PSEUDO_CLASSES = new Set([
  'root', 'scope', 'hover', 'focus', 'focus-visible', 'focus-within', 'active', 'link', 'visited', 'target', 'empty',
  'first-child', 'last-child', 'only-child', 'first-of-type', 'last-of-type', 'only-of-type',
]);
const PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter', 'marker', 'placeholder', 'selection']);
const MEDIA_IDENTS = new Set([
  'screen', 'all', 'print', 'and', 'not', 'only', 'min-width', 'max-width', 'min-height', 'max-height', 'width', 'height',
  'prefers-color-scheme', 'prefers-reduced-motion', 'hover', 'any-hover', 'pointer', 'orientation',
  'light', 'dark', 'reduce', 'no-preference', 'none', 'portrait', 'landscape', 'coarse', 'fine',
]);
const ROOT_ALIASES = new Set(['html', 'body', ':root', ':scope']);

const ID = '[A-Za-z_][A-Za-z0-9_-]*';

/** Strips comments and NULs; an unterminated comment drops the rest. Escapes are kept paired so scanners agree. */
function clean(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    if (c === '\0') { i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      if (e === -1) break;
      out += ' ';
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n' && src[j] !== '\r' && src[j] !== '\f') j += src[j] === '\\' ? 2 : 1;
      if (j < n && src[j] === c) j++;
      out += src.slice(i, Math.min(j, n)).replace(/\0/g, '');
      i = j;
      continue;
    }
    if (c === '\\') { out += src.slice(i, i + 2).replace(/\0/g, ''); i += 2; continue; }
    out += c;
    i++;
  }
  return out;
}

/** Index of the first top-level `stop` char at or after `from` (outside strings, parens, brackets); -1 if none. */
function findTop(s: string, from: number, stops: string): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i]!;
    if (c === '\\') { i++; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < s.length && s[i] !== c && s[i] !== '\n') i += s[i] === '\\' ? 2 : 1;
      continue;
    }
    if (c === '(' || c === '[') depth++;
    else if ((c === ')' || c === ']') && depth > 0) depth--;
    else if (depth === 0 && stops.includes(c)) return i;
  }
  return -1;
}

/** Given the index just after a `{`, returns the matching `}` index (braces nest; strings and escapes skipped) or -1. */
function matchBrace(s: string, from: number): number {
  let depth = 1;
  for (let i = from; i < s.length; i++) {
    const c = s[i]!;
    if (c === '\\') { i++; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < s.length && s[i] !== c && s[i] !== '\n') i += s[i] === '\\' ? 2 : 1;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const i = findTop(s, from, sep);
    if (i === -1) { out.push(s.slice(from)); return out; }
    out.push(s.slice(from, i));
    from = i + 1;
  }
}

// ── values ──────────────────────────────────────────────────────────────────────────────────────

function cleanValue(raw: string): string | null {
  const v = raw.replace(/\s+/g, ' ').trim();
  if (v === '' || v.length > MAX_VALUE_LEN) return null;
  if (BAD_WORDS.test(v)) return null;
  let out = '';
  let depth = 0;
  let i = 0;
  while (i < v.length) {
    const c = v[i]!;
    if (c === '"' || c === "'") {
      const e = v.indexOf(c, i + 1);
      if (e === -1) return null;
      const body = v.slice(i + 1, e);
      if (/[\\<>{}\u0000-\u001F]/.test(body) || body.length > 100) return null;
      out += c + body + c;
      i = e + 1;
      continue;
    }
    const word = /^-?-?[A-Za-z_][A-Za-z0-9_-]*/.exec(v.slice(i));
    if (word) {
      const w = word[0];
      i += w.length;
      if (v[i] === '(') {
        if (!FUNCS.has(w.toLowerCase())) return null;
        depth++;
        out += w + '(';
        i++;
        continue;
      }
      out += w;
      continue;
    }
    if (c === '(') { depth++; out += c; i++; continue; } // grouping inside calc()
    if (c === ')') { if (--depth < 0) return null; out += c; i++; continue; }
    if (/[0-9.%#,/+*\- ]/.test(c)) { out += c; i++; continue; }
    return null; // backslash, <, >, {, }, ;, :, !, =, @, anything else
  }
  return depth === 0 ? out : null;
}

function cleanDecl(prop: string, raw: string, keyframes: ReadonlyMap<string, string>): string | null {
  const name = prop.trim();
  const p = name.startsWith('--') ? name : name.toLowerCase(); // custom property names are case-sensitive
  if (!PROP_EXACT.has(p) && !PROP_PATTERNS.some((re) => re.test(p))) return null;
  const v = cleanValue(raw.replace(/\s*!\s*important\s*$/i, ''));
  if (v === null) return null;
  const lv = v.toLowerCase();
  if (p === 'position' && !/^(?:static|relative|absolute)$/.test(lv)) return null; // fixed and sticky escape the block
  if (p === 'z-index') {
    if (lv !== 'auto') {
      if (!/^-?[0-9]{1,3}$/.test(lv) || Math.abs(Number(lv)) > CSS_Z_MAX) return null;
    }
  } else if (p === 'content') {
    if (v.includes('(')) return null; // strings and keywords only: no attr(), counter(), url()
  } else if ((p === 'animation' || p === 'animation-name') && keyframes.size > 0) {
    return `${p}:${v.replace(/-?[A-Za-z_][A-Za-z0-9_-]*/g, (w) => keyframes.get(w) ?? w)}`;
  }
  return `${p}:${v}`;
}

function parseDecls(body: string, keyframes: ReadonlyMap<string, string>): string {
  if (body.includes('{') || body.includes('}')) return ''; // nesting is not supported
  const out: string[] = [];
  for (const part of splitTop(body, ';')) {
    if (out.length >= MAX_DECLS) break;
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const d = cleanDecl(part.slice(0, colon), part.slice(colon + 1), keyframes);
    if (d !== null) out.push(d);
  }
  return out.join(';');
}

// ── selectors ───────────────────────────────────────────────────────────────────────────────────

const RE_TYPE = new RegExp(`^(?:\\*|[A-Za-z][A-Za-z0-9-]*)`);
const RE_CLASS = new RegExp(`^\\.${ID}`);
const RE_ID = new RegExp(`^#(${ID})`);
const RE_ATTR = new RegExp(`^\\[\\s*${ID}\\s*(?:[~|^$*]?=\\s*(?:"[^"\\\\<>{}]*"|'[^'\\\\<>{}]*'|[A-Za-z0-9_-]+)(?:\\s+[iIsS])?)?\\s*\\]`);
const RE_NTH = /^:(nth-child|nth-last-child|nth-of-type|nth-last-of-type)\(\s*(odd|even|[+-]?[0-9]+|[+-]?[0-9]*n(?:\s*[+-]\s*[0-9]+)?)\s*\)/i;
const RE_PSEUDO = /^(::?)([A-Za-z-]+)/;
const RE_FUNC = /^:(not|is|where)\(([^()]*)\)/i;

/** One compound selector (no combinators). `nested` forbids :not/:is/:where inside :not/:is/:where. */
function compound(s: string, idPrefix: string, nested: boolean): string | null {
  let i = 0;
  let out = '';
  let first = true;
  while (i < s.length) {
    const rest = s.slice(i);
    let m: RegExpExecArray | null;
    if (first && (m = RE_TYPE.exec(rest))) { out += m[0]; i += m[0].length; first = false; continue; }
    first = false;
    if ((m = RE_CLASS.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    if ((m = RE_ID.exec(rest))) {
      const name = m[1]!;
      out += `#${name.startsWith(idPrefix) ? name : idPrefix + name}`;
      i += m[0].length;
      continue;
    }
    if ((m = RE_ATTR.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    if ((m = RE_NTH.exec(rest))) { out += `:${m[1]!.toLowerCase()}(${m[2]!.replace(/\s+/g, '').toLowerCase()})`; i += m[0].length; continue; }
    if (!nested && (m = RE_FUNC.exec(rest))) {
      const parts = m[2]!.split(',').map((x) => compound(x.trim(), idPrefix, true));
      if (parts.length === 0 || parts.length > 6 || parts.some((x) => x === null || x === '')) return null;
      out += `:${m[1]!.toLowerCase()}(${parts.join(',')})`;
      i += m[0].length;
      continue;
    }
    if ((m = RE_PSEUDO.exec(rest))) {
      const name = m[2]!.toLowerCase();
      const ok = m[1] === ':' ? PSEUDO_CLASSES.has(name) || PSEUDO_ELEMENTS.has(name) : PSEUDO_ELEMENTS.has(name);
      if (!ok) return null;
      out += m[1] + name;
      i += m[0].length;
      continue;
    }
    return null;
  }
  return out === '' ? null : out;
}

function selector(raw: string, o: Required<Pick<ScopedCssOptions, 'scope' | 'idPrefix'>>): string | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (s === '' || s.length > MAX_SELECTOR_LEN) return null;
  const parts: string[] = []; // compounds and combinators, alternating
  let i = 0;
  let expectCompound = true;
  while (i < s.length) {
    if (expectCompound) {
      let j = i;
      // a compound runs to the next top-level combinator; brackets and parens may contain spaces
      let depth = 0;
      for (; j < s.length; j++) {
        const c = s[j]!;
        if (c === '"' || c === "'") { const e = s.indexOf(c, j + 1); if (e === -1) return null; j = e; continue; }
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && (c === ' ' || c === '>' || c === '+' || c === '~')) break;
        if (depth < 0) return null;
      }
      if (depth !== 0) return null;
      const c = compound(s.slice(i, j), o.idPrefix, false);
      if (c === null) return null;
      parts.push(c);
      i = j;
      expectCompound = false;
    } else {
      const m = /^ *([>+~])? */.exec(s.slice(i))!;
      if (m[0] === '') return null;
      parts.push(m[1] ? ` ${m[1]} ` : ' ');
      i += m[0].length;
      expectCompound = true;
      if (i >= s.length) return null; // trailing combinator
    }
  }
  // `body .x` -> `.scope .x`; `body > .x` -> `.scope > .x`; bare `body` / `:root` -> `.scope`
  if (ROOT_ALIASES.has(parts[0]!.toLowerCase())) return o.scope + parts.slice(1).join('');
  return `${o.scope} ${parts.join('')}`;
}

function selectorList(prelude: string, o: Required<Pick<ScopedCssOptions, 'scope' | 'idPrefix'>>): string | null {
  if (prelude.length > MAX_SELECTORS * MAX_SELECTOR_LEN) return null;
  const list = splitTop(prelude, ',');
  if (list.length > MAX_SELECTORS) return null;
  const out: string[] = [];
  for (const raw of list) {
    const sel = selector(raw, o);
    if (sel === null) return null; // one bad selector invalidates the rule, as in a browser
    out.push(sel);
  }
  return out.join(',');
}

// ── at-rules and the main walk ──────────────────────────────────────────────────────────────────

function mediaCondition(raw: string): string | null {
  const c = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  if (c === '' || c.length > 150) return null;
  let i = 0;
  let depth = 0;
  while (i < c.length) {
    const m = /^(?:[a-z][a-z-]*|[0-9]*\.?[0-9]+(?:px|em|rem|dppx|%)?|[():,/ ])/.exec(c.slice(i));
    if (!m) return null;
    const t = m[0];
    if (/^[a-z]/.test(t) && !MEDIA_IDENTS.has(t)) return null;
    if (t === '(') depth++;
    if (t === ')' && --depth < 0) return null;
    i += t.length;
  }
  return depth === 0 ? c : null;
}

interface Walk { o: Required<Pick<ScopedCssOptions, 'scope' | 'idPrefix'>> & { key: string }; keyframes: Map<string, string>; rules: number; chars: number; cap: number }

function walk(s: string, w: Walk, mediaDepth: number): string[] {
  const out: string[] = [];
  let i = 0;
  const room = () => w.rules < MAX_RULES && w.chars < w.cap;
  while (i < s.length && room()) {
    while (i < s.length && /[\s]/.test(s[i]!)) i++;
    if (i >= s.length) break;
    if (s[i] === '}' || s[i] === ';') { i++; continue; }
    const brace = findTop(s, i, '{;}');
    if (brace === -1 || s[brace] !== '{') { i = brace === -1 ? s.length : brace + 1; continue; } // statement at-rule or junk
    const prelude = s.slice(i, brace);
    const end = matchBrace(s, brace + 1);
    if (end === -1) break; // unterminated block: drop it and everything after
    const body = s.slice(brace + 1, end);
    i = end + 1;
    let emitted: string | null = null;
    if (prelude.trimStart().startsWith('@')) {
      const m = /^\s*@(-webkit-)?([A-Za-z-]+)\s*([\s\S]*)$/.exec(prelude)!;
      const name = m[2]!.toLowerCase();
      if (name === 'media' && !m[1] && mediaDepth < MAX_MEDIA_DEPTH) {
        const cond = mediaCondition(m[3]!);
        const inner = cond === null ? [] : walk(body, w, mediaDepth + 1);
        if (inner.length) emitted = `@media ${cond}{${inner.join('')}}`;
        else continue;
      } else if (name === 'keyframes') {
        const kn = m[3]!.trim();
        const mapped = new RegExp(`^${ID}$`).test(kn) ? w.keyframes.get(kn) : undefined;
        if (mapped === undefined) continue;
        const frames: string[] = [];
        let j = 0;
        while (j < body.length && frames.length < 20) {
          const b = findTop(body, j, '{');
          if (b === -1) break;
          const e = matchBrace(body, b + 1);
          if (e === -1) break;
          const sels = splitTop(body.slice(j, b), ',').map((x) => x.trim().toLowerCase());
          const decls = parseDecls(body.slice(b + 1, e), new Map());
          if (decls && sels.every((x) => x === 'from' || x === 'to' || /^(?:100|[0-9]{1,2})(?:\.[0-9]{1,3})?%$/.test(x))) frames.push(`${sels.join(',')}{${decls}}`);
          j = e + 1;
        }
        if (!frames.length) continue;
        emitted = `@keyframes ${mapped}{${frames.join('')}}`;
      } else continue; // @import @font-face @charset @namespace @page @property @layer @supports @container ... are dropped
    } else {
      const sels = selectorList(prelude, w.o);
      const decls = sels === null ? '' : parseDecls(body, w.keyframes);
      if (sels === null || decls === '') continue;
      emitted = `${sels}{${decls}}`;
    }
    out.push(emitted);
    w.rules++;
    w.chars += emitted.length;
  }
  return out;
}

/**
 * Returns the sanitised, scoped rules (each a complete rule string), ready for `ctx.css()`.
 * Every selector starts with `opts.scope`; an empty array means nothing survived.
 */
export function sanitizeScopedCss(css: string, opts: ScopedCssOptions): string[] {
  if (typeof css !== 'string' || css === '') return [];
  const cap = Number.isFinite(opts.maxChars) && opts.maxChars! >= 0 ? Math.floor(opts.maxChars!) : DEFAULT_MAX;
  const src = clean(css.length > cap * 2 ? css.slice(0, cap * 2) : css);
  const key = opts.key.replace(/[^A-Za-z0-9_-]/g, '');
  const keyframes = new Map<string, string>();
  for (const m of src.matchAll(new RegExp(`@(?:-webkit-)?keyframes\\s+(${ID})`, 'gi'))) {
    if (keyframes.size < 10) keyframes.set(m[1]!, `${key}-${m[1]!}`);
  }
  const w: Walk = { o: { scope: opts.scope, idPrefix: opts.idPrefix ?? 'cx-', key }, keyframes, rules: 0, chars: 0, cap };
  const rules = walk(src, w, 0);
  // belt and braces: if anything dangerous survived the structured pass, emit nothing at all
  return /[<\\]|url\(|@import|@font-face|expression\(|javascript:|behavior\s*:|-moz-binding|\beval\(/i.test(rules.join('')) ? [] : rules;
}
