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

const ATTR_NAME = /[^\s/>=]+/y;
const UNQUOTED = /[^\s>]*/y;
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

/**
 * Conservative check of a raw `html` IR string. Compiler output (escaped text,
 * complete static tags with escaped attribute values) always passes; anything
 * that could open a disallowed element, add a handler or a script URL fails.
 * Returns a reason, or undefined when the string is acceptable.
 */
export function checkRawHtml(s: string): string | undefined {
  for (const m of s.matchAll(/<[\s/]*([a-zA-Z][^\s/>]*)/g)) {
    const name = m[1]!.toLowerCase();
    if (!ALLOWED_EL.has(name)) return `element <${name}> is not allowed`;
  }
  if (/<[\s/]*$/.test(s)) return 'html ends with an open "<"';
  if (/(^|[\s/"'])on[a-z]+\s*=/i.test(s)) return 'event handler attribute';
  const squashed = s.replace(/\s+/g, '').toLowerCase();
  for (const bad of ['javascript:', 'vbscript:', 'data:text/html']) if (squashed.includes(bad)) return `contains ${bad}`;
  if (/attributename/i.test(s)) return 'attributename is not allowed';
  // walk the tags: every tag must be closed inside this string and its attributes must pass
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt === -1) break;
    const head = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(s.slice(lt, lt + 64));
    if (!head) { i = lt + 1; continue; }
    let j = lt + head[0].length;
    for (;;) {
      while (j < s.length && /[\s/]/.test(s[j]!)) j++;
      if (j >= s.length) return 'html ends inside a tag';
      if (s[j] === '>') { j++; break; }
      ATTR_NAME.lastIndex = j;
      const nm = ATTR_NAME.exec(s);
      if (!nm) return 'malformed attribute';
      const name = nm[0].toLowerCase();
      j += nm[0].length;
      while (j < s.length && /\s/.test(s[j]!)) j++;
      let value: string | null = null;
      if (s[j] === '=') {
        j++;
        while (j < s.length && /\s/.test(s[j]!)) j++;
        const q = s[j];
        if (q === '"' || q === "'") {
          const end = s.indexOf(q, j + 1);
          if (end === -1) return 'html ends inside an attribute value';
          value = s.slice(j + 1, end); j = end + 1;
        } else {
          UNQUOTED.lastIndex = j;
          const vm = UNQUOTED.exec(s);
          value = vm ? vm[0] : ''; j += value.length;
        }
      }
      if (isForbiddenAttribute(name)) return `attribute ${name} is not allowed`;
      if (value !== null && isUrlAttribute(name) && name !== 'srcset') {
        const decoded = decodeAttr(value);
        if (decoded === undefined) return `unsafe URL in ${name}`;
        if (decoded.trim() !== '#' && safeUrl(decoded) === '#') return `unsafe URL in ${name}`;
      }
    }
    i = j;
  }
  return undefined;
}
