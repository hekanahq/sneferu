/**
 * Sneferu template files end in `.snf`. The older `.sneferu` still works everywhere, and a theme
 * may mix the two; one name in both forms in the same folder is an error (SN3044).
 */
export const TEMPLATE_EXTENSIONS = ['.snf', '.sneferu'] as const;
/** The extension new files get (`sneferu init`, docs). */
export const TEMPLATE_EXTENSION = '.snf';
/** Matches a template file name or path: `hero.snf`, `sections/hero.sneferu`. */
export const TEMPLATE_FILE = /\.(snf|sneferu)$/;
export const isTemplateFile = (path: string): boolean => TEMPLATE_FILE.test(path);
/** `sections/hero.snf` → `sections/hero`; anything else is returned as is. */
export const stripTemplateExtension = (path: string): string => path.replace(TEMPLATE_FILE, '');
