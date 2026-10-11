# Sneferu SDK gaps found while building the gaming themes

Dogfood log for the three gaming themes (`arcade`, `console`, `esports`), built
with `@hekana/sneferu@0.2.0` from npm on 2026-10-11. Each entry says what was
missing, how the themes work around it, and whether it blocked the design.

| # | Gap | Workaround in the themes | Blocking? |
| - | - | - | - |
| 1 | No icon tag (`hk-icon`) and no icon set | One `snippets/icon.sneferu` per theme: inline SVG on a 24 px grid, chosen with `{% if name == '…' %}` | No |
| 2 | No search input or search tag (form controls are not allowed) | The search box is a link styled as a field, pointing at `/search` | No, but the shopper needs one extra tap |
| 3 | No cart tag (no cart count, no add-to-cart) | Cart is an icon link to `/cart`; "Buy" buttons link to the product page | No |
| 4 | Template default sections cannot carry blocks | Repeated items (tabs, amount chips, category tiles, FAQ) are numbered settings or locale keys instead of blocks, so a fresh install is not empty | Design no; editing is clumsier than blocks |
| 5 | Section settings are single-language: a `text` default is shown in both Arabic and English | Text settings default to `""` and render `{{ section.settings.title \| default: t('hero_title') }}`, so the copy lives in `locales/ar.json` and `locales/en.json`; a merchant value overrides both languages | No |
| 6 | No locale-aware URL helper: `href="/products"` on an English page goes to the Arabic page | Locale keys `url_prefix` (`""` / `"/en"`), `url_products`, `url_search`, `url_cart`, `url_home` | No |
| 7 | Theme assets are not served on the platform yet (`asset_url()` returns `""` in the storefront) | No bundled images: icons and hero art are inline SVG; product art comes from product images | Would block any photo-based design |
| 8 | `tokens.fonts` is not turned into CSS, and fonts cannot be bundled (see 7) | `assets/fonts.css` with `@font-face` pointing at Google Fonts (`fonts.gstatic.com`, allowed by the storefront CSP `font-src https:`) | No |
| 9 | `{% for … limit: N %}` takes a literal only; a `range` setting cannot drive it (SN1105) | Fixed `limit: 10` in the esports card loop; `hk-product-grid limit="{{ … }}"` does accept a setting | No |
| 10 | No arithmetic and no `money` for whole pounds: amount chips stored in pounds cannot use `money` (minor units) | Chips print `{{ amount }} {{ t('egp') }}` | No |
| 11 | Product data has no description, tags, platform or region | Card notes come from locale strings ("Your code arrives by email…") | Limits product-specific copy |
| 12 | `hk-product-card` has no slot for a badge or a buy button | Wrap it: `<div class="es-card"><span class="es-ribbon">…</span><hk-product-card …/><a class="es-buy">…</a></div>` | No |
| 13 | No carousel/slider and no JS | A scroll-snap track; the arrows are anchor links to `#cc-start` / `#cc-end` inside the track | No |
| 14 | `sneferu dev` sample data has only the `featured` collection; category collections are empty in dev, and sample product URLs ignore the locale | Themes only read `collection('featured')` on the home page | No |
| 15 | `sneferu init <dir>` sets `id` from the folder but leaves `name: "Starter"` and the starter description | Edited `theme.json` by hand | No |
| 16 | A broad reset such as `[data-hk-theme='x'] a { color: inherit }` (0,1,1) silently beats single-class rules like `.es-buy` (0,1,0) | Resets wrapped in `:where(…)`; worth a line in the styling guide | No (docs) |
| 17 | SVG attribute and tag names are written lower-case (`viewbox`, `lineargradient`, `gradientunits`). Browsers fix the case when parsing HTML, so it renders, but the output is not valid XML/XHTML | None needed | No |
| 18 | The published CLI (0.2.0) rejects `README.md` and `docs/` inside a theme folder (SN3002). Fixed on `main` by #17, not yet on npm | The example folders validate with the CLI built from `main`; the pushed copies have no README | No |

## Status

- None of these gaps blocked a design, so no SDK change was needed for the
  three themes; all three were built and pushed with `@hekana/sneferu@0.2.0`
  from npm.
- The worth-fixing ones, in order: 7 (asset hosting, blocks any photo
  design), 4 (blocks in template defaults), 5 (localised settings), 6 (a
  locale-aware URL helper), 1 (an icon tag), 3 (an add-to-cart tag), 9
  (`for … limit:` from a setting).
- Colours: every hex and rgb value in the three themes and the product art
  was checked by hue; none falls in the purple to pink range (260-345°).
