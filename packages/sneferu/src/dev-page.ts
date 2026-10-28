import { DEFAULT_ARABIC_FONT, FONTS, escapeAttr, escapeText } from '@hekana/sneferu-core';
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

/**
 * What `sneferu dev` shows inside <hk-inline-checkout>: the real form only exists on a Hekana
 * store, so the theme author sees a grey box of the right size instead of a 404.
 */
export function checkoutEmbedPlaceholder(locale: 'ar' | 'en'): string {
  const text = locale === 'ar' ? 'نموذج الطلب من هكانة يظهر هنا على المتجر' : 'Hekana order form appears here on the store';
  return `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><meta charset="utf-8">`
    + `<body style="margin:0;font:15px/1.5 system-ui,sans-serif"><div style="min-height:560px;display:grid;place-items:center;background:#f1f1f1;color:#555;border-radius:12px">${text}</div>`
    + `<script>parent.postMessage({type:'hk:checkout-height',height:document.documentElement.scrollHeight},location.origin)</script></body></html>`;
}

/** Stands in for an app's framed page in `sneferu dev`: a still box that reports its height like the real page does. */
export function appBlockPlaceholder(locale: 'ar' | 'en', name: { ar: string; en: string }): string {
  const text = locale === 'ar' ? `${name.ar}: يظهر هنا على المتجر` : `${name.en}: appears here on the store`;
  return `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><meta charset="utf-8">` +
    `<body style="margin:0;font:15px/1.5 system-ui,sans-serif"><div style="min-height:160px;display:grid;place-items:center;background:#f1f1f1;color:#555;border-radius:12px">${escapeText(text)}</div>` +
    `<script>parent.postMessage({type:'hk:app-block-height',height:document.documentElement.scrollHeight},location.origin)</script></body></html>`;
}

