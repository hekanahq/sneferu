import { coerceSetting, type Field, type FieldSchema } from './fields';
import { isGroupName, parseTemplateName } from './page-types';

/**
 * The closed list of app blocks. A theme never names a URL: `hk-app-block` takes an `app` and a
 * `block` from this list and the platform prints the frame address stored here.
 *
 * To add a block, add ONE entry to APP_BLOCKS. The tag, the controller, the theme-editor section,
 * the insert-list rules and the reference docs all read this list; no theme needs editing.
 */
export interface AppBlockDef {
  /** The app's catalogue key: the id the platform stores for an installed app. */
  app: string;
  /** The block's id inside the app: lower-case letters, digits and `-`. */
  block: string;
  /** Same-origin path of the framed page. Always under `/hk2/app-block/`. */
  path: string;
  /** Page types (or alternates such as `product.codes`) the block can be placed on. */
  templates: readonly string[];
  /** What the framed page needs from the page: a product, or nothing. */
  context: 'product' | 'none';
  /** Settings the merchant can change. `frame: true` forwards the value to the framed page. */
  settings: Readonly<Record<string, Field & { frame?: boolean }>>;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
}

export const APP_BLOCK_PATH_PREFIX = '/hk2/app-block/';
export const MSG_APP_BLOCK_HEIGHT = 'hk:app-block-height';
export const MSG_APP_BLOCK_UNAVAILABLE = 'hk:app-block-unavailable';

const APP_ID = /^[a-z][a-z0-9_]{0,63}$/;
const BLOCK_ID = /^[a-z][a-z0-9-]{0,63}$/;
const PATH = /^\/hk2\/app-block\/[a-z0-9-]+\/[a-z0-9-]+$/;

const heading: Field = {
  type: 'text',
  label: { ar: 'العنوان', en: 'Heading' },
  localized: true,
  maxLength: 80,
  default: { ar: '', en: '' },
};

export const APP_BLOCKS: readonly AppBlockDef[] = Object.freeze([
  {
    app: 'customer_subscriptions',
    block: 'subscribe',
    path: '/hk2/app-block/subscriptions/subscribe',
    templates: ['product'],
    context: 'product',
    settings: { heading },
    name: { ar: 'اشتراك في المنتج', en: 'Product subscription' },
    description: {
      ar: 'يعرض خطط الاشتراك للمنتج ونموذج الاشتراك. يظهر فقط لو التطبيق مفعّل وفيه خطة للمنتج.',
      en: 'Shows the subscription plans for the product and the subscribe form. Appears only when the app is installed and the product has a plan.',
    },
  },
  {
    app: 'customer_subscriptions',
    block: 'portal',
    path: '/hk2/app-block/subscriptions/portal',
    templates: ['page'],
    context: 'none',
    settings: { heading },
    name: { ar: 'صفحة اشتراكات العميل', en: 'Customer subscriptions' },
    description: {
      ar: 'صفحة العميل لإدارة اشتراكاته، تُفتح من رابط يصله من المتجر.',
      en: "The shopper's own subscriptions page, opened from a link the store sends.",
    },
  },
] satisfies AppBlockDef[]);

/** Looks a block up by app and block id. Anything not on the list is `undefined`. */
export function findAppBlock(app: unknown, block: unknown, list: readonly AppBlockDef[] = APP_BLOCKS): AppBlockDef | undefined {
  if (typeof app !== 'string' || typeof block !== 'string') return undefined;
  return list.find((d) => d.app === app && d.block === block);
}

export const appBlockApps = (list: readonly AppBlockDef[] = APP_BLOCKS): string[] => [...new Set(list.map((d) => d.app))];
export const appBlockIds = (list: readonly AppBlockDef[] = APP_BLOCKS): string[] => [...new Set(list.map((d) => d.block))];

/** Name of the theme-editor section the SDK generates for a block. Never starts with `hk-`. */
export const appBlockSectionType = (d: Pick<AppBlockDef, 'app' | 'block'>): string => `app-${d.app.replace(/_/g, '-')}-${d.block}`;

/** The block a generated section type stands for, or `undefined` for any other section. */
export function appBlockOfSection(type: unknown, list: readonly AppBlockDef[] = APP_BLOCKS): AppBlockDef | undefined {
  return typeof type === 'string' ? list.find((d) => appBlockSectionType(d) === type) : undefined;
}

/**
 * Whether a section may be offered to a store that has these apps installed. A section that is not
 * an app block is always offered.
 */
export function appBlockAvailable(type: unknown, installed: Iterable<string>, list: readonly AppBlockDef[] = APP_BLOCKS): boolean {
  const d = appBlockOfSection(type, list);
  if (!d) return true;
  for (const a of installed) if (a === d.app) return true;
  return false;
}

/** Checks a list: ids, paths, templates, labels. Returns the problems; empty means valid. */
export function validateAppBlocks(list: readonly AppBlockDef[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of list) {
    const key = `${d.app}:${d.block}`;
    if (!APP_ID.test(d.app)) out.push(`${key}: app id must match ${APP_ID}`);
    if (!BLOCK_ID.test(d.block)) out.push(`${key}: block id must match ${BLOCK_ID}`);
    if (seen.has(key)) out.push(`${key}: listed twice`);
    seen.add(key);
    if (!PATH.test(d.path)) out.push(`${key}: path must match ${PATH}`);
    if (d.templates.length === 0) out.push(`${key}: needs at least one template`);
    for (const t of d.templates) if (!parseTemplateName(t) && !isGroupName(t)) out.push(`${key}: '${t}' is not a page type`);
    if (!d.name.ar || !d.name.en) out.push(`${key}: name needs ar and en`);
    if (!d.description.ar || !d.description.en) out.push(`${key}: description needs ar and en`);
    for (const [k, f] of Object.entries(d.settings)) if (!f.label?.ar || !f.label?.en) out.push(`${key}: setting ${k} needs an ar and en label`);
  }
  return out;
}

/**
 * Keeps only the settings the entry declares, coerced to their declared type and limits. Unknown keys
 * are dropped, so a theme cannot pass an arbitrary value through to the framed page.
 */
export function appBlockSettings(d: AppBlockDef, raw: unknown, locale: 'ar' | 'en'): Record<string, unknown> {
  const src = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(d.settings)) {
    const v = coerceSetting(f, Object.hasOwn(src, k) ? src[k] : undefined, locale);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** The settings that go to the framed page as `s_<key>` query parameters, as a query string without `?`. */
export function appBlockFrameQuery(d: AppBlockDef, settings: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, f] of Object.entries(d.settings)) {
    if (!f.frame) continue;
    const v = settings[k];
    if (v === undefined || v === null || v === '') continue;
    parts.push(`s_${k}=${encodeURIComponent(String(v))}`);
  }
  return parts.join('&');
}

/** The settings schema of the editor section: the entry's settings plus the spacing every block has. */
export function appBlockSectionSettings(d: AppBlockDef): FieldSchema {
  const own: FieldSchema = {};
  for (const [k, f] of Object.entries(d.settings)) {
    const { frame: _frame, ...field } = f;
    own[k] = field;
  }
  return {
    ...own,
    padding_y: { type: 'range', label: { ar: 'المسافة الرأسية', en: 'Vertical spacing' }, min: 0, max: 80, step: 4, default: 16 },
  };
}
