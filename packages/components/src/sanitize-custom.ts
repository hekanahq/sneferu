import { escapeAttr, safeUrl } from '@hekana/sneferu-core';
import { safeImageSrc } from './css';
import { decode, sanitizeWith, type Profile, type Rules, type Tag } from './sanitize';

/**
 * The wider allow-list for the custom HTML block. Same rebuild-from-scratch approach as `sanitizeRichText`:
 * nothing from the input is copied except text, and every attribute is re-derived from a validated value.
 * No script, style, link, form controls, object/embed, svg/math, event handlers, inline `style`, or data: URLs.
 */
const ALLOWED = new Set([
  'p', 'div', 'span', 'a', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark',
  'blockquote', 'figure', 'figcaption', 'code', 'pre', 'cite', 'section', 'article', 'header', 'footer', 'nav', 'aside',
]);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const RULES: Rules = {
  closesP: new Set(['p', 'ul', 'ol', 'li', 'div', 'table', 'hr', 'pre', 'blockquote', 'figure', 'figcaption', 'section', 'article', 'header', 'footer', 'nav', 'aside', ...HEADINGS]),
  headings: HEADINGS,
  liBarrier: new Set(['ul', 'ol', 'blockquote', 'div', 'table', ...HEADINGS]),
  voids: new Set(['br', 'hr', 'img']),
};
const ROLES = new Set(['list', 'listitem', 'region', 'note', 'img', 'presentation', 'none', 'heading', 'banner', 'navigation', 'article', 'contentinfo', 'complementary', 'figure', 'group', 'separator', 'table', 'row', 'cell', 'columnheader', 'rowheader']);
const REL = ' rel="nofollow noopener"';
const IDENT = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const CLASS_TOKEN = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const QUERY = '(?:\\?[A-Za-z0-9=&_.-]{0,100})?';
const EMBEDS = [
  new RegExp(`^https://www\\.youtube(?:-nocookie)?\\.com/embed/[A-Za-z0-9_-]{6,20}${QUERY}$`),
  new RegExp(`^https://player\\.vimeo\\.com/video/[0-9]{5,12}${QUERY}$`),
];
/** Hosts a storefront CSP needs in `frame-src` for embeds to load. */
export const CUSTOM_HTML_EMBED_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'] as const;
const DEFAULT_MAX = 50_000;

const plain = (s: string, max = 200): string => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const int = (v: string | undefined, lo: number, hi: number): number | null => {
  if (v === undefined || !/^\s*[0-9]{1,5}\s*$/.test(v)) return null;
  const n = Number(v);
  return n >= lo && n <= hi ? n : null;
};

export interface CustomHtmlOptions {
  maxChars?: number;
  /** Prefix forced onto every `id` and `#fragment` link, so block ids cannot clobber page globals or collide with another block. */
  idPrefix?: string;
}

export function sanitizeCustomHtml(html: string, opts: CustomHtmlOptions = {}): string {
  if (typeof html !== 'string' || html === '') return '';
  const prefix = /^[A-Za-z][A-Za-z0-9_-]{0,31}-$/.test(opts.idPrefix ?? '') ? opts.idPrefix! : 'cx-';
  const withPrefix = (id: string) => (id.startsWith(prefix) ? id : `${prefix}${id}`);

  const get = (t: Tag, k: string): string | undefined => {
    const e = t.attrs.find(([n]) => n === k); // browsers honour the first duplicate
    return e ? decode(e[1]) : undefined;
  };

  const common = (t: Tag, withId = true): string => {
    let out = '';
    const cls = get(t, 'class');
    if (cls !== undefined) {
      const v = cls.split(/\s+/).filter((x) => CLASS_TOKEN.test(x) && !/^(sn|hk)-/.test(x)).slice(0, 12).join(' ');
      if (v) out += ` class="${v}"`;
    }
    const id = get(t, 'id')?.trim();
    if (withId && id !== undefined && IDENT.test(id)) out += ` id="${withPrefix(id)}"`;
    const dir = get(t, 'dir')?.trim().toLowerCase();
    if (dir === 'ltr' || dir === 'rtl' || dir === 'auto') out += ` dir="${dir}"`;
    const lang = get(t, 'lang')?.trim();
    if (lang !== undefined && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(lang)) out += ` lang="${lang}"`;
    const title = get(t, 'title');
    if (title !== undefined && plain(title) !== '') out += ` title="${escapeAttr(plain(title))}"`;
    const label = get(t, 'aria-label');
    if (label !== undefined && plain(label) !== '') out += ` aria-label="${escapeAttr(plain(label))}"`;
    const hidden = get(t, 'aria-hidden')?.trim().toLowerCase();
    if (hidden === 'true' || hidden === 'false') out += ` aria-hidden="${hidden}"`;
    const role = get(t, 'role')?.trim().toLowerCase();
    if (role !== undefined && ROLES.has(role)) out += ` role="${role}"`;
    return out;
  };

  const attrs = (t: Tag): string | null => {
    let out = common(t);
    switch (t.name) {
      case 'a': {
        const raw = get(t, 'href');
        if (raw !== undefined) {
          let url = safeUrl(raw);
          if (url.startsWith('#') && url.length > 1) url = `#${withPrefix(url.slice(1))}`;
          if (url !== '#') out += ` href="${escapeAttr(url)}"`;
        }
        if (get(t, 'target')?.trim().toLowerCase() === '_blank') out += ' target="_blank"';
        return out + REL;
      }
      case 'img': {
        const src = get(t, 'src')?.trim();
        if (src === undefined || !safeImageSrc(src)) return null;
        out += ` src="${escapeAttr(safeUrl(src))}" alt="${escapeAttr(plain(get(t, 'alt') ?? ''))}"`;
        const w = int(get(t, 'width'), 1, 4000);
        const h = int(get(t, 'height'), 1, 4000);
        if (w !== null) out += ` width="${w}"`;
        if (h !== null) out += ` height="${h}"`;
        return `${out} loading="lazy"`;
      }
      case 'td':
      case 'th': {
        const c = int(get(t, 'colspan'), 1, 100);
        const r = int(get(t, 'rowspan'), 1, 100);
        if (c !== null) out += ` colspan="${c}"`;
        if (r !== null) out += ` rowspan="${r}"`;
        return out;
      }
      default:
        return out;
    }
  };

  const iframe = (t: Tag): string | null => {
    const src = get(t, 'src')?.trim();
    if (src === undefined || !EMBEDS.some((re) => re.test(src))) return null;
    const w = int(get(t, 'width'), 1, 4000);
    const h = int(get(t, 'height'), 1, 4000);
    const c = common({ ...t, attrs: t.attrs.filter(([n]) => n === 'class' || n === 'title') }, false);
    return `<iframe${c}${c.includes(' title=') ? '' : ' title="Video"'} src="${escapeAttr(src)}"${w !== null ? ` width="${w}"` : ''}${h !== null ? ` height="${h}"` : ''}`
      + ' sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>';
  };

  const profile: Profile = { allowed: ALLOWED, rules: RULES, attrs, iframe };
  return sanitizeWith(html, { maxChars: opts.maxChars ?? DEFAULT_MAX }, profile);
}
