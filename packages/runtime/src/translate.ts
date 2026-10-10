import type { RenderContext } from './context';

const str = (table: unknown, key: string): string | undefined => {
  if (typeof table !== 'object' || table === null || !Object.hasOwn(table, key)) return undefined;
  const v = (table as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : undefined;
};

/** Own-property, string-only translation lookup with fallback to the key itself. Never throws. */
export function translate(ctx: Pick<RenderContext, 'translations' | 'fallbackTranslations'>, key: string): string {
  return str(ctx.translations, key) ?? str(ctx.fallbackTranslations, key) ?? key;
}
