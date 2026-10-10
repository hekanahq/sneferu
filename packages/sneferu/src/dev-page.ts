import { escapeAttr } from '@hekana/sneferu-core';
import { themeTokenCss } from '@hekana/sneferu-runtime';

type ManifestLike = { id: string; tokens?: unknown };
export { themeTokenCss as tokenCss };

const styleSafe = (css: string): string => css.replace(/<\/style/gi, '<\\/style');

export function devPage(artifact: { manifest: ManifestLike }, o: { body: string; locale: 'ar' | 'en'; css: string; themeCss: string; reloadScript: boolean }): string {
  const dir = o.locale === 'ar' ? 'rtl' : 'ltr';
  const reload = o.reloadScript ? "<script>const es=new EventSource('/__events');es.onmessage=e=>{if(e.data==='reload')location.reload()}</script>" : '';
  return `<!doctype html><html lang="${o.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapeAttr(artifact.manifest.id)} · Sneferu dev</title>`
    + `<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,'Cairo',sans-serif}${themeTokenCss(artifact.manifest)}</style>`
    + `<style>${styleSafe(o.css)}</style><style>${styleSafe(o.themeCss)}</style></head><body>${o.body}${reload}</body></html>`;
}
