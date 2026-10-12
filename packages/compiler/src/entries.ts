import { err, isGroupName, parseTemplateName, type Diagnostic, type GroupName, type PageNode } from '@hekana/sneferu-core';
import type { SectionSchema } from './compile';

/** A default section as a template's `<hk-schema>` or a group file lists it, after checking. */
export interface DefaultEntry { id?: string; type: string; settings: Record<string, unknown>; blocks?: DefaultEntry[]; hidden?: boolean }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const MAX_GROUP_SECTIONS = 12;
export const MAX_TEMPLATE_SECTIONS = 24;
/** Section -> block -> sub-block. */
export const MAX_BLOCK_DEPTH = 2;
export const MAX_BLOCKS_PER_PARENT = 50;

export interface EntryCheck {
  file: string; label: string;
  /** Codes for a section type that does not exist and for a malformed entry (templates: SN3020/SN3026, groups: SN3037/SN3038). */
  codes: { unknownSection: string; malformed: string };
  sections: Record<string, { schema: SectionSchema }>;
  blocks: Record<string, { schema: SectionSchema }>;
  /** The template name or group the entries are defaults for (section `templates` allow-lists are checked against it). */
  where: string;
  /** Whether entries carry ids (groups do). */
  ids: boolean;
  max: number;
}

/**
 * Checks a list of default sections (with nested blocks) and returns the clean entries. Reports, never throws.
 * `block_order` (ids) reorders a section's or block's `blocks`; ids that are not listed keep their place at the end.
 */
export function checkEntries(raw: unknown, c: EntryCheck, out: Diagnostic[]): DefaultEntry[] {
  const at = { file: c.file };
  const bad = (msg: string) => out.push(err(c.codes.malformed, `${c.label}: ${msg}`, at));
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) { bad('sections must be an array'); return []; }
  if (raw.length > c.max) { bad(`at most ${c.max} sections`); }
  const seen = new Set<string>();
  const entries: DefaultEntry[] = [];

  const blocksOf = (list: unknown, parent: { type: string; allowed?: { allowed: string[]; max: number } }, depth: number, prefix: string, order: unknown): DefaultEntry[] | undefined => {
    if (list === undefined) return undefined;
    if (!Array.isArray(list)) { bad(`blocks of '${parent.type}' must be an array`); return undefined; }
    if (depth > MAX_BLOCK_DEPTH) { out.push(err('SN3029', `${c.label}: blocks nest at most ${MAX_BLOCK_DEPTH} levels deep`, at)); return undefined; }
    const items: DefaultEntry[] = [];
    list.slice(0, MAX_BLOCKS_PER_PARENT).forEach((b, j) => {
      if (!isObj(b) || typeof b.type !== 'string' || (b.settings !== undefined && !isObj(b.settings))) { bad('each block needs a string type and object settings'); return; }
      const def = Object.hasOwn(c.blocks, b.type) ? c.blocks[b.type] : undefined;
      if (!def) { out.push(err('SN3028', `${c.label}: unknown block type '${b.type}'`, at)); return; }
      const allowed = parent.allowed;
      if (!allowed || !allowed.allowed.includes(b.type)) { out.push(err('SN3029', `${c.label}: block '${b.type}' not allowed in '${parent.type}'`, at)); return; }
      if (j >= allowed.max) { out.push(err('SN3029', `${c.label}: '${parent.type}' allows at most ${allowed.max} blocks`, at)); return; }
      let id: string | undefined;
      if (b.id !== undefined) {
        if (typeof b.id !== 'string' || !ID.test(b.id) || seen.has(b.id)) { bad(`block id ${JSON.stringify(b.id).slice(0, 40)} is not a unique id of letters, digits, - and _`); return; }
        id = b.id;
      } else if (c.ids) id = `${prefix}-b${j + 1}`;
      if (id !== undefined) { if (seen.has(id)) { bad(`duplicate block id '${id}'`); return; } seen.add(id); }
      const entry: DefaultEntry = { ...(id !== undefined ? { id } : {}), type: b.type, settings: (b.settings ?? {}) as Record<string, unknown> };
      if (b.hidden === true) entry.hidden = true;
      const kids = blocksOf(b.blocks, { type: b.type, ...(def.schema.blocks ? { allowed: def.schema.blocks } : {}) }, depth + 1, id ?? `${prefix}-b${j + 1}`, b.block_order);
      if (kids) entry.blocks = kids;
      items.push(entry);
    });
    return reorder(items, order);
  };

  const reorder = (items: DefaultEntry[], order: unknown): DefaultEntry[] => {
    if (order === undefined) return items;
    if (!Array.isArray(order) || order.some((x) => typeof x !== 'string')) { bad('block_order must be an array of block ids'); return items; }
    const byId = new Map(items.filter((i) => i.id !== undefined).map((i) => [i.id!, i]));
    const ordered: DefaultEntry[] = [];
    for (const id of order as string[]) {
      const hit = byId.get(id);
      if (!hit) { bad(`block_order lists '${id}', which is not one of the blocks`); continue; }
      if (!ordered.includes(hit)) ordered.push(hit);
    }
    return [...ordered, ...items.filter((i) => !ordered.includes(i))];
  };

  raw.slice(0, c.max).forEach((s, i) => {
    if (!isObj(s) || typeof s.type !== 'string' || (s.settings !== undefined && !isObj(s.settings))) { bad('each section needs a string type and object settings'); return; }
    const def = Object.hasOwn(c.sections, s.type) ? c.sections[s.type] : undefined;
    if (!def) { out.push(err(c.codes.unknownSection, `${c.label} references unknown section '${s.type}'`, at)); return; }
    let id: string | undefined;
    if (c.ids) {
      id = s.id === undefined ? `${c.where}-${i + 1}` : s.id as string;
      if (typeof id !== 'string' || !ID.test(id) || seen.has(id)) { bad(`section id ${JSON.stringify(id).slice(0, 40)} is not a unique id of letters, digits, - and _`); return; }
      seen.add(id);
    }
    const entry: DefaultEntry = { ...(id !== undefined ? { id } : {}), type: s.type, settings: (s.settings ?? {}) as Record<string, unknown> };
    if (s.hidden === true) entry.hidden = true;
    const kids = blocksOf(s.blocks, { type: s.type, ...(def.schema.blocks ? { allowed: def.schema.blocks } : {}) }, 1, id ?? `${c.where}-${i + 1}`, s.block_order);
    if (kids) entry.blocks = kids;
    entries.push(entry);
  });
  return entries;
}

/** Group defaults as page-tree nodes (the shape a host stores and passes back in `groups`). */
export function toNodes(entries: DefaultEntry[]): PageNode[] {
  return entries.map((e) => ({
    id: e.id ?? '', type: e.type, props: e.settings,
    ...(e.blocks ? { children: toNodes(e.blocks) } : {}), ...(e.hidden ? { hidden: true } : {}),
  }));
}

export { isGroupName, parseTemplateName, type GroupName };
