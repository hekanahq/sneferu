import type { SchemaField } from './theme';
import { diagnosticUrl, tagUrl, DOCS, type LangData, type PropDoc, type TagDoc } from './types';

const fmt = (v: unknown) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));

function range(p: PropDoc): string {
  const bits: string[] = [];
  if (p.options?.length) bits.push(p.options.map((o) => `\`${o}\``).join(' · '));
  if (p.min !== undefined || p.max !== undefined) bits.push(`${p.min ?? ''}–${p.max ?? ''}`);
  if (p.default !== undefined) bits.push(`default ${fmt(p.default)}`);
  if (p.responsive) bits.push('responsive');
  if (p.required) bits.push('**required**');
  return bits.join(', ');
}

export function tagDoc(t: TagDoc, _data: LangData): string {
  const lines = [`\`<${t.name}>\` · ${t.label} _(${t.category})_`, ''];
  if (t.doc) lines.push(t.doc, '');
  if (t.props.length) {
    lines.push('| Attribute | Type | Values |', '| - | - | - |');
    for (const p of t.props) lines.push(`| \`${p.attr}\` | ${p.type} | ${range(p).replace(/\|/g, '\\|')} |`);
    lines.push('');
  }
  if (!t.builtin) {
    const kids = t.allowedChildren === '*' ? 'any' : t.allowedChildren.length ? t.allowedChildren.map((c) => `\`${c}\``).join(', ') : 'none (self-closing)';
    lines.push(`Children: ${kids}`, '', `[Tag reference](${tagUrl(t.name)})`);
  } else {
    lines.push(`[Language reference](${DOCS}/reference/language#directives)`);
  }
  return lines.join('\n');
}

export function propDoc(t: TagDoc, p: PropDoc): string {
  const extra = range(p);
  return [`**${p.attr}** on \`<${t.name}>\` · ${p.label}`, '', `Type: \`${p.type}\`${extra ? `, ${extra}` : ''}`,
    p.responsive ? `\nAlso \`tablet-${p.attr}\` (≤ 1023px) and \`mobile-${p.attr}\` (≤ 639px).` : '',
    p.type === 'color' ? '\nA `#hex` colour or `theme:<token>` (e.g. `theme:accent`).' : '',
    '', `[Tag reference](${tagUrl(t.name)})`].join('\n');
}

export function fieldDoc(f: SchemaField): string {
  const label = typeof f.label === 'string' ? f.label : f.label && typeof f.label === 'object' ? Object.entries(f.label as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '';
  const bits = [`**${f.key}** · setting${f.type ? ` (\`${f.type}\`)` : ''}`];
  if (label) bits.push(`Label: ${label}`);
  if (f.default !== undefined) bits.push(`Default: \`${fmt(f.default)}\``);
  if (Array.isArray(f.options)) bits.push(`Options: ${f.options.map((o) => `\`${typeof o === 'object' && o ? String((o as { value?: unknown }).value ?? JSON.stringify(o)) : String(o)}\``).join(', ')}`);
  return bits.join('  \n');
}

export function filterDoc(data: LangData, name: string): string | undefined {
  const f = data.filters.find((x) => x.name === name);
  if (!f) return undefined;
  return [`**${f.name}** · filter`, '', f.doc, f.input ? `\nInput: ${f.input}` : '', f.args && f.args !== 'none' ? `  \nArguments: ${f.args}` : '', '', `[Filters](${DOCS}/reference/language#filters)`].join('\n');
}

export function lookupDoc(data: LangData, name: string): string | undefined {
  const l = data.lookups.find((x) => x.name === name);
  return l && [`**${l.signature}** · lookup`, '', l.doc, '', `Lookups take literal arguments only. [Lookups](${DOCS}/reference/language#lookups)`].join('\n');
}

export function scopeDoc(data: LangData, name: string): string | undefined {
  const s = data.scope.find((x) => x.name === name);
  return s && [`**${s.name}** · ${s.where}`, '', s.doc].join('\n');
}

export function codeDoc(data: LangData, code: string): string | undefined {
  const d = data.diagnostics.find((x) => x.code === code);
  return d && `**${d.code}** ${d.meaning}\n\nFix: ${d.fix}\n\n[${d.code}](${diagnosticUrl(d.code)})`;
}
