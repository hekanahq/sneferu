import { existsSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

/** The route `sneferu dev` serves project image files under. Dev only: the compiler, runtime and `hk-image` are unchanged. */
export const DEV_IMAGE_ROUTE = '/__dev-images/';
export const DEV_IMAGE_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

const IMAGE_EXT = /\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i;
const IMAGE_KEYS = new Set(['image', 'src', 'thumbnail', 'featured_image', 'image_url']);
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Sample-data image values that a real store would never serve become something the dev page can show:
 * a relative path to a file inside the project (resolved from the data file's folder, then the project root)
 * is rewritten to `/__dev-images/<path from the project root>`. A value the page would silently drop
 * (`http://`, `//host`, a relative path with no file behind it, a path outside the project) is reported through
 * `warn` and left as it is. `https://` and root-relative values are untouched.
 */
export function localizeDevImages(raw: unknown, ctx: { root: string; dataDir: string }, warn: (msg: string) => void): unknown {
  const root = resolve(ctx.root);
  const walk = (v: unknown, key: string, at: string): unknown => {
    if (typeof v === 'string') return fix(v, key, at);
    if (Array.isArray(v)) return v.map((x, i) => walk(x, key, `${at}[${i}]`));
    if (typeof v === 'object' && v !== null) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k, at ? `${at}.${k}` : k)]));
    return v;
  };
  const fix = (s: string, key: string, at: string): string => {
    const imageish = IMAGE_EXT.test(s) || (IMAGE_KEYS.has(key) && /^(?:https?:)?\/\//i.test(s));
    if (!imageish || s.startsWith('data:')) return s;
    if (s.startsWith('https://') || (s.startsWith('/') && !s.startsWith('//'))) return s;
    if (s.startsWith('http://') || s.startsWith('//')) { warn(`image ${JSON.stringify(s)} (${at}) is not shown: hk-image only renders https:// and root-relative URLs; use https:// or a file in your project`); return s; }
    if (SCHEME.test(s)) { warn(`image ${JSON.stringify(s)} (${at}) is not shown: unsupported URL scheme`); return s; }
    const path = s.replace(/[?#].*$/, '');
    for (const base of [resolve(ctx.dataDir), root]) {
      const file = resolve(base, path);
      const rel = relative(root, file);
      if (rel === '' || rel.startsWith('..') || resolve(root, rel) !== file) continue;
      if (!DEV_IMAGE_TYPES[extname(file).toLowerCase()] || !existsSync(file) || !statSync(file).isFile()) continue;
      return DEV_IMAGE_ROUTE + rel.split(sep).map(encodeURIComponent).join('/');
    }
    warn(`image ${JSON.stringify(s)} (${at}) is not shown: no such file inside the project (looked next to the data file and in the project root)`);
    return s;
  };
  return walk(raw, '', '');
}

/** Resolve a `/__dev-images/<path>` request to an image file inside the project; undefined when unsafe or not an image. */
export function resolveDevImage(root: string, raw: string): string | undefined {
  let rel: string;
  try { rel = decodeURIComponent(raw); } catch { return undefined; }
  if (rel.includes('\0') || rel.includes('\\') || rel.startsWith('/') || rel.split('/').some((x) => x === '..' || x === '')) return undefined;
  const base = resolve(root);
  const file = resolve(base, rel);
  if (!file.startsWith(base + sep) || !DEV_IMAGE_TYPES[extname(file).toLowerCase()]) return undefined;
  return file;
}
