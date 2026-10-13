import type { PageNode } from './context-types';
import { err, type Diagnostic } from './diagnostics';

/** What one version step does to one kind of name: renames (old → new) and removals. */
export interface MigrationOps { rename?: Record<string, string>; remove?: string[] }
/** One `migrations/*.json` file: how stored settings and pages change when a theme goes from `from` to `to`. */
export interface Migration { from: string; to: string; settings?: MigrationOps; sections?: MigrationOps; blocks?: MigrationOps }

/** Most nodes (sections and blocks, all pages and groups together) one call will walk. */
export const MAX_MIGRATION_NODES = 2000;
const MAX_DEPTH = 16;

export interface MigrationInput { settings: Record<string, unknown>; pages: Record<string, PageNode[]>; groups?: Record<string, PageNode[]> }
export interface MigrationReport {
  /** Sections and blocks present in the output. */
  kept: number;
  migrated: { path: string; from: string; to: string }[];
  dropped: { path: string; what: string }[];
  /** `fromVersion` is older than `toVersion` but no migration connects them; the output is a copy of the input. */
  missingPath: boolean;
  /** The input has more than MAX_MIGRATION_NODES nodes or nests deeper than 16 levels; nothing was migrated. */
  tooLarge: boolean;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
/** Compare two x.y.z versions; undefined when either is not one. */
export function compareSemver(a: string, b: string): number | undefined {
  const x = SEMVER.exec(a), y = SEMVER.exec(b);
  if (!x || !y) return undefined;
  for (let i = 1; i <= 3; i++) { const d = Number(x[i]) - Number(y[i]); if (d !== 0) return d < 0 ? -1 : 1; }
  return 0;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Own-property assignment that is safe for `__proto__`. */
const put = (o: Rec, k: string, v: unknown): void => { Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); };
const own = (o: Rec | undefined, k: string): string | undefined => (o && Object.hasOwn(o, k) && typeof o[k] === 'string' ? (o[k] as string) : undefined);
const has = (l: string[] | undefined, k: string): boolean => Array.isArray(l) && l.includes(k);
const COPY_DEPTH = 20;
/** Deep copy of JSON data; `over.v` is set when it nests deeper than COPY_DEPTH (the copy is then unusable). */
const copy = (v: unknown, over: { v: boolean }, depth = 0): unknown => {
  if (depth > COPY_DEPTH) { over.v = true; return null; }
  if (Array.isArray(v)) return v.map((x) => copy(x, over, depth + 1));
  if (isRec(v)) { const o: Rec = {}; for (const k of Object.keys(v)) put(o, k, copy(v[k], over, depth + 1)); return o; }
  return v;
};

const opsOk = (v: unknown): boolean => {
  if (v === undefined) return true;
  if (!isRec(v) || Object.keys(v).some((k) => k !== 'rename' && k !== 'remove')) return false;
  if (v.rename !== undefined && (!isRec(v.rename) || Object.keys(v.rename).some((k) => typeof (v.rename as Rec)[k] !== 'string'))) return false;
  if (v.remove !== undefined && (!Array.isArray(v.remove) || v.remove.some((x) => typeof x !== 'string'))) return false;
  return true;
};
const validMigration = (m: unknown): m is Migration =>
  isRec(m) && typeof m.from === 'string' && typeof m.to === 'string' && compareSemver(m.from, m.to) === -1
  && opsOk(m.settings) && opsOk(m.sections) && opsOk(m.blocks);

/** Structural check of stored migrations (untrusted). Returns SN9015 diagnostics; never throws. */
export function checkMigrationsShape(value: unknown): Diagnostic[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [err('SN9015', 'artifact migrations must be an array')];
  const out: Diagnostic[] = [];
  if (value.length > 100) out.push(err('SN9015', 'artifact migrations has more than 100 entries'));
  value.slice(0, 100).forEach((m, i) => { if (!validMigration(m)) out.push(err('SN9015', `artifact migrations[${i}] must be { from, to, settings?, sections?, blocks? } with from older than to`)); });
  return out;
}

/** The migrations to run from an installed version to a target, in order. Gaps between versions are allowed (a step with no file changes nothing). */
function pathOf(migrations: Migration[], fromVersion: string, toVersion: string): Migration[] {
  const ms = migrations.filter(validMigration)
    .sort((a, b) => compareSemver(a.from, b.from)! || compareSemver(b.to, a.to)!);
  const out: Migration[] = [];
  let cur = fromVersion;
  for (const m of ms) {
    if (compareSemver(m.from, cur)! < 0 || compareSemver(m.to, toVersion)! > 0) continue;
    out.push(m); cur = m.to;
  }
  return out;
}

function nodeStats(lists: PageNode[][]): { count: number; ok: boolean } {
  let count = 0;
  const stack: [PageNode[], number][] = lists.map((l) => [l, 1]);
  while (stack.length) {
    const [list, depth] = stack.pop()!;
    if (!Array.isArray(list)) continue;
    if (depth > MAX_DEPTH) return { count, ok: false };
    for (const n of list) {
      if (++count > MAX_MIGRATION_NODES) return { count, ok: false };
      if (isRec(n) && Array.isArray(n.children)) stack.push([n.children as PageNode[], depth + 1]);
    }
  }
  return { count, ok: true };
}

/**
 * Carry stored settings and page trees from one theme version to another using the theme's migrations.
 * Pure: the input is never changed, the output shares nothing with it. Names are looked up as own
 * properties only. Unknown keys and types are left alone. Running it again on its own output changes nothing.
 */
export function applyMigrations(input: MigrationInput, migrations: Migration[], fromVersion: string, toVersion: string): { output: MigrationInput; report: MigrationReport } {
  const report: MigrationReport = { kept: 0, migrated: [], dropped: [], missingPath: false, tooLarge: false };
  const settings = (isRec(input?.settings) ? input.settings : {}) as Rec;
  const pages = (isRec(input?.pages) ? input.pages : {}) as Record<string, PageNode[]>;
  const groups = isRec(input?.groups) ? (input.groups as Record<string, PageNode[]>) : undefined;
  const lists = [...Object.keys(pages).map((k) => pages[k]!), ...(groups ? Object.keys(groups).map((k) => groups[k]!) : [])];
  const stats = nodeStats(lists);
  const tooLarge = (): { output: MigrationInput; report: MigrationReport } => { report.tooLarge = true; report.kept = 0; report.migrated = []; report.dropped = []; return { output: input, report }; };
  if (!stats.ok) return tooLarge();
  report.kept = stats.count;
  const over = { v: false };
  let curSettings = copy(settings, over) as Rec;
  let curPages = copy(pages, over) as Record<string, PageNode[]>;
  let curGroups = groups ? (copy(groups, over) as Record<string, PageNode[]>) : undefined;
  if (over.v) return tooLarge();
  const done = (): { output: MigrationInput; report: MigrationReport } => ({ output: { settings: curSettings, pages: curPages, ...(curGroups ? { groups: curGroups } : {}) }, report });

  const order = compareSemver(fromVersion, toVersion);
  if (order === undefined || order >= 0) return done();
  const list = Array.isArray(migrations) ? migrations : [];
  const steps = pathOf(list, fromVersion, toVersion);
  // a theme without migrations has nothing to say; with some, a gap that none of them spans is reported
  if (steps.length === 0) { report.missingPath = list.some(validMigration); return done(); }

  const props = (p: Rec, ops: MigrationOps | undefined, path: string): void => {
    if (!ops) return;
    const next: Rec = {};
    for (const k of Object.keys(p)) {
      if (has(ops.remove, k)) { report.dropped.push({ path: `${path}.${k}`, what: 'setting removed' }); continue; }
      const to = own(ops.rename, k);
      if (to === undefined) { if (!Object.hasOwn(next, k)) put(next, k, p[k]); continue; }
      // a value already under the new name wins; the old one is reported as dropped, not merged
      if (Object.hasOwn(p, to)) report.dropped.push({ path: `${path}.${k}`, what: `setting '${k}' not carried: '${to}' already has a value` });
      else { report.migrated.push({ path: `${path}.${k}`, from: k, to }); put(next, to, p[k]); }
    }
    for (const k of Object.keys(p)) delete p[k];
    for (const k of Object.keys(next)) put(p, k, next[k]);
  };
  const walk = (list: PageNode[], m: Migration, path: string, isSection: boolean): PageNode[] => {
    if (!Array.isArray(list)) return list;
    const ops = isSection ? m.sections : m.blocks;
    const out: PageNode[] = [];
    list.forEach((n, i) => {
      const here = `${path}[${i}]`;
      if (!isRec(n)) { out.push(n); return; }
      const t = typeof n.type === 'string' ? n.type : undefined;
      if (t !== undefined && has(ops?.remove, t)) { report.dropped.push({ path: here, what: `${isSection ? 'section' : 'block'} '${t}' removed` }); return; }
      const to = t === undefined ? undefined : own(ops?.rename, t);
      if (to !== undefined) { report.migrated.push({ path: `${here}.type`, from: t!, to }); put(n, 'type', to); }
      if (isRec(n.props)) props(n.props, m.settings, `${here}.props`);
      if (Array.isArray(n.children)) put(n, 'children', walk(n.children as PageNode[], m, `${here}.children`, false));
      out.push(n as unknown as PageNode);
    });
    return out;
  };

  for (const m of steps) {
    props(curSettings, m.settings, 'settings');
    const mapLists = (rec: Record<string, PageNode[]>, root: string): void => {
      for (const k of Object.keys(rec)) put(rec as Rec, k, walk(rec[k]!, m, `${root}.${k}`, true));
    };
    mapLists(curPages, 'pages');
    if (curGroups) mapLists(curGroups, 'groups');
  }
  const all = [...Object.keys(curPages).map((k) => curPages[k]!), ...(curGroups ? Object.keys(curGroups).map((k) => curGroups![k]!) : [])];
  report.kept = nodeStats(all).count;
  return done();
}
