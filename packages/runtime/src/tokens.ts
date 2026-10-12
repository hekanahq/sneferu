import { escapeAttr, SPACING_SCALE, SPACING_STEPS, TOKEN_BUTTON_STYLES, TOKEN_SPACINGS } from '@hekana/sneferu-core';

const CSS_VALUE = /^[#a-zA-Z0-9.,%() -]{1,80}$/;
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `#fff` / `#ffffff` -> [r, g, b]; undefined for anything else. */
function rgb(hex: string): [number, number, number] | undefined {
  if (!HEX.test(hex)) return undefined;
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** Readable text on `bg`: near-black or white, whichever has the higher WCAG contrast ratio against it. */
export function onColor(bg: string): string | undefined {
  const c = rgb(bg);
  if (!c) return undefined;
  const lin = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }) as [number, number, number];
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  // #111111 has a relative luminance of about 0.0056; white has 1
  const dark = (lum + 0.05) / (0.0056 + 0.05);
  const light = 1.05 / (lum + 0.05);
  return dark >= light ? '#111111' : '#FFFFFF';
}
const int = (v: unknown, min: number, max: number, d: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : d;
};

/**
 * The theme's design tokens as one CSS rule scoped to `[data-hk-theme="<id>"]`: colours (`--hk-color-*`, plus
 * `--hk-color-on-primary|accent`), corner radius (`--hk-radius-sm|radius|radius-lg`), the spacing scale
 * (`--hk-space-1..6`), the content width and the button variables (`--hk-btn-bg|fg|border`), mapped onto the
 * platform's `--color-*` names too. `settings` are the resolved theme settings (`token_*`); without them, or for
 * a setting that is missing, the manifest's tokens apply. Unsafe keys or values are skipped.
 */
export function themeTokenCss(manifest: { id: string; tokens?: unknown }, settings?: Record<string, unknown>): string {
  const decl: string[] = [];
  const s = isObj(settings) ? settings : {};
  const tokens = isObj(manifest.tokens) ? manifest.tokens : {};
  const colors = isObj(tokens.colors) ? tokens.colors : {};
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) {
    if (!/^[a-z][a-z0-9-]*$/.test(k)) continue;
    const own = s[`token_color_${k.replace(/-/g, '_')}`];
    const value = typeof own === 'string' && CSS_VALUE.test(own) ? own : v;
    if (typeof value === 'string' && CSS_VALUE.test(value)) { decl.push(`--hk-color-${k}:${value}`); resolved[k] = value; }
  }
  const cw = s.token_container_width !== undefined ? `${int(s.token_container_width, 640, 1920, 1200)}px` : (isObj(tokens.layout) ? tokens.layout.contentWidth : undefined);
  if (typeof cw === 'string' && /^\d{3,4}px$/.test(cw)) decl.push(`--hk-content-width:${cw}`);
  // a theme's own on-primary / on-accent colour (already declared above) wins over the derived one
  for (const k of ['primary', 'accent']) { if (resolved[`on-${k}`] !== undefined) continue; const on = resolved[k] ? onColor(resolved[k]!) : undefined; if (on) decl.push(`--hk-color-on-${k}:${on}`); }
  if (s.token_radius !== undefined) {
    const r = int(s.token_radius, 0, 32, 8);
    decl.push(`--hk-radius-sm:${Math.round(r / 2)}px`, `--hk-radius:${r}px`, `--hk-radius-lg:${Math.round(r * 1.5)}px`);
  }
  if (s.token_spacing !== undefined) {
    const k = (TOKEN_SPACINGS as readonly string[]).includes(String(s.token_spacing)) ? (s.token_spacing as (typeof TOKEN_SPACINGS)[number]) : 'comfortable';
    SPACING_STEPS.forEach((px, i) => decl.push(`--hk-space-${i + 1}:${Math.round(px * SPACING_SCALE[k])}px`));
  }
  if (s.token_button_style !== undefined) {
    const style = (TOKEN_BUTTON_STYLES as readonly string[]).includes(String(s.token_button_style)) ? String(s.token_button_style) : 'solid';
    const accent = 'var(--hk-color-accent)';
    const [bg, fg, border] = style === 'outline' ? ['transparent', accent, accent] : style === 'soft' ? [`color-mix(in srgb,${accent} 14%,transparent)`, accent, 'transparent'] : [accent, 'var(--hk-color-on-accent,var(--hk-color-background))', accent];
    decl.push(`--hk-btn-bg:${bg}`, `--hk-btn-fg:${fg}`, `--hk-btn-border:${border}`);
  }
  for (const k of ['primary', 'secondary', 'accent', 'background', 'text']) decl.push(`--color-${k}:var(--hk-color-${k})`);
  decl.push('background:var(--hk-color-background);color:var(--hk-color-text)');
  return `[data-hk-theme="${escapeAttr(String(manifest.id))}"]{${decl.join(';')}}`;
}
