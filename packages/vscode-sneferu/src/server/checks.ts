import { parseTemplate } from '@hekana/sneferu-compiler';
import { parseTree, findNodeAtLocation, type Node as JsonNode } from 'jsonc-parser';
import { kindOf, schemaOf, settingsOf, type ThemeIndex } from './theme';

/**
 * Theme checks: problems the compiler accepts but a reviewer would flag, in the
 * spirit of Shopify's Theme Check. Each has a stable name (the diagnostic code),
 * documented on hekana.dev/guide/vscode.
 */
export const CHECKS = {
  UnusedSetting: 'A setting declared in a schema (or theme.json) that no template reads.',
  UndefinedSetting: 'A template reads section.settings.x or block.settings.x that its schema does not declare.',
  TranslationKeyExists: "t('key') or 'key' | t names a key the default locale does not have.",
  MatchingTranslations: 'A key is in one locale file and missing from another (ar and en).',
  MissingLocaleFile: 'theme.json lists a locale with no locales/<code>.json.',
  ImgAltText: '<hk-image> or <img> without an alt attribute (alt="" marks a decorative image).',
  SchemaLabelEnglish: 'A schema name or label with no English text (Arabic only, or { ar } without en).',
  AssetSize: 'An asset over the size budget (default 500 KB; the compiler rejects 2 MB).',
  MissingAsset: "asset_url('file') names a file that is not in assets/.",
  OrphanedSnippet: 'A snippet no template renders.',
} as const;
export type CheckName = keyof typeof CHECKS;

export interface Finding {
  check: CheckName;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  rel: string;
  /** offset+length in the file, or line/col (1-based) from the parser */
  offset?: number;
  length?: number;
  line?: number;
  col?: number;
  /** for quick fixes */
  data?: Record<string, unknown>;
}

const ARABIC = /[؀-ۿ]/;
const T_CALL = /\bt\(\s*(['"])([^'"]+)\1\s*\)/g;
const T_FILTER = /(['"])([^'"{}]+)\1\s*\|\s*t\b/g;

/** Every `{{ … }}` / `{% … %}` span in a template, so strings outside expressions are ignored. */
function exprSpans(text: string): { start: number; body: string }[] {
  return [...text.matchAll(/\{\{([\s\S]*?)\}\}|\{%([\s\S]*?)%\}/g)].map((m) => ({ start: m.index! + 2, body: m[1] ?? m[2] ?? '' }));
}

export function translationRefs(text: string): { key: string; offset: number; length: number }[] {
  const out: { key: string; offset: number; length: number }[] = [];
  for (const s of exprSpans(text)) {
    for (const re of [T_CALL, T_FILTER]) {
      for (const m of s.body.matchAll(re)) out.push({ key: m[2]!, offset: s.start + m.index! + m[0].indexOf(m[1]!) + 1, length: m[2]!.length });
    }
  }
  return out;
}

function labelProblem(label: unknown): string | undefined {
  if (typeof label === 'string') return ARABIC.test(label) ? 'is Arabic only: write { "en": "…", "ar": "…" }' : undefined;
  if (label && typeof label === 'object' && !Array.isArray(label)) {
    const en = (label as Record<string, unknown>).en;
    if (typeof en !== 'string' || !en.trim()) return 'has no "en"';
    if (ARABIC.test(en)) return 'has Arabic text under "en"';
  }
  return undefined;
}

/** name/label problems in one schema JSON (a .sneferu <hk-schema> or theme.json). */
function schemaLabels(json: string, base: number, rel: string, out: Finding[], withName: boolean) {
  const tree = parseTree(json);
  if (!tree) return;
  const plain = (n: JsonNode | undefined): unknown => n?.type === 'object' ? Object.fromEntries((n.children ?? []).map((c) => [c.children?.[0]?.value, plain(c.children?.[1])])) : n?.value;
  if (withName) {
    const n = findNodeAtLocation(tree, ['name']);
    const p = n && labelProblem(plain(n));
    if (n && p) out.push({ check: 'SchemaLabelEnglish', severity: 'warning', message: `schema name ${p}`, rel, offset: base + n.offset, length: n.length });
  }
  for (const f of settingsOf(json, base)) {
    const p = labelProblem(f.label);
    if (p) out.push({ check: 'SchemaLabelEnglish', severity: 'warning', message: `label of setting "${f.key}" ${p}`, rel, offset: f.offset, length: f.length });
  }
}

export interface CheckOptions { disabled?: string[]; assetSizeWarnKb?: number }

export function runChecks(theme: ThemeIndex, opts: CheckOptions = {}): Finding[] {
  const out: Finding[] = [];
  const templates = theme.files.filter((p) => p.endsWith('.sneferu'));
  const texts = new Map(templates.map((p) => [p, theme.text(p) ?? '']));
  const all = [...texts.values()].join('\n');
  const snippetsAndBlocks = [...texts.entries()].filter(([p]) => p.startsWith('snippets/') || p.startsWith('blocks/')).map(([, t]) => t).join('\n');
  const snippetText = [...texts.entries()].filter(([p]) => p.startsWith('snippets/')).map(([, t]) => t).join('\n');
  const reads = (hay: string, base: string, key: string) => new RegExp(`\\b${base}\\.settings\\.${key.replace(/[^\w]/g, '\\$&')}\\b`).test(hay);

  // settings
  for (const [rel, text] of texts) {
    const kind = kindOf(rel);
    const s = schemaOf(text);
    if (s && (kind === 'section' || kind === 'block')) {
      schemaLabels(s.json, s.offset, rel, out, true);
      const fields = settingsOf(s.json, s.offset);
      const base = kind === 'section' ? 'section' : 'block';
      for (const f of fields) {
        const used = reads(text, base, f.key) || reads(kind === 'section' ? snippetsAndBlocks : snippetText, base, f.key);
        if (!used) out.push({ check: 'UnusedSetting', severity: 'warning', message: `setting "${f.key}" is never read (${base}.settings.${f.key})`, rel, offset: f.offset, length: f.length });
      }
      const declared = new Set(fields.map((f) => f.key));
      const body = text.slice(0, s.offset);
      for (const m of body.matchAll(new RegExp(`\\b${base}\\.settings\\.([a-zA-Z_][\\w]*)`, 'g'))) {
        if (!declared.has(m[1]!)) out.push({ check: 'UndefinedSetting', severity: 'warning', message: `"${m[1]}" is not a setting of this ${kind}; it is always empty`, rel, offset: m.index! + m[0].length - m[1]!.length, length: m[1]!.length });
      }
    }
  }
  const mt = theme.text('theme.json') ?? '';
  schemaLabels(mt, 0, 'theme.json', out, false);
  for (const f of theme.manifest.settings) {
    const re = new RegExp(`\\bsettings\\.${f.key}\\b|settings\\(\\s*['"]${f.key}['"]\\s*\\)`);
    if (!re.test(all.replace(/\b(section|block)\.settings\./g, ''))) out.push({ check: 'UnusedSetting', severity: 'info', message: `theme setting "${f.key}" is not read by any template (settings.${f.key})`, rel: 'theme.json', offset: f.offset, length: f.length });
  }

  // translations
  const def = theme.manifest.defaultLocale ?? 'en';
  const defMap = theme.locales.get(def);
  for (const code of theme.manifest.locales) {
    if (!theme.locales.has(code)) {
      const at = mt.indexOf(`"${code}"`, Math.max(0, mt.indexOf('"locales"')));
      out.push({ check: 'MissingLocaleFile', severity: 'warning', message: `locale "${code}" has no locales/${code}.json`, rel: 'theme.json', offset: Math.max(0, at), length: at >= 0 ? code.length + 2 : 1 });
    }
  }
  if (defMap) {
    for (const [rel, text] of texts) {
      for (const r of translationRefs(text)) {
        if (!defMap.has(r.key)) out.push({ check: 'TranslationKeyExists', severity: 'warning', message: `"${r.key}" is not in locales/${def}.json; the page shows the key itself`, rel, offset: r.offset, length: r.length, data: { key: r.key } });
      }
    }
  }
  const codes = [...theme.locales.keys()];
  for (const a of codes) {
    for (const b of codes) {
      if (a === b) continue;
      const A = theme.locales.get(a)!; const B = theme.locales.get(b)!;
      for (const [k, v] of A) {
        if (!B.has(k)) out.push({ check: 'MatchingTranslations', severity: 'warning', message: `"${k}" has no ${b} translation (locales/${b}.json)`, rel: `locales/${a}.json`, offset: v.offset, length: v.length, data: { key: k, value: v.value, to: `locales/${b}.json` } });
      }
    }
  }

  // markup
  for (const [rel, text] of texts) {
    const parsed = parseTemplate(text, rel);
    const visit = (nodes: ReturnType<typeof parseTemplate>['nodes']) => {
      for (const n of nodes) {
        if (n.t === 'el') {
          if (n.tag === 'hk-image' || n.tag === 'img') {
            // alt="" is the HTML way to mark a decorative image, so only a missing alt is flagged
            const alt = n.attrs.find((a) => a.name === 'alt');
            const decorative = n.attrs.some((a) => (a.name === 'role' && a.parts.join('') === 'presentation') || a.name === 'aria-hidden');
            if (!alt && !decorative) out.push({ check: 'ImgAltText', severity: 'warning', message: `<${n.tag}> has no alt text; describe the image, or write alt="" if it is decorative`, rel, line: n.loc.line, col: n.loc.col, data: { tag: n.tag } });
          }
          visit(n.children);
        } else if (n.t === 'if') { n.branches.forEach((b) => visit(b.body)); if (n.else) visit(n.else); }
        else if (n.t === 'for') visit(n.body);
      }
    };
    visit(parsed.nodes);
    for (const s of exprSpans(text)) {
      for (const m of s.body.matchAll(/asset_url\(\s*(['"])([^'"]+)\1/g)) {
        if (!theme.files.includes(`assets/${m[2]}`)) out.push({ check: 'MissingAsset', severity: 'warning', message: `assets/${m[2]} does not exist`, rel, offset: s.start + m.index! + m[0].length - m[2]!.length - 1, length: m[2]!.length });
      }
    }
  }

  // assets
  const warnKb = opts.assetSizeWarnKb ?? 500;
  for (const a of theme.assets) {
    if (a.size > warnKb * 1024 && a.size <= 2 * 1024 * 1024) out.push({ check: 'AssetSize', severity: 'warning', message: `${a.path} is ${Math.round(a.size / 1024)} KB (budget ${warnKb} KB); compress it or serve a smaller file`, rel: a.path, line: 1, col: 1 });
  }

  // snippets
  const rendered = new Set([...all.matchAll(/\{%-?\s*render\s+['"]([\w./-]+)['"]/g)].map((m) => m[1]!));
  for (const s of theme.snippets) if (!rendered.has(s)) out.push({ check: 'OrphanedSnippet', severity: 'hint', message: `snippet "${s}" is never rendered`, rel: `snippets/${s}.sneferu`, line: 1, col: 1 });

  const off = new Set(opts.disabled ?? []);
  return out.filter((f) => !off.has(f.check));
}
