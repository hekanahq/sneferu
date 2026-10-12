import { DEFAULT_ARABIC_FONT, FONTS, escapeAttr, type FontEntry } from '@hekana/sneferu-core';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** `/…` (not `//`) or `https://…`, ending in `/`, with only URL characters that are inert inside `url()`. */
const FONT_BASE = /^(?:\/(?!\/)|https:\/\/)[A-Za-z0-9._~\/:%@+,-]*\/$/;
const SYSTEM_MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

const family = (v: unknown): FontEntry | undefined => (typeof v === 'string' && Object.hasOwn(FONTS, v) ? FONTS[v] : undefined);

/** Escapes the theme id like `themeTokenCss`, and also neutralises backslashes and line breaks (CSS string escapes). */
const cssId = (id: string): string => escapeAttr(id).replace(/[\\\r\n\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);

const stack = (e: FontEntry, locale: 'ar' | 'en'): string => {
  const parts = [`"${e.family}"`];
  if (locale === 'ar' && !e.scripts.includes('arabic')) parts.push(`"${DEFAULT_ARABIC_FONT}"`);
  parts.push(e.generic);
  return parts.join(',');
};

/**
 * Font CSS for a theme page: `@font-face` for the catalogue fonts the page
 * needs, then `--hk-font-heading|body|mono` and `font-family` on the theme root
 * and `h1`-`h6`. Family names come only from the catalogue, never from the
 * manifest text. On an `ar` page a font without Arabic glyphs falls back to
 * Cairo, and a theme with no fonts gets Cairo; on an `en` page a theme with no
 * fonts gets no font CSS at all.
 *
 * `fontBase` is where the files are served (`/hk2/fonts/`); when it is not a
 * safe, slash-terminated `/…` or `https://…` prefix, no `@font-face` is written.
 *
 * `settings` (resolved theme settings) may name other catalogue families through `token_font_heading|body|mono`.
 */
export function themeFontCss(manifest: { id: string; tokens?: unknown }, locale: 'ar' | 'en', fontBase: string, settings?: Record<string, unknown>): string {
  const tokens = isObj(manifest.tokens) ? manifest.tokens : {};
  const declared = isObj(tokens.fonts) ? tokens.fonts : {};
  // the merchant's `token_font_*` settings pick a catalogue family over the manifest's ('default' keeps the manifest's)
  const fonts: Record<string, unknown> = { ...declared };
  if (isObj(settings)) for (const role of ['heading', 'body', 'mono']) { const v = settings[`token_font_${role}`]; if (typeof v === 'string' && v !== 'default' && Object.hasOwn(FONTS, v)) fonts[role] = v; }
  const ar = locale === 'ar';
  let heading = family(fonts.heading);
  let body = family(fonts.body);
  const mono = family(fonts.mono);
  // on an Arabic page an undeclared heading follows the body font, and an undeclared body is Cairo
  if (ar) { body ??= FONTS[DEFAULT_ARABIC_FONT]; heading ??= family(fonts.body) ?? body; }
  if (!heading && !body && !mono) return '';

  // files needed: [family, subsets]
  const need = new Map<string, Set<string>>();
  const want = (e: FontEntry, subsets: string[]) => {
    const cur = need.get(e.family) ?? new Set<string>();
    for (const s of subsets) if (e.scripts.includes(s as 'arabic' | 'latin')) cur.add(s);
    need.set(e.family, cur);
  };
  for (const e of [heading, body, mono]) {
    if (!e) continue;
    want(e, ['arabic', 'latin']); // unicode-range: an unused subset costs nothing until its glyphs appear
    if (ar && !e.scripts.includes('arabic')) want(FONTS[DEFAULT_ARABIC_FONT]!, ['arabic']);
  }

  let css = '';
  if (FONT_BASE.test(fontBase)) {
    for (const [fam, subsets] of need) {
      for (const f of FONTS[fam]!.files) {
        if (!subsets.has(f.subset)) continue;
        css += `@font-face{font-family:"${fam}";font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url(${fontBase}${f.file}) format("woff2");unicode-range:${f.unicodeRange}}`;
      }
    }
  }

  const root = `[data-hk-theme="${cssId(String(manifest.id))}"]`;
  const decl: string[] = [];
  if (heading) decl.push(`--hk-font-heading:${stack(heading, locale)}`);
  if (body) decl.push(`--hk-font-body:${stack(body, locale)}`);
  decl.push(`--hk-font-mono:${mono ? stack(mono, locale) : SYSTEM_MONO}`);
  if (body) decl.push('font-family:var(--hk-font-body)');
  css += `${root}{${decl.join(';')}}`;
  if (heading) css += `${root} :is(h1,h2,h3,h4,h5,h6){font-family:var(--hk-font-heading)}`;
  return css;
}
