import { DEFAULT_ARABIC_FONT, FONTS, escapeAttr } from '@hekana/sneferu-core';
import { themeFontCss, themeTokenCss } from '@hekana/sneferu-runtime';

type ManifestLike = { id: string; tokens?: unknown };
export { themeTokenCss as tokenCss };

/**
 * Dev only: one Google Fonts stylesheet for the declared catalogue families (plus
 * Cairo on Arabic pages). Production serves the files itself and never calls Google.
 * Family specs come from the catalogue, never from theme.json text.
 */
export function googleFontsHref(manifest: ManifestLike, locale: 'ar' | 'en'): string {
  const t = manifest.tokens as { fonts?: Record<string, unknown> } | null | undefined;
  const fonts = t && typeof t.fonts === 'object' && t.fonts !== null ? t.fonts : {};
  const names = new Set<string>();
  for (const role of ['heading', 'body', 'mono']) {
    const v = fonts[role];
    if (typeof v === 'string' && Object.hasOwn(FONTS, v)) names.add(v);
  }
  if (locale === 'ar') names.add(DEFAULT_ARABIC_FONT);
  if (names.size === 0) return '';
  return `https://fonts.googleapis.com/css2?${[...names].map((n) => `family=${FONTS[n]!.google}`).join('&')}&display=swap`;
}

const styleSafe = (css: string): string => css.replace(/<\/style/gi, '<\\/style');

export function devPage(artifact: { manifest: ManifestLike }, o: { body: string; locale: 'ar' | 'en'; css: string; themeCss: string; reloadScript: boolean; hostScript?: string }): string {
  const dir = o.locale === 'ar' ? 'rtl' : 'ltr';
  const href = googleFontsHref(artifact.manifest, o.locale);
  const fontLink = href ? `<link rel="stylesheet" href="${escapeAttr(href)}">` : '';
  const reload = o.reloadScript ? "<script>const es=new EventSource('/__events');es.onmessage=e=>{if(e.data==='reload')location.reload()}</script>" : '';
  return `<!doctype html><html lang="${o.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapeAttr(artifact.manifest.id)} · Sneferu dev</title>`
    + fontLink
    + `<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,'Cairo',sans-serif}${themeTokenCss(artifact.manifest)}${styleSafe(themeFontCss(artifact.manifest, o.locale, ''))}</style>`
    + `<style>${styleSafe(o.css)}</style><style>${styleSafe(o.themeCss)}</style></head><body>${o.body}${o.hostScript ? `<script type="module">${o.hostScript.replace(/<\/script/gi, '<\\/script')}</script>` : ''}${reload}</body></html>`;
}
