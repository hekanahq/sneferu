import { err, checkMigrationsShape, type Diagnostic } from '@hekana/sneferu-core';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Structural check of a stored artifact before anything reads it. validateIR
 * covers the IR trees; this covers the containers around them so a truncated
 * or tampered artifact yields SN9015 diagnostics instead of a TypeError.
 * Never throws for JSON-shaped input.
 */
export function checkArtifactShape(a: unknown): Diagnostic[] {
  const out: Diagnostic[] = [];
  const bad = (where: string, what: string) => out.push(err('SN9015', `artifact ${where} ${what}`));
  if (!isObj(a)) { bad('', 'must be an object'); return out; }
  const fields = (where: string, v: unknown) => {
    if (!isObj(v)) { bad(where, 'must be an object of fields'); return; }
    for (const [k, f] of Object.entries(v)) if (!isObj(f) || typeof f.type !== 'string') bad(`${where}.${k}`, 'must be a field with a string type');
  };
  const m = a.manifest;
  if (!isObj(m) || typeof m.id !== 'string' || !/^[a-z][a-z0-9-]{2,40}$/.test(m.id)) bad('manifest', 'needs an id of 3-41 lowercase letters, digits or dashes');
  else {
    if (m.settings !== undefined) fields('manifest.settings', m.settings);
    if (m.tokens !== undefined && !isObj(m.tokens)) bad('manifest.tokens', 'must be an object');
  }
  if (!Array.isArray(a.layout)) bad('layout', 'must be an array');
  if (a.migrations !== undefined) out.push(...checkMigrationsShape(a.migrations));
  const trees = (key: string) => {
    const v = a[key];
    if (!isObj(v)) { bad(key, 'must be an object'); return; }
    for (const [k, t] of Object.entries(v)) if (!Array.isArray(t)) bad(`${key}.${k}`, 'must be an array');
  };
  trees('templates'); trees('snippets');
  const defs = (key: string) => {
    const v = a[key];
    if (!isObj(v)) { bad(key, 'must be an object'); return; }
    for (const [k, d] of Object.entries(v)) {
      if (!isObj(d) || !Array.isArray(d.ir)) { bad(`${key}.${k}`, 'needs an ir array'); continue; }
      if (!isObj(d.schema)) { bad(`${key}.${k}.schema`, 'must be an object'); continue; }
      fields(`${key}.${k}.schema.settings`, d.schema.settings);
    }
  };
  defs('sections'); defs('blocks');
  const ts = a.templateSections;
  if (ts !== undefined) {
    if (!isObj(ts)) bad('templateSections', 'must be an object');
    else for (const [k, list] of Object.entries(ts)) {
      if (!Array.isArray(list)) { bad(`templateSections.${k}`, 'must be an array'); continue; }
      list.forEach((s, i) => { if (!isObj(s) || typeof s.type !== 'string' || (s.settings !== undefined && !isObj(s.settings))) bad(`templateSections.${k}[${i}]`, 'needs a string type and object settings');
        else if (s.blocks !== undefined && (!Array.isArray(s.blocks) || s.blocks.some((b) => !isObj(b) || typeof b.type !== 'string' || (b.settings !== undefined && !isObj(b.settings))))) bad(`templateSections.${k}[${i}].blocks`, 'must be an array of { type, settings? }'); });
    }
  }
  const g = a.groups;
  if (g !== undefined) {
    if (!isObj(g)) bad('groups', 'must be an object');
    else for (const [k, list] of Object.entries(g)) if (!Array.isArray(list) || list.some((n) => !isObj(n) || typeof n.type !== 'string')) bad(`groups.${k}`, 'must be an array of nodes with a string type');
  }
  if (a.localeKeys !== undefined && (!Array.isArray(a.localeKeys) || a.localeKeys.some((k) => typeof k !== 'string'))) bad('localeKeys', 'must be an array of strings');
  const d = a.defaults;
  if (d !== undefined && (!isObj(d) || !Array.isArray(d.templates) || !Array.isArray(d.sections) || typeof d.css !== 'string')) bad('defaults', 'must be { templates, groups, sections, css }');
  return out;
}
