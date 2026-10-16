import { coerceSetting, err, escapeAttr, isGroupName, isMoneyFormat, parseTemplateName, safeToken, sectionAllowedOn, safeUrl, toStr, validateIR, type Diagnostic, type FieldSchema, type GroupName, type IRNode, type LocaleOverrides, type PageNode, type SectionGroups, type TagRegistry, type ThemeLocalization, type ThemeRequest } from '@hekana/sneferu-core';
import type { RenderContext, Scope } from './context';
import { Budget, own, renderNodes, type Env } from './render';
import { resolveUrl } from './url';

/** The fallback cart link: a round button at the inline end, in the theme's own colours. */
const CART_FAB_CSS = '.sn-cart-fab{position:fixed;inset-block-end:16px;inset-inline-end:16px;z-index:40;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:48px;min-height:48px;padding:0 12px;border-radius:999px;background:var(--hk-color-primary,#111);color:var(--hk-color-background,#fff);text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.2)}.sn-cart-fab svg{width:20px;height:20px}';
import type { Limits } from './budget';
import { checkArtifactShape } from './shape';
import { themeTokenCss } from './tokens';
import { themeFontCss } from './fonts';
import { bindMenuRequest } from './menus';

interface Schemaed { ir: IRNode[]; schema: { settings: FieldSchema } }
interface DefaultSection { type: string; settings: Record<string, unknown>; hidden?: boolean; blocks?: DefaultSection[] }
export interface ArtifactLike {
  manifest: { id: string; settings?: FieldSchema; defaultLocale?: string; tokens?: unknown; money?: unknown; locales?: string[] };
  layout: IRNode[];
  templates: Record<string, IRNode[]>;
  templateSections: Record<string, DefaultSection[]>;
  /** Default trees of the shared groups (artifacts built before 0.4 have none). */
  groups?: Partial<Record<GroupName, PageNode[]>>;
  /** The keys `locale_overrides` may set (artifacts built before 0.4 have none: the keys of the locale files apply). */
  localeKeys?: string[];
  /** Set when the SDK's default store filled in templates or groups: its `hk-` sections and its stylesheet. */
  defaults?: { templates: string[]; groups: GroupName[]; sections: string[]; css: string };
  sections: Record<string, Schemaed & { schema: { name?: unknown; version?: number; settings: FieldSchema } }>;
  blocks: Record<string, Schemaed>;
  snippets: Record<string, IRNode[]>;
}
export type { PageNode };
export interface RenderResult {
  html: string;
  /** Component CSS for this page, plus the default store's stylesheet when the page uses it. */
  css: string;
  controllers: string[];
  diagnostics: Diagnostic[];
  /** The theme's tokens as CSS custom properties on `[data-hk-theme]`, from the resolved theme settings. */
  tokenCss: string;
  /** Font-face rules and font variables for the page's language (needs `fontBase` for the files). */
  fontCss: string;
}
export interface RenderOptions {
  template: string; sections?: PageNode[]; ctx: RenderContext; registry: TagRegistry; limits?: Limits;
  /**
   * The page's data, by page type: `product` (product), `collection` + `paginate` (collection),
   * `search` + `paginate` (search), `page` (page). See the context types in @hekana/sneferu-core.
   */
  scope?: Scope;
  /**
   * The shared section groups (header, footer, announcement) the merchant edited, rendered wherever the layout
   * places `<hk-section-group>`. A group that is absent uses the theme's defaults; `[]` renders nothing.
   */
  groups?: SectionGroups;
  /** The merchant's text for locale keys, per language. Only keys in the artifact's `localeKeys` apply (at most 500, 500 characters each). */
  locale_overrides?: LocaleOverrides;
  /** Where font files are served (`/hk2/fonts/`); without it `fontCss` carries the variables but no @font-face. */
  fontBase?: string;
  /** The request: `path` becomes `request.path` (a site-relative path, else ''). */
  request?: { path?: string };
  /** The same page in the other language: `alternateUrl` becomes `localization.alternate_url` (checked with safeUrl). */
  localization?: { alternateUrl?: string };
  /**
   * Keep the cart working when the page rendered no cart drawer (a header removed, hidden or
   * customised without one): append the standard drawer, and a small cart link when the page
   * has no cart opener either. Off by default; hosts turn it on for store pages.
   */
  cartFallback?: boolean | { label?: string };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const TEXTY = new Set<string>(['text', 'textarea', 'rich_text']);
export const settingsFor = (schema: FieldSchema, props: unknown, locale: 'ar' | 'en') => {
  // defaults go through coerceSetting too, so a localized { ar, en } default resolves
  // a localized text field always resolves to a string, '' when it has neither value nor default
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(schema)) if (f.default !== undefined || (f.localized && TEXTY.has(f.type))) out[k] = coerceSetting(f, undefined, locale);
  if (!isObj(props)) return out;
  for (const [k, f] of Object.entries(schema)) if (Object.hasOwn(props, k) && props[k] !== undefined) out[k] = coerceSetting(f, props[k], locale);
  return out;
};
const LOCALE = /^[a-z]{2}$/;
const MAX_GROUP_NODES = 24;
const PREPARED = new WeakMap<object, TagRegistry>();
const deepFreeze = <T>(v: T): T => {
  if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) { Object.freeze(v); for (const x of Object.values(v)) deepFreeze(x); }
  return v;
};
/** Whether a (validated) tree places a section group anywhere in it. */
const hasGroupTag = (nodes: IRNode[], d = 0): boolean => d <= 128 && nodes.some((n) => {
  switch (n.k) {
    case 'comp': return n.tag === 'hk-section-group' || hasGroupTag(n.children, d + 1);
    case 'el': return hasGroupTag(n.children, d + 1);
    case 'if': return n.branches.some((b) => hasGroupTag(b.body, d + 1)) || (n.else !== undefined && hasGroupTag(n.else, d + 1));
    case 'loop': return hasGroupTag(n.body, d + 1);
    default: return false;
  }
});
const validateTrees = (artifact: ArtifactLike, registry: TagRegistry): Diagnostic[] => {
  const known = new Set([...registry.names(), 'hk-block', 'hk-part']);
  const out = validateIR(artifact.layout, known);
  const named = (key: string, rec: Record<string, IRNode[]>): [string, IRNode[]][] => Object.entries(rec).map(([k, t]) => [`${key}.${k}`, t]);
  const trees: [string, IRNode[]][] = [...named('templates', artifact.templates), ...named('snippets', artifact.snippets),
    ...named('sections', Object.fromEntries(Object.entries(artifact.sections).map(([k, s]) => [k, s.ir]))),
    ...named('blocks', Object.fromEntries(Object.entries(artifact.blocks).map(([k, b]) => [k, b.ir])))];
  for (const [where, t] of trees) {
    const bad = validateIR(t, known);
    out.push(...bad);
    // a section group renders sections: placed anywhere but the layout, a group's section could render its own group
    if (!bad.length && hasGroupTag(t)) out.push(err('SN9016', `artifact ${where} places <hk-section-group>, which belongs in the layout only`));
  }
  return out;
};
/** Section ids become part of component class names: one safe token. */
const sectionToken = (id: unknown) => safeToken(toStr(id)).replace(/ /g, '-');

/**
 * Validate a stored artifact once (shape + IR) and return a frozen copy that
 * renderPage trusts without re-validating, as long as the same registry is used.
 */
export function prepareArtifact(artifact: unknown, registry: TagRegistry): { ok: boolean; diagnostics: Diagnostic[]; artifact?: ArtifactLike } {
  try {
    const first = checkArtifactShape(artifact);
    if (first.length) return { ok: false, diagnostics: first };
    const copy = JSON.parse(JSON.stringify(artifact)) as ArtifactLike;
    const diagnostics = [...checkArtifactShape(copy), ...validateTrees(copy, registry)];
    if (diagnostics.length) return { ok: false, diagnostics };
    deepFreeze(copy);
    PREPARED.set(copy, registry);
    return { ok: true, diagnostics: [], artifact: copy };
  } catch (e) {
    return { ok: false, diagnostics: [err('SN9015', `artifact could not be prepared: ${(e as Error)?.message ?? String(e)}`)] };
  }
}

const OVERRIDE_KEY = /^[A-Za-z0-9_.-]{1,80}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const MAX_LOCALE_OVERRIDES = 500;
export const MAX_OVERRIDE_CHARS = 500;
/**
 * The page language's translations with the merchant's overrides on top. An override applies only for a key the
 * artifact lists (localeKeys; without that list, a key one of the locale files has). The result has no prototype.
 */
function withOverrides(artifact: ArtifactLike, ctx: RenderContext, overrides: unknown, locale: 'ar' | 'en'): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  for (const [k, v] of Object.entries(ctx.translations ?? {})) if (typeof v === 'string') out[k] = v;
  const mine = isObj(overrides) && Object.hasOwn(overrides, locale) ? (overrides as Record<string, unknown>)[locale] : undefined;
  if (!isObj(mine)) return out;
  const known = Array.isArray(artifact.localeKeys) ? new Set(artifact.localeKeys.filter((k): k is string => typeof k === 'string')) : undefined;
  let n = 0;
  for (const [k, v] of Object.entries(mine)) {
    if (n++ >= MAX_LOCALE_OVERRIDES) break;
    if (typeof v !== 'string' || !OVERRIDE_KEY.test(k) || UNSAFE_KEYS.has(k)) continue;
    const listed = known ? known.has(k) : Object.hasOwn(out, k) || Object.hasOwn(ctx.fallbackTranslations ?? {}, k);
    if (listed) out[k] = v.replace(CONTROL, '').slice(0, MAX_OVERRIDE_CHARS);
  }
  return out;
}

/** `request` and `localization`: built here, frozen, and not overridable by the host's scope. */
function pageObjects(opts: RenderOptions, manifest: ArtifactLike['manifest'], locale: 'ar' | 'en'): { request: ThemeRequest; localization: ThemeLocalization } {
  const raw = opts.request?.path;
  const path = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && raw.length <= 2000 && !/[\u0000-\u001F\u007F\\]/.test(raw) ? raw : '';
  const other: 'ar' | 'en' = locale === 'ar' ? 'en' : 'ar';
  const locales = (manifest as { locales?: unknown }).locales;
  const ships = !Array.isArray(locales) || locales.includes(other);
  const alt = opts.localization?.alternateUrl;
  const altUrl = ships && typeof alt === 'string' && alt !== '' ? safeUrl(alt) : '';
  return {
    request: Object.freeze({ path, page_type: parseTemplateName(opts.template)?.type ?? opts.template, locale }),
    localization: Object.freeze({ locale, alternate_locale: ships ? other : null, alternate_url: altUrl === '#' ? '' : altUrl }),
  };
}

const failed = (diagnostics: Diagnostic[]): RenderResult => ({ html: '', css: '', controllers: [], diagnostics, tokenCss: '', fontCss: '' });

/** Renders a page. Never throws: malformed artifacts or page data come back as diagnostics. */
export function renderPage(artifact: ArtifactLike, opts: RenderOptions): RenderResult {
  try {
    return render(artifact, opts);
  } catch (e) {
    return failed([err('SN9015', `render failed: ${(e as Error)?.message ?? String(e)}`)]);
  }
}

function render(artifact: ArtifactLike, opts: RenderOptions): RenderResult {
  if (PREPARED.get(artifact) !== opts.registry) {
    const shape = checkArtifactShape(artifact);
    if (shape.length) return failed(shape);
    const bad = validateTrees(artifact, opts.registry);
    if (bad.length) return failed(bad);
  }

  const template = own(artifact.templates, opts.template);
  if (!template) return failed([err('SN4010', `template '${opts.template}' not found`)]);

  // dir is derived from the locale, never taken from the caller, and both are validated
  const fallback = (artifact.manifest as { defaultLocale?: unknown }).defaultLocale;
  const locale = (LOCALE.test(String(opts.ctx.locale)) ? opts.ctx.locale : LOCALE.test(String(fallback)) ? fallback : 'ar') as RenderContext['locale'];
  const dir: RenderContext['dir'] = locale === 'ar' ? 'rtl' : 'ltr';
  const themeSettings = (artifact.manifest as { settings?: unknown }).settings;
  const settings = isObj(themeSettings) ? settingsFor(themeSettings as FieldSchema, opts.ctx.settings, locale) : opts.ctx.settings;
  // theme.json money.format is the theme's default; a host value is used only when the theme has none
  const mf = isObj(artifact.manifest.money) ? artifact.manifest.money.format : undefined;
  const money = isMoneyFormat(mf) ? mf : isMoneyFormat(opts.ctx.money) ? opts.ctx.money : undefined;
  const ctx: RenderContext = { ...opts.ctx, locale, dir, settings, money, translations: withOverrides(artifact, opts.ctx, opts.locale_overrides, locale) };
  const env: Env = { ctx, registry: opts.registry, snippets: artifact.snippets, slots: {}, budget: new Budget(opts.limits), css: [], cssOnce: new Set(), controllers: new Set(), diagnostics: [], ids: { n: 0 }, depth: 0, include: 0 };
  const page = pageObjects(opts, artifact.manifest, locale);
  bindMenuRequest(ctx, page.request.path, locale);
  const base: Scope = { ...(opts.scope ?? {}), store: ctx.store, locale, dir, ...page };

  /** A default entry as a page node; its blocks (and theirs) keep ids `default-i-j-k`. The renderer reads two levels under a section. */
  const seed = (e: DefaultSection, id: string, depth = 0): PageNode => ({ id, type: e.type, props: e.settings, ...(depth < 2 && Array.isArray(e.blocks) ? { children: e.blocks.filter(isObj).map((b, j) => seed(b as DefaultSection, `${id}-${j}`, depth + 1)) } : {}) });
  const sections: PageNode[] = Array.isArray(opts.sections) ? opts.sections : (own(artifact.templateSections, opts.template) ?? []).map((s, i) => seed(s, `default-${i}`));

  const defaultSections = new Set<string>(Array.isArray(artifact.defaults?.sections) ? artifact.defaults!.sections.filter((x): x is string => typeof x === 'string') : []);
  let usedDefaults = false;
  const MAX_BLOCKS = 100;
  /** Blocks of a section or block: hidden ones skipped, nested blocks (one more level) under `blocks`. */
  const toBlocks = (list: unknown, depth: number): { id: unknown; type: string; settings: Record<string, unknown>; blocks: unknown[] }[] =>
    (Array.isArray(list) ? list : []).filter((c): c is PageNode => isObj(c) && typeof c.type === 'string' && !c.hidden).slice(0, MAX_BLOCKS)
      .map((c) => ({ id: c.id, type: c.type, settings: settingsFor(own(artifact.blocks, c.type)?.schema.settings ?? {}, c.props, locale), blocks: depth < 2 ? toBlocks(c.children, depth + 1) : [] }));

  const renderSection = (node: PageNode, idPrefix = ''): string => {
    if (!isObj(node) || typeof node.type !== 'string') { env.diagnostics.push(err('SN4011', 'page section is malformed')); return '<!-- section unavailable -->'; }
    const def = own(artifact.sections, node.type);
    if (!def) { env.diagnostics.push(err('SN4011', `section '${node.type}' is not in this theme`)); return `<!-- section ${escapeAttr(toStr(node.id))} unavailable -->`; }
    if (defaultSections.has(node.type)) usedDefaults = true;
    const blocks = toBlocks(node.children, 1);
    const scope: Scope = { ...base, section: { id: node.id, type: node.type, settings: settingsFor(def.schema.settings, node.props, locale), blocks } };
    const unavailable = `<!-- section ${escapeAttr(toStr(node.id))} unavailable -->`;
    if (env.budget.exceeded) return unavailable;
    // each section renders against what is left of the page budget, so one runaway
    // section degrades alone and the surrounding layout stays balanced
    const sub = env.budget.child();
    const html = renderNodes(def.ir, scope, { ...env, budget: sub, slots: {}, depth: 0, ids: { n: 0, prefix: `${idPrefix}s-${sectionToken(node.id)}-` } });
    if (sub.exceeded) { env.budget.absorbFailed(sub); return unavailable; }
    const out = `<div data-hk-section="${escapeAttr(toStr(node.id))}">${html}</div>`;
    env.budget.absorb(sub, out.length);
    if (env.budget.exceeded && !env.budget.reported) { env.budget.reported = true; env.diagnostics.push(err('SN4001', `render stopped: ${env.budget.exceeded} budget exceeded`)); }
    return out;
  };

  /** A shared group's sections: the merchant's tree when given, else the theme's default; nothing when neither exists or it is empty. */
  const renderGroup = (name: string): string => {
    if (!isGroupName(name)) return '';
    const given = opts.groups && isObj(opts.groups) && Object.hasOwn(opts.groups, name) ? opts.groups[name] : undefined;
    const nodes = Array.isArray(given) ? given : given === undefined ? own(artifact.groups as Record<string, PageNode[]> | undefined, name) : undefined;
    if (!Array.isArray(nodes)) return '';
    const inner = nodes.filter((s) => !(isObj(s) && s.hidden)).slice(0, MAX_GROUP_NODES).map((s) => {
      const def = isObj(s) && typeof s.type === 'string' ? own(artifact.sections, s.type) : undefined;
      if (def && !sectionAllowedOn(def.schema as { templates?: readonly string[] }, name)) {
        env.diagnostics.push(err('SN4014', `section '${s.type}' is not allowed in the ${name} group; skipped`));
        return '';
      }
      return renderSection(s, `g-${name}-`);
    }).join('');
    return inner === '' ? '' : `<div data-hk-group="${name}">${inner}</div>`;
  };

  env.blocks = artifact.blocks;

  const content = () => renderNodes(template, base, { ...env, slots: { sections: () => sections.filter((s) => !(isObj(s) && s.hidden)).map((s) => renderSection(s)).join('') } });
  // only the layout places section groups; sections, templates and snippets rendered from here get no group renderer
  const inner = renderNodes(artifact.layout, base, { ...env, slots: { content }, group: renderGroup });
  const cartFallback = (rendered: string): string => {
    if (!opts.cartFallback || env.controllers.has('cart-drawer') || !opts.registry.get('hk-cart-drawer')) return '';
    const comp = (tag: string, props: Record<string, string> = {}, children: IRNode[] = []): IRNode =>
      ({ k: 'comp', tag, props: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { k: 'static', v }])), children });
    const label = typeof opts.cartFallback === 'object' && typeof opts.cartFallback.label === 'string' && opts.cartFallback.label ? opts.cartFallback.label : 'Cart';
    const opener: IRNode[] = rendered.includes('data-hk-open="cart-drawer"') ? [] : [
      { k: 'html', s: `<a class="sn-cart-fab" href="${escapeAttr(resolveUrl(ctx, '/cart'))}" data-hk-open="cart-drawer" aria-label="${escapeAttr(label)}">` },
      ...(opts.registry.get('hk-icon') ? [comp('hk-icon', { name: 'shopping-cart' })] : []),
      ...(opts.registry.get('hk-cart-count') ? [comp('hk-cart-count')] : []),
      { k: 'html', s: '</a>' },
    ];
    if (opener.length) env.css.push(CART_FAB_CSS);
    const drawer = comp('hk-cart-drawer', {}, ['hk-cart-items', 'hk-cart-summary'].filter((t) => opts.registry.get(t)).map((t) => comp(t)));
    return `<div data-hk-cart-fallback>${renderNodes([...opener, drawer], base, { ...env, slots: {} })}</div>`;
  };
  const html = `<div data-hk-theme="${escapeAttr(artifact.manifest.id)}" dir="${escapeAttr(dir)}" lang="${escapeAttr(locale)}">${inner}${cartFallback(inner)}</div>`;
  const css = env.css.join('\n');
  const ownsPage = Array.isArray(artifact.defaults?.templates) && artifact.defaults!.templates.includes(opts.template);
  const manifestLike = artifact.manifest as { id: string; tokens?: unknown };
  return {
    html, controllers: [...env.controllers], diagnostics: env.diagnostics,
    css: (ownsPage || usedDefaults) && typeof artifact.defaults?.css === 'string' ? `${artifact.defaults.css}\n${css}` : css,
    tokenCss: themeTokenCss(manifestLike, settings), fontCss: themeFontCss(manifestLike, locale, opts.fontBase ?? '', settings),
  };
}
