import { escapeAttr } from '@hekana/sneferu-core';

const CSS_VALUE = /^[#a-zA-Z0-9.,%() -]{1,80}$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The theme's design tokens as a CSS rule scoped to `[data-hk-theme="<id>"]`,
 * mapped onto the platform's `--color-*` names. Unsafe keys or values are skipped.
 */
export function themeTokenCss(manifest: { id: string; tokens?: unknown }): string {
  const decl: string[] = [];
  const tokens = isObj(manifest.tokens) ? manifest.tokens : {};
  const colors = isObj(tokens.colors) ? tokens.colors : {};
  for (const [k, v] of Object.entries(colors)) if (/^[a-z][a-z0-9-]*$/.test(k) && typeof v === 'string' && CSS_VALUE.test(v)) decl.push(`--hk-color-${k}:${v}`);
  const cw = isObj(tokens.layout) ? tokens.layout.contentWidth : undefined;
  if (typeof cw === 'string' && /^\d{3,4}px$/.test(cw)) decl.push(`--hk-content-width:${cw}`);
  for (const k of ['primary', 'secondary', 'accent', 'background', 'text']) decl.push(`--color-${k}:var(--hk-color-${k})`);
  decl.push('background:var(--hk-color-background);color:var(--hk-color-text)');
  return `[data-hk-theme="${escapeAttr(String(manifest.id))}"]{${decl.join(';')}}`;
}
