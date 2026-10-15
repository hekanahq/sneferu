import type { FieldSchema, FieldSchemaInput } from './fields';
import type { LabelInput } from './labels';

export interface TagRenderContext {
  /** Stable, unique per rendered instance; used to scope CSS: `.sn-${id}`. */
  id: string;
  css(rule: string): void;
  /**
   * A page-wide constant rule shared by every instance (the icon flip, the visually-hidden
   * helper): written once per page however many tags ask. Optional; fall back to css().
   */
  cssOnce?(rule: string): void;
  controller(name: string): void;
  data: Record<string, unknown>;
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
  t(key: string): string;
  /**
   * A link for this page: store-relative paths get the locale prefix (and the
   * host's store prefix); the result has passed safeUrl.
   */
  url(path: string): string;
  /** The theme's default money format (theme.json `money.format`); absent means 'decimal'. */
  money?: 'decimal' | 'whole';
  /**
   * No argument: the children, except `<hk-part>` markers. With a name: the
   * content of the `<hk-part name="…">` children with that name ('' when none).
   */
  renderChildren(part?: string): string;
}

export interface HkTag {
  name: `hk-${string}`;
  version: number;
  category: 'layout' | 'typography' | 'media' | 'ui' | 'commerce' | 'control';
  props: FieldSchema;
  allowedParents: string[] | '*';
  allowedChildren: string[] | '*';
  /**
   * Named parts the tag places itself (`ctx.renderChildren(name)`). A template
   * fills them with `<hk-part name="…">` as direct children of the tag.
   */
  parts?: string[];
  responsive: string[];
  bindable: string[] | '*';
  render(props: Record<string, unknown>, ctx: TagRenderContext): string;
  controller?: string;
  /**
   * The words the tag prints itself (`ctx.t(key)`), keyed by locale key. The compiler adds the ones a
   * theme's tags use to the artifact's locales (the theme's own text wins), so the merchant can
   * override them per language like any other key.
   */
  strings?: Record<string, { ar: string; en: string }>;
  a11y?: { role?: string; keyboard?: string; labelProp?: string };
  editor: { label: { ar: string; en: string }; group: string; insertable: boolean; privileged?: boolean };
}

/** A tag as written: labels may be "Text", { en } or { ar, en }; register() normalizes them. */
export type HkTagInput = Omit<HkTag, 'props' | 'editor'> & {
  props: FieldSchemaInput | FieldSchema;
  editor: Omit<HkTag['editor'], 'label'> & { label: LabelInput };
};
