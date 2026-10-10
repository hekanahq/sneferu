import { ALLOWED_ELEMENTS, FORBIDDEN_ATTRIBUTES, FORBIDDEN_ELEMENTS, URL_ATTRIBUTES } from './version';
import { safeUrl } from './escape';

const ALLOWED_EL = new Set<string>(ALLOWED_ELEMENTS);
const FORBIDDEN_EL = new Set<string>(FORBIDDEN_ELEMENTS);
const FORBIDDEN_ATTR = new Set<string>(FORBIDDEN_ATTRIBUTES);
const URL_ATTR = new Set<string>(URL_ATTRIBUTES);

/** True when a theme may emit this (lower-case) element name. */
export const isAllowedElement = (tag: string): boolean => ALLOWED_EL.has(tag);
/** True for elements on the explicit danger list (used for clearer messages). */
export const isForbiddenElement = (tag: string): boolean => FORBIDDEN_EL.has(tag);
/** Any `href`, any `*:href` (xlink:href, …) and the listed URL attributes go through the URL sink. */
export const isUrlAttribute = (name: string): boolean => name === 'href' || name.endsWith(':href') || URL_ATTR.has(name);
/** Event handlers and the listed attributes are never allowed. */
export const isForbiddenAttribute = (name: string): boolean => name.startsWith('on') || FORBIDDEN_ATTR.has(name);

const NAMED: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
/** One decoding pass, as a browser does for an attribute value; undefined when an unknown named reference appears. */
function decodeAttr(v: string): string | undefined {
  let unknown = false;
  const out = v.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (m, ref: string) => {
    if (ref[0] === '#') {
      const n = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '�';
    }
    const k = ref.toLowerCase();
    if (Object.hasOwn(NAMED, k)) return NAMED[k]!;
    unknown = true;
    return m;
  });
  return unknown ? undefined : out;
}

const SCHEMES = ['javascript:', 'vbscript:', 'data:text/html'];
/** C0/C1 controls (browsers strip or remap some of them inside URLs). */
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/;

function checkAttr(name: string, value: string | null): string | undefined {
  if (isForbiddenAttribute(name)) return `attribute ${name} is not allowed`;
  if (value === null) return undefined;
  const decoded = decodeAttr(value);
  if (decoded !== undefined && SCHEMES.some((x) => decoded.replace(/\s+/g, '').toLowerCase().includes(x))) return `unsafe value in ${name}`;
  if (!isUrlAttribute(name)) return undefined;
  if (decoded === undefined || CONTROL.test(decoded)) return `unsafe URL in ${name}`;
  const urls = name === 'srcset' ? decoded.split(',').map((c) => c.trim().split(/\s+/)[0] ?? '').filter(Boolean) : [decoded];
  for (const u of urls) if (u.trim() !== '#' && safeUrl(u) === '#') return `unsafe URL in ${name}`;
  return undefined;
}

const TAG_OPEN = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/y;
const WS = /\s+/y;
const ATTR = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:="([^"<>']*)")?/y;
const RCDATA = new Set(['title', 'textarea']);

/**
 * Checks that a raw `html` IR string conforms to what the compiler itself
 * emits: escaped text (no raw `<` or `>`), and complete tags of the form
 * `<name attr="value" bare>` / `</name>` with allow-listed names, double-quoted
 * values free of `<`, `>` and `'`, and no comments, `<!…>`, `<?…>`,
 * CDATA or unquoted values. Attributes are then checked by name (on*, forbidden)
 * and value (script schemes, unsafe URLs). Text is never pattern-matched.
 * Returns a reason, or undefined when the string is acceptable.
 */
export function checkRawHtml(s: string): string | undefined {
  let i = 0;
  let rcdata: string | undefined;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const gt = s.indexOf('>', i);
    if (gt !== -1 && (lt === -1 || gt < lt)) return 'raw ">" in text';
    if (lt === -1) break;
    TAG_OPEN.lastIndex = lt;
    const head = TAG_OPEN.exec(s);
    if (!head) return 'raw "<" that does not start a tag';
    const closing = head[1] === '/';
    const name = head[2]!.toLowerCase();
    if (rcdata && !(closing && name === rcdata)) return `markup inside <${rcdata}>`;
    if (!ALLOWED_EL.has(name)) return `element <${name}> is not allowed`;
    let j = TAG_OPEN.lastIndex;
    if (closing) {
      if (s[j] !== '>') return `malformed closing tag </${name}>`;
      rcdata = undefined;
      i = j + 1;
      continue;
    }
    for (;;) {
      if (s[j] === '>') { j++; break; }
      WS.lastIndex = j;
      if (!WS.exec(s)) return j >= s.length ? 'html ends inside a tag' : `malformed tag <${name}>`;
      j = WS.lastIndex;
      if (s[j] === '>') { j++; break; }
      ATTR.lastIndex = j;
      const a = ATTR.exec(s);
      if (!a) return j >= s.length ? 'html ends inside a tag' : `malformed attribute in <${name}>`;
      j = ATTR.lastIndex;
      const why = checkAttr(a[1]!.toLowerCase(), a[2] ?? null);
      if (why) return why;
    }
    if (RCDATA.has(name)) rcdata = name;
    i = j;
  }
  return undefined;
}
