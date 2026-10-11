# Sneferu vs Shopify themes: parity check and gap list

Date: 2026-10-12. Compared: Shopify's theme platform as documented on
shopify.dev (Online Store 2.0, theme blocks, Shopify CLI 3, Theme Check) against
Sneferu as it is on `main` of `Mostafa-M-Hussein/sneferu` (`e45a4f9`,
`@hekana/sneferu` 0.2.0 on npm) and the HK2 code on Hekana `master` (API
`apps/api/src/hk2`, storefront `apps/storefront/src/lib/hk2.ts`, builder
`apps/dashboard/app/(dashboard)/design/hk2`).

Every Sneferu status below was checked in the code, not taken from the spec.
Where the spec (`docs/superpowers/specs/2026-10-10-hekana-theme-engine-2-design.md`)
plans something that is not built, the row says "missing" and names the phase.

Work already under way is marked **in progress**, not missing:

- **Sneferu 0.3**: theme assets served on the platform, fonts, product
  description and badges, a `collection` setting usable in templates,
  per-locale settings, locale-aware links, `money` for whole pounds, `hk-icon`,
  a search form.
- **Phase 2**: product, collection, search, cart and 404 templates; variant
  picker; add-to-cart; cart drawer.
- **VS Code extension** (another agent).

## The short answer

The owner's instinct is right. Sneferu is a solid, safe *rendering language*
for one page (the home page), but a Shopify theme is much more than a
language: it is the whole storefront (every page type, header and footer the
merchant can edit, menus, forms, pagination, filters, interactivity) plus the
tooling around it (real store data in `dev`, a linter with best-practice rules,
a published review checklist, theme updates that keep merchant settings).

The biggest things missing, beyond what 0.3 and Phase 2 already cover:

1. **Header and footer the merchant can edit.** In Shopify they are section
   groups. In Sneferu the layout is fixed markup, so a merchant cannot change
   the announcement bar, the logo position or the footer columns.
2. **Menus.** Hekana has a navigation API (`apps/api/src/navigation`), but
   Sneferu exposes no menu object and no menu setting, so every theme hard-codes
   its links.
3. **Responsive images.** `img: 400` is accepted but the storefront ignores the
   width (`imageRefUrl` returns the original URL) and `hk-image` emits no
   `srcset`. Every product photo is served full size.
4. **Interactivity.** No theme JavaScript, and none of the planned
   controllers (tabs, accordion, carousel, modal) exist. The cart drawer and
   variant picker are the only ones in progress.
5. **Forms.** No newsletter, contact or account forms, although Hekana has a
   newsletter API.
6. **Theme updates.** Versions are immutable and rollback exists, but moving an
   installed store to a newer version of the same theme (keeping the merchant's
   settings, running `migrations/*.json`) is not built.
7. **Builder gaps.** Section presets are stored but the Add Section dialog
   ignores them; six of the sixteen field types (`rich_text`, `video`,
   `product`, `icon`, `spacing`, `typography`) have no editor in the builder.
8. **Tooling.** `validate` checks syntax and safety only (77 codes); Shopify's
   Theme Check also lints for performance, accessibility and translations.
   There is no `pull`, no `dev` against a real store, no published review
   checklist, no complete reference theme like Dawn.

## Legend

| Status | Meaning |
| - | - |
| have | built and usable now |
| partial | some of it exists; the note says what is missing |
| in progress | in the 0.3 / Phase 2 / VS Code work listed above |
| missing | not built (the note names the spec phase if it is planned) |
| n/a | not applicable to Hekana, or deliberately different |

| Priority | Meaning |
| - | - |
| P0 | needed before real merchants run a Sneferu theme |
| P1 | needed before outside developers sell themes |
| P2 | worth doing later |
| skip | do not build |

## The matrix

### A. Theme architecture

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Theme folder structure (layout, templates, sections, blocks, snippets, assets, config, locales) | have | Same seven roles; `theme.json` replaces `config/`. Folders one level deep except `assets/` | - | https://shopify.dev/docs/storefronts/themes/architecture |
| Layouts (`theme.liquid`, `content_for_layout`) | have | `layout/theme.sneferu` with `<hk-slot name="content" />` | - | https://shopify.dev/docs/storefronts/themes/architecture/layouts |
| `content_for_header` / theme owns `<head>` | n/a | The platform owns `<head>` (`Hk2Layout.astro`): title, meta, canonical, hreflang, OG, JSON-LD, tracking. Safer; keep it | - | https://shopify.dev/docs/api/liquid/objects/content_for_header |
| Alternate layouts (`{% layout 'x' %}`, e.g. a minimal checkout/landing layout) | missing | One layout per theme | P2 | https://shopify.dev/docs/storefronts/themes/architecture/layouts |
| Password layout / page | missing | Hekana has `coming-soon.astro`; it is not themable | P2 | https://shopify.dev/docs/storefronts/themes/architecture/templates/password |
| JSON templates (template = ordered list of sections the merchant edits) | have | `templates/*.sneferu` with `<hk-sections />` + `<hk-schema>{"sections":[…]}`; the merchant's saved page replaces the defaults | - | https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates |
| Template default sections with blocks | missing | Defaults cannot list blocks (GAPS #4), so a fresh install shows block sections empty | P0 | https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates |
| Template types beyond home (product, collection, list-collections, page, search, cart, 404, …) | in progress | Only `index` is served (`renderPage(…, { template: 'index' })`). Phase 2 adds product, collection, search, cart, 404. Still missing after Phase 2: `page` (merchant pages `p/[slug]`), `list-collections`, `gift_card`, `password`, customer pages | P0 (page), P2 (rest) | https://shopify.dev/docs/storefronts/themes/architecture/templates |
| Alternate templates (`product.codes.json`, assigned per product) | missing | Spec §11 has `template_assignments`; not in the Phase 2 work. Hekana needs it: a digital-codes product page differs from a physical one | P1 | https://shopify.dev/docs/storefronts/themes/architecture/templates/alternate-templates |
| Metaobject templates (a page per metaobject entry) | n/a | Hekana has no metaobjects | skip | https://shopify.dev/docs/storefronts/themes/architecture/templates/metaobject |
| `robots.txt`, `llms.txt`, `agents.md` templates (store description for search engines and AI agents) | n/a (platform) | Hekana already serves `robots.txt`, `llms.txt`, `llms-full.txt` and `.well-known/mcp.json` from the platform for every store. Keep them platform-owned | skip | https://shopify.dev/docs/storefronts/themes/architecture/templates/agents-md-liquid |
| Sections with `{% schema %}` (settings, blocks, presets) | have | `<hk-schema>` JSON: `name`, `version`, `settings`, `blocks.allowed/max`, `presets` | - | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema |
| Section `presets` (add from the editor with starting blocks) | partial | Accepted and stored, but the builder's Add Section dialog lists names only and ignores presets (`AddSectionDialog.tsx`) | P0 | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#presets |
| Section `default` (statically rendered section) | n/a | No static `{% section %}` rendering; layouts are fixed markup instead | - | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#default |
| `enabled_on` / `disabled_on` (limit where a section can be added) | missing | Every section is offered on every page; matters once there are product/cart pages and header/footer groups | P1 | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#enabled_on |
| Section `limit` (at most N per page) | missing | Platform caps 60 sections/page only | P2 | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#limit |
| Section `tag` / `class` (wrapper element) | partial | Wrapper is always `<div data-hk-section>`; a section can render its own `<section>` inside | skip | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#tag |
| Section groups (header, footer, aside: sections the merchant edits on every page) | missing | Layout is static markup; header and footer are not editable by the merchant. Spec Phase 5 | P0 | https://shopify.dev/docs/storefronts/themes/architecture/section-groups |
| Section blocks (`blocks` in a section schema) | have | `blocks/*.sneferu` files, `blocks.allowed`, `blocks.max`, `<hk-block of>` | - | https://shopify.dev/docs/storefronts/themes/architecture/blocks |
| Theme blocks (reusable `blocks/` files across sections) | have | Sneferu blocks are already theme-level files any section can allow | - | https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks |
| Nested blocks (blocks inside blocks, `content_for 'blocks'`) | missing | A block cannot hold child blocks; needed for e.g. a slide with buttons, a column with items | P1 | https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema |
| Static blocks (`content_for 'block'`, fixed block the merchant can style but not remove) | missing | | P2 | https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/static-blocks |
| `@theme` / `@app` block wildcards | partial | `blocks.allowed` is an explicit list; no wildcard, no app blocks | P2 | https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema |
| Snippets + `{% render %}` with isolated scope | partial | `{% render 'x', k: v %}`, depth 8, cycle check. Differs: the snippet sees the caller's scope (not isolated). No `with`/`for`/`as` forms | P2 | https://shopify.dev/docs/api/liquid/tags/render |
| `config/settings_schema.json` (theme settings) | have | `theme.json` `settings`, edited in the builder's Theme settings panel | - | https://shopify.dev/docs/storefronts/themes/architecture/config/settings-schema-json |
| Setting groups / sidebar headers in theme settings | missing | Theme settings are one flat list; no groups (Colors, Typography, Cart…) and no `header`/`paragraph` sidebar items | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/sidebar-settings |
| `settings_data.json` presets (theme styles, e.g. Dawn's color variants) | missing | One theme = one style. Shopify lets one theme ship several named styles | P2 | https://shopify.dev/docs/storefronts/themes/architecture/config/settings-data-json |
| `theme_info` (name, version, author, docs/support URLs) | partial | `theme.json` has id, name, version, author, description, category. No documentation/support URL | P1 | https://shopify.dev/docs/storefronts/themes/architecture/config/settings-schema-json#add-theme-metadata |
| Storefront locale files (`locales/en.default.json`) | partial | Flat `{key: string}` only. No nesting, no plurals, no `{{ var }}` interpolation (`translate.ts` is a plain lookup) | P1 | https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files |
| Pluralization in translations | missing | `"items": {"one": …, "other": …}` not possible; Arabic needs zero/one/two/few/many/other | P1 | https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files#pluralize-translations |
| Interpolation in translations (`t: count: n`) | missing | "Showing 12 of 40 products" cannot be written as one key | P1 | https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files#interpolation |
| Schema locale files (`*.schema.json`, translated editor labels) | have (different) | Labels are `{ "en", "ar" }` inline; `ar` falls back to `en` | - | https://shopify.dev/docs/storefronts/themes/architecture/locales/schema-locale-files |
| Assets folder + `asset_url` | in progress | `asset_url()` returns `""` on the storefront today (GAPS #7); 0.3 serves theme assets | P0 | https://shopify.dev/docs/storefronts/themes/architecture#assets |
| Theme JavaScript (`assets/*.js`, `{% javascript %}`) | missing | Accepted in `assets/` but never loaded. Spec §9: reviewed modules with a capability object, Phase 4 | P1 | https://shopify.dev/docs/api/liquid/tags/javascript |
| Section-scoped CSS (`{% stylesheet %}`) | partial | One global stylesheet (`assets/*.css`); tags emit their own scoped CSS. No per-section CSS file | P2 | https://shopify.dev/docs/api/liquid/tags/stylesheet |
| Checkout customisation (`checkout.liquid`, deprecated for Checkout Extensibility) | missing (by design) | Spec Phase 7 plans `checkout.hk`. Shopify moved checkout *out* of themes; recommend Hekana does the same and keeps checkout platform-owned, themed by tokens only | skip | https://shopify.dev/docs/storefronts/themes/architecture/layouts/checkout-liquid |

### B. The language: tags, objects, filters

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| `if` / `elsif` / `else` / `unless` | have | `unless` → `{% if not x %}` | - | https://shopify.dev/docs/api/liquid/tags/if |
| `case` / `when` | missing | `elsif` chains work; `case` would shorten icon snippets (GAPS #1) | P2 | https://shopify.dev/docs/api/liquid/tags/case |
| `for` with `limit`, `offset`, `reversed`, `else`, `forloop.*` | partial | `limit` only, and literal only (GAPS #9). No `offset`, `reversed`, `{% else %}` for empty, `forloop.length/index0/rindex` | P1 | https://shopify.dev/docs/api/liquid/tags/for |
| `break` / `continue`, `cycle`, `tablerow` | missing | | skip | https://shopify.dev/docs/api/liquid/tags/break |
| `assign` / `capture` | missing | Deliberate ("no assignment"). Leads to repeated long expressions; a scoped `assign` is low risk | P2 | https://shopify.dev/docs/api/liquid/tags/assign |
| `comment` / `#` inline comments / `raw` | partial | HTML comments dropped at compile; no template comment tag, no `raw` | P2 | https://shopify.dev/docs/api/liquid/tags/comment |
| `{% doc %}` (snippet parameter docs, checked by Theme Check) | missing | Useful once the VS Code extension exists: typed snippet args | P2 | https://shopify.dev/docs/api/liquid/tags/doc |
| `{% form %}` (product, contact, customer, newsletter, localization) | missing | Form elements are not allowed. Phase 2 adds add-to-cart; 0.3 adds search. Newsletter and contact are not planned | P1 | https://shopify.dev/docs/api/liquid/tags/form |
| `{% paginate %}` + `paginate` object | missing | No pagination; collection pages will need it (not in Phase 2 list) | P0 | https://shopify.dev/docs/api/liquid/tags/paginate |
| `{% section %}` / `{% sections 'group' %}` | partial | `<hk-sections />` renders the template's sections; no section groups | P0 (with groups) | https://shopify.dev/docs/api/liquid/tags/sections |
| `{% liquid %}`, `echo`, `increment` | n/a | | skip | https://shopify.dev/docs/api/liquid/tags/liquid |
| `shop` object | partial | `store.name`, `store.logo`, `store.currency`, `store.url`. No contact email/phone, social links, policies, address | P1 | https://shopify.dev/docs/api/liquid/objects/shop |
| `product` object (title, description, media, variants, options, tags, vendor, type, available, price range) | partial / in progress | Today: `id, title, handle, url, price, compare_at, image, available`. 0.3 adds description and badges; Phase 2 adds variants. Missing: `images[]`/media list, `options`, `tags`, `category`, `selected_variant`, price range, digital kind | P0 (images) | https://shopify.dev/docs/api/liquid/objects/product |
| `variant` object | in progress | Phase 2 variant picker | P0 | https://shopify.dev/docs/api/liquid/objects/variant |
| `collection` object (title, description, image, products_count, filters, sort options) | partial | `collection('handle')` returns `products` (24 max on the storefront) and optional `title`; no description, image, count, filters, sort | P1 | https://shopify.dev/docs/api/liquid/objects/collection |
| `collections` (all collections, for a category list) | missing | No way to list categories; themes hard-code them | P1 | https://shopify.dev/docs/api/liquid/objects/collections |
| Dynamic lookups (`collections[setting]`, `all_products[handle]`) | in progress | Literal handles only (SN1105). 0.3 makes the `collection` setting usable; the `product` setting has the same problem | P0 | https://shopify.dev/docs/api/liquid/objects/all_products |
| `cart` object | in progress | Phase 2 | P0 | https://shopify.dev/docs/api/liquid/objects/cart |
| `customer` object (logged in, name) | missing | Spec §7 plans `customer.logged_in/first_name`; needed for an account link that says "Hi Mona" or "Sign in" | P1 | https://shopify.dev/docs/api/liquid/objects/customer |
| `linklists` / `menu` object (navigation) | missing | Hekana has navigation menus (`apps/api/src/navigation`), not exposed to themes | P0 | https://shopify.dev/docs/api/liquid/objects/linklists |
| `request` object (`page_type`, `path`, `locale`, `design_mode`, `visual_preview_mode`) | partial | `locale` and `dir` only. No current path (active menu item), page type, or design mode | P1 | https://shopify.dev/docs/api/liquid/objects/request |
| `routes` object (locale-aware URLs) | in progress | 0.3 locale-aware links (GAPS #6) | P0 | https://shopify.dev/docs/api/liquid/objects/routes |
| `localization` object (available languages, current, alternate URLs) | missing | No way to build a language switcher that keeps the current page | P0 | https://shopify.dev/docs/api/liquid/objects/localization |
| `page`, `blog`, `article`, `comment` objects | missing / n/a | `page` needed for merchant pages; Hekana has no merchant blog (the `blog` module is Hekana's own site) | P1 (page), skip (blog) | https://shopify.dev/docs/api/liquid/objects/page |
| `search` and `predictive_search` objects | in progress (search) | 0.3 search form, Phase 2 search template. Predictive search not planned | P1 | https://shopify.dev/docs/api/liquid/objects/predictive_search |
| `recommendations` object | missing | No related / complementary products | P1 | https://shopify.dev/docs/api/liquid/objects/recommendations |
| `metafield` / `metaobject` objects | n/a | Hekana has no product custom fields yet (only checkout custom fields). Revisit when the platform adds them | P2 | https://shopify.dev/docs/api/liquid/objects/metafield |
| `gift_card` object / template | missing | Hekana sells gift cards (`gift-cards.astro`) | P2 | https://shopify.dev/docs/api/liquid/objects/gift_card |
| `settings`, `section`, `block` objects | have | `block.shopify_attributes` equivalent is the platform's `data-hk-block` wrapper | - | https://shopify.dev/docs/api/liquid/objects/section |
| Money filters (`money`, `money_with_currency`, `money_without_currency`, `money_without_trailing_zeros`) | partial / in progress | `money` only: always two decimals with the ISO code. 0.3 adds whole pounds. No variant without the currency code (needed for "from 520") | P1 | https://shopify.dev/docs/api/liquid/filters/money |
| Math filters (`plus`, `minus`, `times`, `divided_by`, `round`, …) | missing | Deliberate. Cheapest fix for the common need: a `discount_percent`/`savings` value on the product, not general arithmetic | P1 (savings value) | https://shopify.dev/docs/api/liquid/filters/plus |
| String filters (`append`, `prepend`, `replace`, `split`, `strip_html`, `capitalize`, `handleize`, `url_encode`, `newline_to_br`, `escape`) | partial | `upcase`, `downcase`, `truncate`, `escape`, `default`. Missing `strip_html`, `newline_to_br`, `url_encode` (share links), `replace`, `split` | P1 (`strip_html`, `newline_to_br`, `url_encode`) | https://shopify.dev/docs/api/liquid/filters/string-filters |
| Array filters (`first`, `last`, `join`, `size`, `map`, `where`, `sort`, `uniq`, `reverse`, `concat`) | partial | `first`, `last`, `join`, `size`. `where`/`sort` would let one collection drive several rows | P2 | https://shopify.dev/docs/api/liquid/filters/array-filters |
| `date` filter with format | partial | One long format; no format argument, no relative dates | P2 | https://shopify.dev/docs/api/liquid/filters/date |
| `image_url` (width, height, crop, format) | partial | `img: 400` is accepted but the storefront ignores the width (`imageRefUrl` returns the original URL); no crop/format | P0 | https://shopify.dev/docs/api/liquid/filters/image_url |
| `image_tag` (srcset, sizes, width/height, lazy, fetchpriority) | partial | `hk-image` sets `loading` and `fetchpriority=high` for eager images; no `srcset`/`sizes`, no `width`/`height` attributes (layout shift). Spec §6.4 wants srcset from `.w400/.w800` | P0 | https://shopify.dev/docs/api/liquid/filters/image_tag |
| `placeholder_svg_tag` (placeholder art for empty settings) | missing | Themes draw their own empty states; a placeholder set keeps fresh installs from looking broken | P2 | https://shopify.dev/docs/api/liquid/filters/placeholder_svg_tag |
| Font filters (`font_face`, `font_url`, `font_modify`) + `font_picker` | in progress | 0.3 fonts (`tokens.fonts` is not turned into CSS today, GAPS #8) | P0 | https://shopify.dev/docs/api/liquid/filters/font_face |
| Color filters (`color_mix`, `color_lighten`, `color_to_rgb`, `color_contrast`) | missing | CSS `color-mix()` covers most of it in modern browsers | skip | https://shopify.dev/docs/api/liquid/filters/color_mix |
| `t` / `translate` | have | `t('key')` and `\| t`; no arguments (see interpolation) | - | https://shopify.dev/docs/api/liquid/filters/translate |
| `json` filter | have (safer) | `json_attr` for `data-*` attributes only; no `<script>` | - | https://shopify.dev/docs/api/liquid/filters/json |
| `structured_data` filter | n/a | Platform emits JSON-LD in the head | - | https://shopify.dev/docs/api/liquid/filters/structured_data |
| `payment_type_svg_tag` / payment icons | missing | Footer payment icons (Fawry, Visa, wallets, COD) are a staple of Egyptian stores; a platform `hk-payment-icons` would fit | P2 | https://shopify.dev/docs/api/liquid/filters/payment_type_svg_tag |
| `default_pagination`, `link_to`, `url_for_*` helpers | missing | | P2 | https://shopify.dev/docs/api/liquid/filters/default_pagination |

### C. Settings input types

Sneferu has 16 types. The builder (`field-model.ts` `EDITABLE_TYPES`) has an
editor for 10 of them: `text, textarea, number, range, boolean, select, color,
image, link, collection`.

| Shopify setting type | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| `text`, `textarea`, `number`, `range`, `select`, `checkbox`, `color`, `url` | have | `checkbox` = `boolean`, `url` = `link` | - | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings |
| `radio` | partial | `select` only; no radio presentation | skip | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#radio |
| `richtext` / `inline_richtext` | partial | `rich_text` exists but renders as escaped plain text (no sanitised HTML output) and has no builder editor | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#richtext |
| `image_picker` | have | `image`; builder editor exists | - | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#image_picker |
| Image focal point (merchant picks the crop centre) | missing | Spec §6.4 mentions `design.framing` focus crop; `hk-image` has `fit` only | P2 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#image_picker |
| `video` / `video_url` | partial | Type exists, no builder editor, no video tag (`hk-video` is spec Phase 4) | P2 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#video_url |
| `product` | partial | Type exists, no builder editor, and `product(setting)` is SN1105 | P0 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#product |
| `product_list` | missing | Hand-picked products for a "Bestsellers" row | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#product_list |
| `collection` | in progress | Builder editor exists; 0.3 makes it usable in templates | P0 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#collection |
| `collection_list` | missing | Category tiles (GAPS #4 workaround) | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#collection_list |
| `link_list` (menu picker) | missing | Depends on the menu object | P0 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#link_list |
| `page`, `blog`, `article` | missing | `page` picker for "About us" links; blog n/a | P2 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#page |
| `font_picker` | in progress | 0.3 fonts; `typography` exists with no editor | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#font_picker |
| `color_scheme` / `color_scheme_group` | missing | Dawn's main idea: define 3-5 schemes once, pick one per section. Sneferu has tokens + per-section colors | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color_scheme_group |
| `color_background` (gradients) | missing | | P2 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#color_background |
| `text_alignment` | partial | A `select` with start/center/end does the job | skip | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#text_alignment |
| `html` / `liquid` (merchant code) | n/a | Unsafe; Sneferu's model forbids it. Keep it out | skip | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#liquid |
| `metaobject` / `metaobject_list` | n/a | No metaobjects | skip | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings#metaobject |
| Sidebar `header` / `paragraph` | missing | Needed to make long section/theme settings readable | P1 | https://shopify.dev/docs/storefronts/themes/architecture/settings/sidebar-settings |
| Conditional settings (`visible_if`) | have | `{ setting, equals }`; the builder honours it. Shopify's is a Liquid expression (and/or, other settings) | - | https://shopify.dev/docs/storefronts/themes/architecture/settings#conditional-settings |
| Dynamic sources (connect a setting to a product field/metafield) | missing | | P2 | https://shopify.dev/docs/storefronts/themes/architecture/settings/dynamic-sources |
| Per-locale setting values | in progress | 0.3 per-locale settings (GAPS #5). Shopify does this through translations of settings | P0 | https://shopify.dev/docs/storefronts/themes/architecture/locales |
| `icon` (Sneferu only) | partial / in progress | Type exists, no editor; `hk-icon` in 0.3 | P1 | - |

### D. Theme editor integration

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Live preview while editing | have | Builder renders the draft client-side with the same runtime; no reload | - | https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks |
| Click a section/block in the preview to select it | have | `Hk2Canvas` maps clicks to `data-hk-section` / `data-hk-block`, outlines and scrolls to the selection | - | https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks |
| Add, remove, reorder, hide sections and blocks | have | Draft with revision conflicts, publish, rollback | - | https://shopify.dev/docs/storefronts/themes/best-practices/editor |
| Editor JS events (`shopify:section:load`, `select`, `block:select`, …) | missing | Only matters once themes have JS or controllers (e.g. open the slide the merchant selected) | P1 (with controllers) | https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks#javascript-events |
| `request.design_mode` (render differently in the editor) | missing | E.g. show an empty-state hint only to the merchant | P2 | https://shopify.dev/docs/api/liquid/objects/request#request-design_mode |
| Visual preview of a section before adding it (`visual_preview_mode`, preset thumbnails) | missing | Add Section is a list of names | P1 | https://shopify.dev/docs/api/liquid/objects/request#request-visual_preview_mode |
| Page/template switcher in the editor | missing | Only the home page; spec Phase 5. Comes with Phase 2 templates | P0 | https://shopify.dev/docs/storefronts/themes/best-practices/editor |
| Editing header/footer groups | missing | See section groups | P0 | https://shopify.dev/docs/storefronts/themes/architecture/section-groups |
| Section `presets` offered in the editor | partial | Stored, not used (see A) | P0 | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema#presets |
| Every setting type editable | partial | 6 of 16 types have no editor | P0 | https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings |

### E. Localization and markets

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Multiple languages, translated UI strings | have | `ar` and `en` locales, fallback to default | - | https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages |
| Locale-aware URLs (`routes`, `/en/...`) | in progress | 0.3 (GAPS #6). Product URLs from the platform already carry the locale | P0 | https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages#locale-aware-urls |
| Language selector (localization form / alternate URL of this page) | missing | No `localization` object and no "this page in English" URL | P0 | https://shopify.dev/docs/storefronts/themes/markets/country-language-ux |
| hreflang / alternate links | have (platform) | `Hk2Layout.astro` writes `ar`, `en`, `x-default` | - | https://shopify.dev/docs/storefronts/themes/seo/hreflang |
| Right-to-left support | have (better) | `dir`/`lang` on the theme root, logical CSS in every tag, `ar-EG-u-nu-latn` digits. Shopify leaves RTL to the theme | - | https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages |
| Multiple currencies / currency selector / country selector / markets | n/a | One currency per store (EGP); `money` already formats other ISO codes | skip | https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages |
| Translatable schema labels | have | `{ en, ar }` labels | - | https://shopify.dev/docs/storefronts/themes/architecture/locales/schema-locale-files |

### F. SEO, performance, accessibility

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Title, description, canonical, OG/Twitter | have (platform) | Theme cannot change them; fine | - | https://shopify.dev/docs/storefronts/themes/seo |
| Structured data (Product, Organization, BreadcrumbList) | partial (platform) | Home emits OnlineStore + WebSite. Product/collection JSON-LD must come with the Phase 2 templates (platform-side, since themes have no `<script>`) | P0 (with Phase 2) | https://shopify.dev/docs/api/liquid/filters/structured_data |
| Responsive images (`srcset`, `sizes`, width/height) | partial | See `image_url` / `image_tag` rows. Single largest performance gap | P0 | https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-responsive-images |
| Lazy loading / `fetchpriority` for the LCP image | have | `hk-image loading="eager"` adds `fetchpriority="high"`; lazy by default | - | https://shopify.dev/docs/storefronts/themes/best-practices/performance |
| `preload_tag` / font preload / `font-display` | missing | Comes with fonts (0.3); the platform head should preload the theme's first font | P1 | https://shopify.dev/docs/api/liquid/filters/preload_tag |
| No render-blocking JS, small CSS | have | No theme JS; CSS capped at 512 KB, inlined | - | https://shopify.dev/docs/storefronts/themes/best-practices/performance |
| Server render budgets | have (better) | Node/loop/output budgets per page; a section that runs over degrades alone. Shopify has no equivalent the theme author sees | - | - |
| Performance target (Lighthouse ≥ 60 for Theme Store) | missing | No measured budget for themes; add one to the review checklist | P1 | https://shopify.dev/docs/storefronts/themes/store/requirements |
| Accessibility best practices (alt text, focus, contrast, headings, skip link, reduced motion) | partial | Tags use semantic HTML and 44 px buttons, but nothing checks alt text, heading order or contrast, and no skip link | P1 | https://shopify.dev/docs/storefronts/themes/best-practices/accessibility |

### G. Storefront features a theme must render

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Product page (media gallery, variant picker, add to cart, quantity) | in progress | Phase 2. A media gallery (`hk-product-gallery`, spec §6.2) is not in the in-progress list; make sure it ships with the product template | P0 | https://shopify.dev/docs/storefronts/themes/product-merchandising |
| Cart page, cart drawer, AJAX Cart API | in progress | Phase 2 cart template + drawer | P0 | https://shopify.dev/docs/api/ajax/reference/cart |
| Section Rendering API (re-render one section after an AJAX change) | missing | The pattern Dawn uses to update cart count, drawer and filters without a reload. Hekana needs an equivalent endpoint once interactive tags exist | P1 | https://shopify.dev/docs/api/ajax/section-rendering |
| Collection page with storefront filtering (availability, price, options) and sort | missing | Phase 2 adds the collection template; filters and sort are not planned | P1 | https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering |
| Pagination | missing | See `paginate` | P0 | https://shopify.dev/docs/api/liquid/tags/paginate |
| Search page | in progress | 0.3 form, Phase 2 template | P0 | https://shopify.dev/docs/storefronts/themes/navigation-search/search |
| Predictive search | missing | Hekana storefront has search; no theme tag for as-you-type results | P1 | https://shopify.dev/docs/storefronts/themes/navigation-search/search/predictive-search |
| Product recommendations (related / complementary) | missing | | P1 | https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations |
| Navigation menus (mega menu, mobile drawer) | missing | Menu object + a disclosure/drawer controller | P0 | https://shopify.dev/docs/storefronts/themes/navigation-search/navigation |
| Newsletter sign-up form | missing | Hekana has a newsletter API; no `hk-newsletter` | P1 | https://shopify.dev/docs/storefronts/themes/customer-engagement/email-consent |
| Contact form | missing | Most Egyptian stores link WhatsApp instead; a link works today | P2 | https://shopify.dev/docs/storefronts/themes/customer-engagement/add-contact-form |
| Customer account pages (login, register, orders, addresses) | n/a (platform) | Hekana renders accounts itself (email OTP). Keep it platform-owned, like Shopify's new customer accounts; only make sure it picks up the theme's tokens and header/footer | P1 (token styling) | https://shopify.dev/docs/storefronts/themes/customer-engagement/account-component |
| Merchant content pages (About, FAQ, policies) | missing | `page` template + `page` object | P0 | https://shopify.dev/docs/storefronts/themes/architecture/templates/page |
| 404 page | in progress | Phase 2 | P0 | https://shopify.dev/docs/storefronts/themes/architecture/templates/404 |
| Password / coming-soon page | missing | Platform page today | P2 | https://shopify.dev/docs/storefronts/themes/architecture/templates/password |
| Gift card page | missing | Platform page today | P2 | https://shopify.dev/docs/storefronts/themes/architecture/templates/gift-card-liquid |
| Blog and articles | n/a | No merchant blog on Hekana | skip | https://shopify.dev/docs/storefronts/themes/architecture/templates/blog |
| Quantity rules, selling plans/subscriptions, pickup availability, unit prices | n/a / P2 | Not Hekana features today (subscriptions are Hekana's own plans, not product selling plans) | skip | https://shopify.dev/docs/storefronts/themes/pricing-payments/subscriptions |
| Cookie / privacy banner | n/a (platform) | Platform concern | skip | https://shopify.dev/docs/api/customer-privacy |

### H. Apps

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Theme app extensions: app blocks a merchant drops into any section that allows `@app` | missing | Hekana has an app marketplace; apps (reviews, chat, try-on) cannot place UI inside an HK2 theme | P2 | https://shopify.dev/docs/apps/build/online-store/theme-app-extensions |
| App embed blocks (floating widgets, scripts on every page) | partial (platform) | `Hk2Layout` renders `<Integrations>` and tracking; not merchant-placeable | P2 | https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-embed-blocks |

### I. Developer tools

| Shopify tool | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| `shopify theme init` (clone Dawn/Skeleton) | have | `sneferu init`, starter theme | - | https://shopify.dev/docs/api/shopify-cli/theme/theme-init |
| `shopify theme dev` (live store data, hot reload of CSS and sections, theme editor sync) | partial | `sneferu dev` renders locally with sample data (`.sneferu-dev/data.json`) and full-page reload on save. No real store data, no hot CSS swap, only `index` (`/__template/x` for others) | P1 | https://shopify.dev/docs/api/shopify-cli/theme/theme-dev |
| `shopify theme push` | have | Uploads source; server compiles; version `in_review` | - | https://shopify.dev/docs/api/shopify-cli/theme/theme-push |
| `shopify theme pull` | missing | Cannot download a theme version (or a merchant's settings) back | P2 | https://shopify.dev/docs/api/shopify-cli/theme/theme-pull |
| `shopify theme share` / preview link | partial | `push --dev-store` publishes on the developer's dev store; no shareable preview link of a version on any store (spec §14 `preview`) | P1 | https://shopify.dev/docs/api/shopify-cli/theme/theme-share |
| `shopify theme list` / `info` / versions | missing | Spec §14 lists `versions`; review status is visible only in the partner portal | P2 | https://shopify.dev/docs/api/shopify-cli/theme/theme-list |
| `shopify theme publish` | partial | Dev store only; merchants publish from the builder | - | https://shopify.dev/docs/api/shopify-cli/theme/theme-publish |
| `shopify theme package` (zip for Theme Store submission) | partial | `sneferu build` produces the compiled artifact; submission is `push` | - | https://shopify.dev/docs/api/shopify-cli/theme/theme-package |
| `shopify theme check` (Theme Check linter) | partial | `sneferu validate`: 77 diagnostics, all syntax/safety/limits. No lint rules for performance, accessibility or translations | P1 | https://shopify.dev/docs/storefronts/themes/tools/theme-check |
| Theme Check rules worth copying | missing | `TranslationKeyExists`, `MatchingTranslations` (ar/en keys equal), `ImgWidthAndHeight`, `AssetSizeCSS`, `RemoteAsset` (fonts from Google, GAPS #8), `UnusedSnippet`, `UndefinedObject`, `MissingTemplate`, `DeprecatedTag`, `ValidSchema`, `MissingAltText`-style a11y checks | P1 | https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks |
| `shopify theme profile` (Liquid render profiler) | missing | Budgets exist; a per-section cost report from `dev` would help authors stay inside them | P2 | https://shopify.dev/docs/api/shopify-cli/theme/theme-profile |
| `shopify theme console` (Liquid REPL) | missing | | skip | https://shopify.dev/docs/api/shopify-cli/theme/theme-console |
| Language server + VS Code extension (completion, hover docs, diagnostics) | in progress | VS Code extension by another agent; `tags.json` is the metadata source | P1 | https://shopify.dev/docs/storefronts/themes/tools/shopify-liquid-vscode |
| Prettier plugin for Liquid | have | `@hekana/prettier-plugin-sneferu`, `sneferu format --check` | - | https://shopify.dev/docs/storefronts/themes/tools/liquid-prettier-plugin |
| GitHub integration (store theme synced to a branch) | missing | CI can `push` with `HEKANA_TOKEN`; no two-way sync | P2 | https://shopify.dev/docs/storefronts/themes/tools/github |
| Dawn / Horizon: a complete, documented reference theme | partial | Starter (home only) + example store + six example themes. None covers every page type, because only `index` exists | P1 | https://github.com/Shopify/horizon |
| Theme Store requirements and review checklist | missing | Hekana reviews pushes (`theme-review.service.ts`), but there is no published list of what a theme must do to pass | P1 | https://shopify.dev/docs/storefronts/themes/store/requirements |
| Theme testing checklist (what the author must test before submitting) | missing | Pair it with the review checklist: both locales, RTL, every template, empty states, 360/768/1440 widths | P1 | https://shopify.dev/docs/storefronts/themes/store/test-theme/checklist |
| Theme Store listing (demo store, presets, docs, support) | missing | Hekana has a public theme store for legacy themes; HK2 themes are not listed | P1 | https://shopify.dev/docs/storefronts/themes/store |

### J. Versions, updates, migrations

| Shopify capability | Sneferu | Notes | Priority | Shopify doc |
| - | - | - | - | - |
| Immutable versions, review status | have | `theme_versions` rows, `in_review`/`approved` | - | https://shopify.dev/docs/storefronts/themes/store/review-process |
| Merchant rollback to an earlier publish | have (API) | `rollback(publicationId)` in the API; no UI listed | P2 (UI) | - |
| Theme updates that keep the merchant's settings and pages | missing | No "update to 1.1.0" for an installed store; `migrations/*.json` is "accepted, not used yet". Spec Phase 6 | P0 | https://shopify.dev/docs/storefronts/themes/store/success/updates |
| Setting/section migration rules (renamed settings, removed blocks) | missing | Same | P0 | https://shopify.dev/docs/storefronts/themes/store/success/updates |
| Theme versioning conventions (semver, changelog) | have | `x.y.z` required, bump per push | - | https://shopify.dev/docs/storefronts/themes/store/success/updates |

## Top 15 to build next

In order. The first eight are P0; together with 0.3 and Phase 2 they are what
a real merchant needs. The rest are P1, needed before outside developers sell
themes.

1. **Header and footer section groups.** Today the layout is fixed markup, so
   the merchant cannot change anything above or below the page body except
   theme settings. Every Shopify theme since 2023 makes the header,
   announcement bar and footer editable sections on every page, and merchants
   expect to do the same in our builder. Build: `sections/` usable from a
   `<hk-section-group name="header">` slot in the layout, one stored tree per
   group per store, `enabled_on`/`disabled_on` so header-only sections stay in
   the header, and the builder's page selector showing Header and Footer.

2. **Menus.** Hekana already stores navigation menus (`apps/api/src/navigation`),
   but a theme cannot read them, so every theme hard-codes `/products`,
   `/search`, and locale-key URLs. Add a `menu('main')` lookup (items with
   title, url, children, active) and a `link_list`-style `menu` setting so the
   merchant picks which menu a header or footer section shows. Without it, a
   merchant's own categories never appear in their header.

3. **Responsive images.** `img: 400` is silently ignored on the storefront and
   `hk-image` has no `srcset`, `sizes`, `width` or `height`. Product grids
   therefore download full-size photos and shift layout as they load. The
   platform already makes `.w400`/`.w800` variants (spec §6.4). Wire `img: N`
   to the nearest variant, give `hk-image` and product cards a `srcset` and
   intrinsic size, and add a validate warning for `<img>` without width/height.

4. **Theme updates with migrations.** A merchant who installs a theme and
   customises it cannot move to the developer's next version. Shopify's update
   flow keeps the merchant's settings and sections; ours is not built
   (`migrations/` reserved). This is the first thing that breaks after launch:
   the first bug fix to any theme. Build Phase 6's update: apply
   `migrations/*.json` to a copy of the draft, show a kept / migrated / dropped
   report, publish explicitly.

5. **Builder finishes what the schema promises.** Presets are stored but the
   Add Section dialog ignores them, and `rich_text`, `video`, `product`,
   `icon`, `spacing`, `typography` have no editor. A theme author who uses
   them ships a section the merchant cannot configure. Add the six editors,
   apply presets on add (with their blocks), and allow template defaults to
   carry blocks (GAPS #4) so a fresh install is not empty.

6. **Language switcher and the current page.** Bilingual stores are Hekana's
   core, but a theme cannot link to "this page in English": there is no
   `localization`/`request.path`. 0.3's locale-aware links fix links *to*
   known pages; add `page.alternate_url` (or an `hk-locale-switch` tag),
   `request.path` and `request.page_type` so themes can build the switcher and
   highlight the active menu item.

7. **Pagination and the `page` template.** Phase 2's collection template will
   show at most 24 products (`COLLECTION_LIMIT`) with no way to reach the rest;
   and merchant pages (About, FAQ, shipping policy at `/p/<slug>`) have no
   template, so they fall back to the legacy engine. Add `paginate` (or a
   `hk-pagination` tag with page info on `collection`) and `templates/page`
   with a `page` object (title, sanitised body).

8. **Product page completeness.** Make sure Phase 2 ships an image gallery
   (`hk-product-gallery`, spec §6.2), `product.images[]`, options, price range
   and the Product JSON-LD from the platform head. Without a gallery and
   structured data the product page is the weak point for both conversion and
   Google.

9. **Interactive controllers.** No theme JavaScript is loaded, and the spec's
   Phase 4 controllers (tabs, accordion, carousel, modal, disclosure) are not
   built. Every theme fakes them with scroll-snap and anchor links (GAPS #13).
   Ship a small set of platform controllers with keyboard, ARIA and RTL
   handled centrally, plus a mobile menu drawer for item 2. Add editor events
   (section/block select) at the same time so a selected slide opens in the
   builder.

10. **A Theme Check equivalent.** `validate` catches syntax and safety but
    nothing about quality. Add warnings for: missing translation keys and
    ar/en key mismatch, images without alt or size, unused snippets and
    blocks, remote fonts, CSS over budget, settings with no default, a section
    with blocks but no empty state. These double as the review checklist's
    automated part and feed the VS Code extension.

11. **Published review checklist and a reference theme.** Outside developers
    need to know what passes review: every page type, both locales, RTL,
    Lighthouse target, accessibility basics, empty states, and Hekana's
    colour rules (no purple or pink). And they need one complete reference theme
    covering every template (Hekana's Dawn), not just the home-page starter.

12. **Translations with plurals and variables.** Flat strings only today.
    Arabic has six plural forms, and "12 of 40 products", "Save 20%" or
    "Delivery in 3 days" need variables. Add `t('key', count: n)` with
    `zero/one/two/few/many/other`, and nested keys.

13. **More settings types for merchandising.** `product_list`,
    `collection_list`, `menu`, `page`, and color schemes. These turn
    "numbered settings" workarounds (GAPS #4) into real pickers, and color
    schemes let a merchant restyle a section in one click without breaking
    contrast.

14. **Forms the platform owns: newsletter and recommendations.** Add
    `hk-newsletter` (Hekana has the API) and a related-products lookup or
    `hk-recommendations`. Both are on almost every Shopify home and product
    page and need no theme JS if the platform renders them.

15. **`dev` against a real dev store, plus a shareable preview.** Today `dev`
    uses sample data and only the home template, so authors find data issues
    after pushing. Let `sneferu dev --store` pull real (dev store) catalogue
    data, hot-swap CSS without a full reload, and add `sneferu preview` (spec
    §14) for a signed link the owner or a client can open.

Not in the top 15 but tracked above: predictive search, filtering and sort,
app blocks for the marketplace, Section Rendering API equivalent, `pull`,
profiler, `assign`, more filters, gift card and password templates.

## Keep: what Hekana has that Shopify does not

| Hekana strength | Why keep it |
| - | - |
| **Arabic-first, right-to-left by default** | Every tag uses logical CSS; `dir`/`lang` on the theme root; Arabic labels in schemas; Western digits in `ar-EG-u-nu-latn`. Shopify leaves RTL to each theme, and most get it wrong |
| **Cash on delivery as a first-class path** | Checkout, COD rounding and refund rules stay platform-owned. Themes should never touch them; keep checkout out of themes (see `checkout.liquid` row) |
| **Digital products and code delivery** | Gift cards, game codes and licences are a core Hekana segment. Add an alternate product template and a `product.digital` field so themes can show "code arrives by email/WhatsApp", rather than locale-string workarounds (GAPS #11) |
| **EGP in minor units, whole-pound display** | `money` already formats EGP in both languages; 0.3 adds whole pounds |
| **Safe by construction** | Element allow-list, escaping by sink, URL checks, no theme JS, artifact re-validated at load. Shopify trusts Liquid and theme JS; Hekana can accept themes from unknown developers with far less review risk. Keep the allow-list when adding forms and controllers: add platform tags, not raw `<form>`/`<script>` |
| **Render budgets with per-section failure** | One bad section cannot take down a page |
| **Platform-owned head** | Canonical, hreflang, OG and JSON-LD cannot drift between themes |
| **Labels in the schema** (`{en, ar}`) | Simpler than Shopify's separate `*.schema.json` files for two languages |
| **WhatsApp-first contact** | Most Egyptian merchants prefer a WhatsApp link to a contact form; a platform `hk-whatsapp` button would fit better than copying Shopify's contact form |

## Sources

Shopify: the URL in each row (shopify.dev, read 2026-10-11/12). Sneferu:
`docs/guide/*`, `docs/language.mdx`, `docs/diagnostics.mdx`,
`docs/reference/tags.json`, `packages/*/src`, `examples/GAPS-gaming.md`
(same as `sneferu-themes/GAPS.md`). Hekana: `apps/api/src/hk2`,
`apps/storefront/src/lib/hk2.ts`, `apps/storefront/src/layouts/Hk2Layout.astro`,
`apps/dashboard/app/(dashboard)/design/hk2`, spec §6-§18.
