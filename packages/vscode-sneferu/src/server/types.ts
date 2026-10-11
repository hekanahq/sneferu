export interface PropDoc {
  name: string;
  attr: string;
  type: string;
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: string[];
  responsive: boolean;
  required?: boolean;
}
export interface TagDoc {
  name: string;
  category: string;
  label: string;
  doc?: string;
  allowedChildren: string[] | '*';
  /** Part of the language (hk-schema, hk-slot, hk-sections, hk-block), not the tag registry. */
  builtin: boolean;
  props: PropDoc[];
}
export interface LangData {
  tags: TagDoc[];
  filters: { name: string; doc: string; input?: string; args?: string }[];
  lookups: { name: string; signature: string; doc: string }[];
  scope: { name: string; where: string; doc: string; properties: string[] }[];
  productFields: { name: string; doc: string }[];
  fieldTypes: { name: string; doc: string }[];
  /** Keys a schema field may have: type, label, default … */
  fieldKeys: string[];
  diagnostics: { code: string; meaning: string; fix: string }[];
}

export const DOCS = 'https://hekana.dev';
export const diagnosticUrl = (code: string) => `${DOCS}/reference/diagnostics#${code}`;
export const tagUrl = (tag: string) => `${DOCS}/reference/tags#${tag}`;
export const checkUrl = (name: string) => `${DOCS}/guide/vscode#${name.toLowerCase()}`;
