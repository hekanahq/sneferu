import type { FieldSchema, FieldSchemaInput } from './fields';
import type { LabelInput } from './labels';

export interface TagRenderContext {
  /** Stable, unique per rendered instance; used to scope CSS: `.sn-${id}`. */
  id: string;
  css(rule: string): void;
  controller(name: string): void;
  data: Record<string, unknown>;
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
  t(key: string): string;
  renderChildren(): string;
}

export interface HkTag {
  name: `hk-${string}`;
  version: number;
  category: 'layout' | 'typography' | 'media' | 'ui' | 'commerce' | 'checkout' | 'control';
  props: FieldSchema;
  allowedParents: string[] | '*';
  allowedChildren: string[] | '*';
  responsive: string[];
  bindable: string[] | '*';
  render(props: Record<string, unknown>, ctx: TagRenderContext): string;
  controller?: string;
  a11y?: { role?: string; keyboard?: string; labelProp?: string };
  editor: { label: { ar: string; en: string }; group: string; insertable: boolean; privileged?: boolean };
}

/** A tag as written: labels may be "Text", { en } or { ar, en }; register() normalizes them. */
export type HkTagInput = Omit<HkTag, 'props' | 'editor'> & {
  props: FieldSchemaInput | FieldSchema;
  editor: Omit<HkTag['editor'], 'label'> & { label: LabelInput };
};
