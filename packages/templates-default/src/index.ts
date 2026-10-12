import { DEFAULT_THEME_TEXT } from './files.generated';

/** A theme file as the compiler takes it. */
export interface DefaultThemeFile { path: string; bytes: Uint8Array }

declare const TextEncoder: new () => { encode(s: string): Uint8Array };
const enc = new TextEncoder();
/**
 * The SDK's default store as theme files: the complete theme `sneferu init` scaffolds (layout with groups,
 * header and footer sections, the index, product, collection, search, cart, page and 404 templates, snippets,
 * tokens, locales, theme.css). The compiler borrows from it whatever a theme lacks. A constant: same array each time.
 */
export const DEFAULT_THEME_FILES: DefaultThemeFile[] = Object.entries(DEFAULT_THEME_TEXT).map(([path, text]) => ({ path, bytes: enc.encode(text) }));

/** The same files as text, for scaffolding. */
export const DEFAULT_THEME_TEXTS: Readonly<Record<string, string>> = DEFAULT_THEME_TEXT;
