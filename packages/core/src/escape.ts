export const toStr = (v: unknown): string =>
  v === null || v === undefined ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

export const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** https, mailto, tel, or same-origin relative. Everything else becomes '#'. */
export function safeUrl(raw: string): string {
  const s = raw.trim();
  if (s === '') return '#';
  if (/[\u0000-\u001F\u007F]/.test(s)) return '#';
  if (s.startsWith('//')) return '#';
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(s);
  if (!scheme) return s; // relative: /x, #x, ?x, x/y
  const name = scheme[1]!.toLowerCase();
  return name === 'https' || name === 'mailto' || name === 'tel' ? s : '#';
}

export const safeToken = (s: string): string => s.replace(/[^A-Za-z0-9_\- ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const jsonAttr = (v: unknown): string =>
  escapeAttr(JSON.stringify(v ?? null).replace(/</g, '\\u003c').replace(/>/g, '\\u003e'));
