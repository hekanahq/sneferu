import { compareSemver, err, type Diagnostic, type FieldSchema, type Migration, type MigrationOps } from '@hekana/sneferu-core';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
/** Most migration files, and most names in one list: a theme with more has a mistake. */
export const MAX_MIGRATIONS = 100;
const MAX_NAMES = 200;
const KINDS = ['settings', 'sections', 'blocks'] as const;

export interface MigrationTargets {
  version: string;
  /** Setting keys that exist now: theme settings plus every section's and block's. */
  settings: Set<string>; sections: Set<string>; blocks: Set<string>;
}

export function settingKeys(schema: FieldSchema | undefined): string[] { return isObj(schema) ? Object.keys(schema) : []; }

/** Validate `migrations/*.json` against the current theme. Returns the sorted list of valid ones (empty when any error). */
export function checkMigrations(files: { path: string; json: unknown | undefined }[], now: MigrationTargets, out: Diagnostic[]): Migration[] {
  const list: Migration[] = [];
  if (files.length > MAX_MIGRATIONS) out.push(err('SN3045', `too many migration files (${files.length} > ${MAX_MIGRATIONS})`, { file: 'migrations' }));
  for (const f of files.slice(0, MAX_MIGRATIONS)) {
    const at = { file: f.path };
    const bad = (code: 'SN3045' | 'SN3046' | 'SN3047', msg: string) => out.push(err(code, `${f.path}: ${msg}`, at));
    const j = f.json;
    if (!isObj(j)) { bad('SN3045', 'must be a JSON object'); continue; }
    const extra = Object.keys(j).find((k) => !['from', 'to', ...KINDS].includes(k));
    if (extra !== undefined) { bad('SN3045', `unknown key '${extra.slice(0, 40)}'; use from, to, settings, sections, blocks`); continue; }
    const v = (x: unknown) => typeof x === 'string' && compareSemver(x, x) === 0;
    if (!v(j.from) || !v(j.to)) { bad('SN3045', '"from" and "to" must be versions like 1.0.0'); continue; }
    const from = j.from as string, to = j.to as string;
    if (compareSemver(from, to) !== -1) { bad('SN3046', `"from" (${from}) must be older than "to" (${to})`); continue; }
    if (compareSemver(to, now.version)! > 0) { bad('SN3046', `"to" (${to}) is newer than the theme version (${now.version})`); continue; }
    const m: Migration = { from, to };
    let ok = true;
    for (const kind of KINDS) {
      const raw = j[kind];
      if (raw === undefined) continue;
      if (!isObj(raw) || Object.keys(raw).some((k) => k !== 'rename' && k !== 'remove')) { bad('SN3045', `${kind} must be { "rename"?: {old: new}, "remove"?: [names] }`); ok = false; continue; }
      const ops: MigrationOps = {};
      const names = (n: unknown): n is string => typeof n === 'string' && NAME.test(n);
      if (raw.rename !== undefined) {
        const r = raw.rename;
        if (!isObj(r) || Object.keys(r).length > MAX_NAMES) { bad('SN3045', `${kind}.rename must be an object of old names to new names (at most ${MAX_NAMES})`); ok = false; }
        else {
          const rename: Record<string, string> = {};
          const targets = new Set<string>();
          for (const [oldName, newName] of Object.entries(r)) {
            if (!names(oldName) || !names(newName)) { bad('SN3045', `${kind}.rename '${oldName.slice(0, 40)}': names are letters, digits, - and _, starting with a letter`); ok = false; continue; }
            if (oldName === newName) { bad('SN3045', `${kind}.rename '${oldName}' renames to itself`); ok = false; continue; }
            if (targets.has(newName)) { bad('SN3045', `${kind}.rename: two names become '${newName}'`); ok = false; continue; }
            targets.add(newName);
            if (!now[kind].has(newName)) { bad('SN3047', `${kind}.rename '${oldName}' → '${newName}': the current theme has no ${kind === 'settings' ? 'setting' : kind.slice(0, -1)} '${newName}'`); ok = false; continue; }
            rename[oldName] = newName;
          }
          for (const t of targets) if (Object.hasOwn(r, t)) { bad('SN3045', `${kind}.rename: '${t}' is both a new and an old name; chain the steps in separate versions`); ok = false; }
          ops.rename = rename;
        }
      }
      if (raw.remove !== undefined) {
        const r = raw.remove;
        if (!Array.isArray(r) || r.length > MAX_NAMES || !r.every(names)) { bad('SN3045', `${kind}.remove must be a list of names (at most ${MAX_NAMES})`); ok = false; }
        else {
          ops.remove = [...new Set(r as string[])];
          for (const n of ops.remove) {
            if (ops.rename && Object.hasOwn(ops.rename, n)) { bad('SN3045', `${kind}: '${n}' is both renamed and removed`); ok = false; }
            if (now[kind].has(n)) { bad('SN3047', `${kind}.remove '${n}': the current theme still has it; remove only what is gone`); ok = false; }
          }
        }
      }
      m[kind] = ops;
    }
    if (ok) list.push(m);
  }
  // no two files for the same step, and no cycle (from < to makes one impossible, but a hand-edited graph is checked anyway)
  const seen = new Set<string>();
  for (const m of list) {
    const k = `${m.from}>${m.to}`;
    if (seen.has(k)) out.push(err('SN3046', `two migration files go from ${m.from} to ${m.to}`, { file: 'migrations' }));
    seen.add(k);
  }
  const sorted = [...list].sort((a, b) => compareSemver(a.from, b.from)! || compareSemver(a.to, b.to)!);
  const edges = new Map<string, string[]>();
  for (const m of sorted) edges.set(m.from, [...(edges.get(m.from) ?? []), m.to]);
  const state = new Map<string, 1 | 2>();
  const visit = (n: string): boolean => {
    state.set(n, 1);
    for (const t of edges.get(n) ?? []) {
      if (state.get(t) === 1) return true;
      if (!state.has(t) && visit(t)) return true;
    }
    state.set(n, 2); return false;
  };
  for (const n of edges.keys()) if (!state.has(n) && visit(n)) { out.push(err('SN3046', 'migrations form a cycle', { file: 'migrations' })); break; }
  return sorted;
}
