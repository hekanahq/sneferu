import { ENGINE_VERSION, err, type Diagnostic, type FieldSchema } from '@hekana/sneferu-core';

export interface Manifest {
  id: string; name: { ar: string; en: string }; version: string; author: string;
  description: { ar: string; en: string }; category: string; engine: 'hk2'; engineCompatibility: string;
  defaultLocale: 'ar' | 'en'; locales: ('ar' | 'en')[]; settings: FieldSchema;
  tokens: { colors: Record<string, string>; fonts?: { heading?: string; body?: string }; radius?: Record<string, string>; layout?: { contentWidth?: string } };
  previews?: string[];
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const bi = (v: unknown) => typeof v === 'object' && v !== null && typeof (v as { ar?: unknown }).ar === 'string' && typeof (v as { en?: unknown }).en === 'string';

/** `^2.0.0` → major 2, >= 2.0.0; `2.1.0` exact. */
export function satisfies(range: string, version: string): boolean {
  const v = SEMVER.exec(version)!.slice(1).map(Number);
  const caret = range.startsWith('^');
  const r = SEMVER.exec(caret ? range.slice(1) : range);
  if (!r) return false;
  const [M, m, p] = r.slice(1).map(Number) as [number, number, number];
  if (!caret) return v[0] === M && v[1] === m && v[2] === p;
  if (v[0] !== M) return false;
  return v[1]! > m || (v[1] === m && v[2]! >= p);
}

export function validateManifest(json: unknown): { manifest?: Manifest; diagnostics: Diagnostic[] } {
  const out: Diagnostic[] = [];
  const at = { file: 'theme.json' };
  const m = json as Partial<Manifest>;
  if (typeof m !== 'object' || m === null) return { diagnostics: [err('SN3009', 'theme.json must be an object', at)] };
  if (!/^[a-z][a-z0-9-]{2,40}$/.test(String(m.id))) out.push(err('SN3012', 'id must be 3–41 lowercase letters, digits or dashes', at));
  if (!bi(m.name)) out.push(err('SN3013', 'name needs ar and en', at));
  if (!SEMVER.test(String(m.version))) out.push(err('SN3014', 'version must be semver x.y.z', at));
  if (typeof m.author !== 'string' || !m.author) out.push(err('SN3015', 'author is required', at));
  if (!bi(m.description)) out.push(err('SN3016', 'description needs ar and en', at));
  if (typeof m.category !== 'string' || !m.category) out.push(err('SN3017', 'category is required', at));
  if (m.engine !== 'hk2') out.push(err('SN3010', `engine must be "hk2" (got ${JSON.stringify(m.engine)})`, at));
  else if (typeof m.engineCompatibility !== 'string' || !satisfies(m.engineCompatibility, ENGINE_VERSION)) out.push(err('SN3011', `engineCompatibility ${JSON.stringify(m.engineCompatibility)} does not include engine ${ENGINE_VERSION}`, at));
  if (m.defaultLocale !== 'ar' && m.defaultLocale !== 'en') out.push(err('SN3018', 'defaultLocale must be ar or en', at));
  if (!Array.isArray(m.locales) || !m.locales.includes(m.defaultLocale as 'ar')) out.push(err('SN3018', 'locales must include defaultLocale', at));
  const c = m.tokens?.colors ?? {};
  for (const k of ['primary', 'secondary', 'accent', 'background', 'text']) if (!HEX.test(String(c[k]))) out.push(err('SN3019', `tokens.colors.${k} must be a #RRGGBB colour`, at));
  if (typeof m.settings !== 'object' || m.settings === null) out.push(err('SN3021', 'settings must be an object', at));
  return out.length ? { diagnostics: out } : { manifest: m as Manifest, diagnostics: out };
}
