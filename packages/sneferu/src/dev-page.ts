import { escapeAttr } from '@hekana/sneferu-core';

type ManifestLike = { id: string; tokens: { colors: Record<string, string>; layout?: { contentWidth?: string } } };
const CSS_VALUE = /^[#a-zA-Z0-9.,%() -]{1,80}$/;

export function tokenCss(m: ManifestLike): string {
  const decl: string[] = [];
  for (const [k, v] of Object.entries(m.tokens.colors)) if (/^[a-z][a-z0-9-]*$/.test(k) && CSS_VALUE.test(v)) decl.push(`--hk-color-${k}:${v}`);
  const cw = m.tokens.layout?.contentWidth;
  if (cw && /^\d{3,4}px$/.test(cw)) decl.push(`--hk-content-width:${cw}`);
  for (const k of ['primary', 'secondary', 'accent', 'background', 'text']) decl.push(`--color-${k}:var(--hk-color-${k})`);
  decl.push('background:var(--hk-color-background);color:var(--hk-color-text)');
  return `[data-hk-theme="${escapeAttr(m.id)}"]{${decl.join(';')}}`;
}

const styleSafe = (css: string): string => css.replace(/<\/style/gi, '<\\/style');

export function devPage(artifact: { manifest: ManifestLike }, o: { body: string; locale: 'ar' | 'en'; css: string; themeCss: string; reloadScript: boolean }): string {
  const dir = o.locale === 'ar' ? 'rtl' : 'ltr';
  const reload = o.reloadScript ? "<script>const es=new EventSource('/__events');es.onmessage=e=>{if(e.data==='reload')location.reload()}</script>" : '';
  return `<!doctype html><html lang="${o.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapeAttr(artifact.manifest.id)} · Sneferu dev</title>`
    + `<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,'Cairo',sans-serif}${tokenCss(artifact.manifest)}</style>`
    + `<style>${styleSafe(o.css)}</style><style>${styleSafe(o.themeCss)}</style></head><body>${o.body}${reload}</body></html>`;
}
