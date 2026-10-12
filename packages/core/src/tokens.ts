import type { FieldSchema } from './fields';
import { FONTS } from './fonts';

/** The theme tokens a manifest declares (`theme.json` `tokens`). */
export interface ManifestTokens {
  colors?: Record<string, string>;
  fonts?: { heading?: string; body?: string; mono?: string };
  radius?: Record<string, string>;
  layout?: { contentWidth?: string };
}

export const TOKEN_SPACINGS = ['compact', 'comfortable', 'spacious'] as const;
export const TOKEN_BUTTON_STYLES = ['solid', 'outline', 'soft'] as const;
/** Multiplier of the spacing scale (4, 8, 16, 24, 40, 64 px). */
export const SPACING_SCALE: Readonly<Record<(typeof TOKEN_SPACINGS)[number], number>> = { compact: 0.75, comfortable: 1, spacious: 1.35 };
export const SPACING_STEPS = [4, 8, 16, 24, 40, 64] as const;

const COLOR_LABELS: Record<string, { ar: string; en: string }> = {
  primary: { ar: 'اللون الأساسي', en: 'Primary colour' }, secondary: { ar: 'اللون الثانوي', en: 'Secondary colour' },
  accent: { ar: 'لون التمييز', en: 'Accent colour' }, background: { ar: 'الخلفية', en: 'Background' }, text: { ar: 'لون النص', en: 'Text colour' },
};
const titleCase = (k: string) => k.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const px = (v: unknown): number | undefined => { const m = typeof v === 'string' ? /^(\d{1,4})px$/.exec(v) : null; return m ? Number(m[1]) : undefined; };

/**
 * The theme-level settings every theme gets for its tokens: one colour per token, the three font roles
 * from the curated catalogue, corner radius, spacing scale, button style and container width. The compiler
 * adds them to the manifest's `settings` (a theme's own declaration of the same name wins); the runtime
 * turns the resolved values into CSS custom properties (themeTokenCss, themeFontCss).
 */
export function tokenSettings(tokens: ManifestTokens | undefined): FieldSchema {
  const t = tokens ?? {};
  const out: FieldSchema = {};
  for (const [k, v] of Object.entries(t.colors ?? {})) {
    if (!/^[a-z][a-z0-9-]*$/.test(k)) continue;
    out[`token_color_${k.replace(/-/g, '_')}`] = { type: 'color', label: COLOR_LABELS[k] ?? { ar: titleCase(k), en: titleCase(k) }, default: v, group: 'colors' };
  }
  const families = ['default', ...Object.keys(FONTS)];
  const role = (r: 'heading' | 'body' | 'mono', ar: string, en: string) => {
    const d = t.fonts?.[r];
    out[`token_font_${r}`] = { type: 'select', label: { ar, en }, options: families, default: d && families.includes(d) ? d : 'default', group: 'typography' };
  };
  role('heading', 'خط العناوين', 'Heading font');
  role('body', 'خط النص', 'Body font');
  role('mono', 'خط الأرقام والأكواد', 'Monospace font');
  out.token_radius = { type: 'range', label: { ar: 'استدارة الزوايا', en: 'Corner radius' }, min: 0, max: 32, step: 2, default: px(t.radius?.md) ?? 8, group: 'shape' };
  out.token_spacing = { type: 'select', label: { ar: 'المسافات', en: 'Spacing' }, options: [...TOKEN_SPACINGS], default: 'comfortable', group: 'layout' };
  out.token_button_style = { type: 'select', label: { ar: 'شكل الأزرار', en: 'Button style' }, options: [...TOKEN_BUTTON_STYLES], default: 'solid', group: 'buttons' };
  out.token_container_width = { type: 'range', label: { ar: 'عرض المحتوى', en: 'Content width (px)' }, min: 960, max: 1600, step: 20, default: px(t.layout?.contentWidth) ?? 1200, group: 'layout' };
  return out;
}
