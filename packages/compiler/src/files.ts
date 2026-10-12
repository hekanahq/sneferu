import { err, LIMITS, type Diagnostic } from '@hekana/sneferu-core';
export interface ThemeFile { path: string; bytes: Uint8Array }

/** The asset types the store serves: the CLI and the server agree on this. Fonts, JS and .ico still compile but are not served. */
export const IMAGE_ASSET = /\.(png|jpe?g|webp|avif|gif|svg)$/;

const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;
const ALLOWED: Record<string, RegExp> = {
  '': /^theme\.json$/,
  layout: /\.sneferu$/, templates: /\.sneferu$/, sections: /\.sneferu$/, blocks: /\.sneferu$/, snippets: /\.sneferu$/,
  assets: /\.(css|js|png|jpe?g|webp|avif|gif|svg|woff2?|ttf|otf|ico)$/,
  locales: /^[a-z]{2}\.json$/, migrations: /\.json$/, groups: /^(header|footer|announcement)\.json$/,
};

/** The default store's sections, blocks and snippets are called `hk-<name>` in a theme that borrows them, so a theme cannot use the prefix. */
const RESERVED_PREFIX = 'hk-';
const RESERVED_DIRS = new Set(['sections', 'blocks', 'snippets']);

/** Group defaults are small trees; a bigger file is a mistake. */
export const GROUP_FILE_BYTES = 64 * 1024;

export function checkFiles(files: ThemeFile[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (files.length > LIMITS.files) out.push(err('SN3005', `too many files (${files.length} > ${LIMITS.files})`));
  const total = files.reduce((n, f) => n + f.bytes.byteLength, 0);
  if (total > LIMITS.totalBytes) out.push(err('SN3006', `package is ${(total / 1048576).toFixed(1)} MB (max 25 MB)`));
  const seen = new Set<string>();
  for (const f of files) {
    const p = f.path;
    if (p.startsWith('/') || p.includes('\\') || p.split('/').some((s) => s === '..' || s === '.' || !SEGMENT.test(s))) { out.push(err('SN3002', `invalid path '${p}'`, { file: p })); continue; }
    if (seen.has(p)) { out.push(err('SN3004', `duplicate file '${p}'`, { file: p })); continue; }
    seen.add(p);
    const parts = p.split('/');
    const dir = parts.length === 1 ? '' : parts[0]!;
    const rule = ALLOWED[dir];
    if (!rule || !rule.test(parts[parts.length - 1]!) || (dir !== 'assets' && parts.length > 2)) { out.push(err('SN3003', `file type or location not allowed: '${p}'`, { file: p })); continue; }
    if (RESERVED_DIRS.has(dir) && parts[1]!.startsWith(RESERVED_PREFIX)) out.push(err('SN3043', `'${p}': names starting with '${RESERVED_PREFIX}' are reserved for the default store`, { file: p }));
    if (dir === 'assets' && f.bytes.byteLength > LIMITS.assetBytes) out.push(err('SN3007', `asset over 2 MB: '${p}'`, { file: p }));
    if (dir === 'groups' && f.bytes.byteLength > GROUP_FILE_BYTES) out.push(err('SN3036', `group file over ${GROUP_FILE_BYTES / 1024} KB: '${p}'`, { file: p }));
    if (p.endsWith('.sneferu') && f.bytes.byteLength > LIMITS.templateBytes) out.push(err('SN3008', `template over 300 KB: '${p}'`, { file: p }));
  }
  return out;
}
