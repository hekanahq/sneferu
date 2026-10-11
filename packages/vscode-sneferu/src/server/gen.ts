import type { LangData, TagDoc, PropDoc } from './types';

interface Table { heading: string; header: string[]; rows: string[][] }

/** Splits a markdown table row on `|`, keeping `\|` (escaped pipes inside code) as text. */
function cells(line: string): string[] {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (s[i] === '|') { out.push(cur.trim()); cur = ''; continue; }
    cur += s[i];
  }
  out.push(cur.trim());
  return out;
}

/** Every GFM table in a markdown file, with the heading it sits under. */
export function tables(md: string): Table[] {
  const lines = md.split(/\r?\n/);
  const out: Table[] = [];
  let heading = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    const h = /^#{1,6}\s+(.*)$/.exec(l);
    if (h) { heading = h[1]!.trim(); continue; }
    if (l.trim().startsWith('|') && /^\s*\|?\s*:?-+/.test(lines[i + 1] ?? '')) {
      const header = cells(l).map((c) => c.toLowerCase());
      const rows: string[][] = [];
      let j = i + 2;
      for (; j < lines.length && lines[j]!.trim().startsWith('|'); j++) rows.push(cells(lines[j]!));
      out.push({ heading, header, rows });
      i = j - 1;
    }
  }
  return out;
}

const codes = (cell: string): string[] => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
const find = (ts: Table[], first: string, heading?: RegExp) => ts.find((t) => t.header[0] === first && (!heading || heading.test(t.heading)));
const constList = (src: string, name: string): string[] => {
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(src);
  return m ? [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!) : [];
};
const col = (t: Table, name: string) => t.header.indexOf(name);

interface RawTag { name: string; category: string; label: { en?: string }; allowedChildren: string[] | '*'; responsive: string[]; props: Array<Omit<PropDoc, 'label'> & { label?: { en?: string } }> }

/** Builds the language data from the SDK repo. `read` takes a repo-relative path. */
export function buildData(read: (path: string) => string): LangData {
  const tagsJson = JSON.parse(read('docs/reference/tags.json')) as { tags: RawTag[] };
  const version = read('packages/core/src/version.ts');
  const guide = tables(read('docs/guide/04-data-and-expressions.mdx'));
  const lang = tables(read('docs/language.mdx'));
  const diag = tables(read('docs/diagnostics.mdx'));

  const tags: TagDoc[] = tagsJson.tags.map((t) => ({
    name: t.name,
    category: t.category,
    label: t.label?.en ?? t.name,
    allowedChildren: t.allowedChildren,
    builtin: false,
    props: t.props.map((p) => ({ ...p, label: p.label?.en ?? p.name })),
  }));
  // built into the language, not in the registry (language.mdx "Directives")
  const builtin = (name: string, label: string, doc: string, props: PropDoc[] = [], allowedChildren: string[] | '*' = []): TagDoc => ({ name, category: 'language', label, doc, allowedChildren, builtin: true, props });
  const textProp = (name: string, label: string, extra: Partial<PropDoc> = {}): PropDoc => ({ name, attr: name, type: 'text', responsive: false, label, ...extra });
  tags.push(
    builtin('hk-schema', 'Schema', 'Declares settings (sections, blocks) or default sections (templates) as JSON. One per file, at the end.', [], '*'),
    builtin('hk-slot', 'Slot', 'Layout and templates only: where the template (in a layout) or the sections (in a template) go.', [textProp('name', 'Slot name', { options: ['content', 'sections'], required: true })]),
    builtin('hk-sections', 'Sections', 'Shorthand for the `sections` slot, used in templates.'),
    builtin('hk-block', 'Block', 'Renders a block inside a section: `{% for block in section.blocks %}<hk-block of="{{ block }}" />{% endfor %}`.', [textProp('of', 'Block', { required: true })]),
  );

  // filters: names from the code, docs from the guide (prose) and the language reference (args)
  const gF = find(guide, 'filter');
  const lF = find(lang, 'filter');
  const docFor = (t: Table | undefined, name: string, c: string) => {
    const row = t?.rows.find((r) => codes(r[0]!).includes(name));
    const i = t ? col(t, c) : -1;
    return row && i >= 0 ? row[i] : undefined;
  };
  const filters = constList(version, 'FILTERS').map((name) => ({
    name,
    doc: docFor(gF, name, 'input → output') ?? docFor(lF, name, 'example') ?? '',
    input: docFor(lF, name, 'input'),
    args: docFor(lF, name, 'args'),
  }));

  const gL = find(guide, 'lookup');
  const lookups = constList(version, 'LOOKUPS').map((name) => {
    const row = gL?.rows.find((r) => codes(r[0]!).some((c) => c.startsWith(`${name}(`)));
    return { name, signature: row ? codes(row[0]!)[0]! : `${name}('…')`, doc: row?.[1] ?? '' };
  });

  const gS = find(guide, 'name', /What a template can read/i);
  const scope = (gS?.rows ?? []).filter((r) => !/loop variable/i.test(r[0]!)).flatMap((r) => codes(r[0]!).filter((n) => /^[a-z_]+$/.test(n)).map((name) => ({
    name,
    where: r[1] ?? '',
    doc: r[2] ?? '',
    // `section.settings.*`, `forloop.index` …: the property paths the docs name
    properties: [...new Set(codes(r[2] ?? '').filter((c) => c.startsWith(`${name}.`)).map((c) => c.slice(name.length + 1).replace(/\.\*$/, '').split(/[.\s(]/)[0]!).filter(Boolean))],
  })));

  const gP = find(guide, 'field', /Product fields/i);
  const productFields = (gP?.rows ?? []).map((r) => ({ name: codes(r[0]!)[0] ?? r[0]!, doc: r[1] ?? '' }));

  const lT = find(lang, 'type', /Field types/i);
  const fieldTypes = (lT?.rows ?? []).flatMap((r) => codes(r[0]!).map((name) => ({ name, doc: `${r[1] ?? ''}. Stored values: ${r[2] ?? ''}` })));
  const fieldKeys = codes(/Each field is (.*)$/m.exec(read('docs/language.mdx'))?.[1] ?? '').join(' ').match(/"([a-z_A-Z]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const diagnostics = diag.filter((t) => t.header[0] === 'code').flatMap((t) => t.rows.map((r) => ({ code: r[0]!.replace(/`/g, ''), meaning: r[1] ?? '', fix: r[2] ?? '' })));

  return { tags, filters, lookups, scope, productFields, fieldTypes, fieldKeys, diagnostics };
}
