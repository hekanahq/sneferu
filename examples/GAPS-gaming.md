# Sneferu SDK gaps found while building the gaming themes

Dogfood log for the three gaming themes (`arcade`, `console`, `esports`), built
with `@hekana/sneferu@0.2.0` from npm on 2026-10-11. Each entry says what was
missing, how the themes worked around it, and whether it blocked the design.
The last column says what Sneferu 0.3 changed: on 2026-10-12 the themes moved
to 0.3 (version 1.1.0) and dropped the workarounds marked fixed.

| # | Gap | Workaround in the themes (1.0.1) | Blocking? | Status in 0.3 |
| - | - | - | - | - |
| 1 | No icon tag (`hk-icon`) and no icon set | One `snippets/icon.sneferu` per theme: inline SVG on a 24 px grid, chosen with `{% if name == '…' %}` | No | Fixed in 0.3: `hk-icon` (71 Lucide icons). The themes use it; glyphs the set lacks (gem, coin, the Esports mark) stay inline SVG in `snippets/glyph.sneferu` / `mark.sneferu` |
| 2 | No search input or search tag (form controls are not allowed) | The search box is a link styled as a field, pointing at `/search` | No, but the shopper needs one extra tap | Fixed in 0.3: `hk-search-form`, styled as the old field in Arcade, Console and Esports |
| 3 | No cart tag (no cart count, no add-to-cart) | Cart is an icon link to `/cart`; "Buy" buttons link to the product page | No | Open (cart tags are planned for a later phase) |
| 4 | Template default sections cannot carry blocks | Repeated items (tabs, amount chips, category tiles, FAQ) are numbered settings or locale keys instead of blocks, so a fresh install is not empty | Design no; editing is clumsier than blocks | Fixed in 0.3: template default sections carry blocks. Tabs, chips, tiles, amounts, platforms, trust points, steps and FAQ are blocks seeded by the template |
| 5 | Section settings are single-language: a `text` default is shown in both Arabic and English | Text settings default to `""` and render `{{ section.settings.title \| default: t('hero_title') }}`, so the copy lives in `locales/ar.json` and `locales/en.json`; a merchant value overrides both languages | No | Fixed in 0.3: `"localized": true` text settings with `{ ar, en }` defaults; the copy moved from the locale files into the settings |
| 6 | No locale-aware URL helper: `href="/products"` on an English page goes to the Arabic page | Locale keys `url_prefix` (`""` / `"/en"`), `url_products`, `url_search`, `url_cart`, `url_home` | No | Fixed in 0.3: `url('/products')`; the `url_*` locale keys are gone |
| 7 | Theme assets are not served on the platform yet (`asset_url()` returns `""` in the storefront) | No bundled images: icons and hero art are inline SVG; product art comes from product images | Would block any photo-based design | Fixed in 0.3 (`asset_url()` serves images on the store). The themes still bundle no images: no new art was made for this update |
| 8 | `tokens.fonts` is not turned into CSS, and fonts cannot be bundled (see 7) | `assets/fonts.css` with `@font-face` pointing at Google Fonts (`fonts.gstatic.com`, allowed by the storefront CSP `font-src https:`) | No | Fixed in 0.3: `tokens.fonts` with catalogue fonts (Rubik, IBM Plex Sans Arabic, Cairo); `assets/fonts.css` deleted |
| 9 | `{% for … limit: N %}` takes a literal only; a `range` setting cannot drive it (SN1105) | Fixed `limit: 10` in the esports card loop; `hk-product-grid limit="{{ … }}"` does accept a setting | No | Fixed in 0.3: `limit: section.settings.count` (Esports cards, Console showcase) |
| 10 | No arithmetic and no `money` for whole pounds: amount chips stored in pounds cannot use `money` (minor units) | Chips print `{{ amount }} {{ t('egp') }}` | No | Fixed in 0.3: `money: 'whole', 'major'` for the amount chips and the amount selector |
| 11 | Product data has no description, tags, platform or region | Card notes come from locale strings ("Your code arrives by email…") | Limits product-specific copy | Mostly fixed in 0.3: `excerpt`, `description`, `kind`, `digital_kind`, `tags`, `category`. Console shows its "code by email" note only when `digital_kind` is `code`, else the excerpt. There is still no platform or region field |
| 12 | `hk-product-card` has no slot for a badge or a buy button | Wrap it: `<div class="es-card"><span class="es-ribbon">…</span><hk-product-card …/><a class="es-buy">…</a></div>` | No | Fixed in 0.3: `hk-product-card` parts `badge` and `actions`; Esports' ribbon and Buy button are parts |
| 13 | No carousel/slider and no JS | A scroll-snap track; the arrows are anchor links to `#cc-start` / `#cc-end` inside the track | No | Open (no carousel tag and no theme JS yet) |
| 14 | `sneferu dev` sample data has only the `featured` collection; category collections are empty in dev, and sample product URLs ignore the locale | Themes only read `collection('featured')` on the home page | No | Fixed in 0.3: sample data has `new`, `gift-cards` and `subscriptions` too. The themes read collection settings now (default `featured`) |
| 15 | `sneferu init <dir>` sets `id` from the folder but leaves `name: "Starter"` and the starter description | Edited `theme.json` by hand | No | Fixed in 0.3: `init` sets the name from the folder |
| 16 | A broad reset such as `[data-hk-theme='x'] a { color: inherit }` (0,1,1) silently beats single-class rules like `.es-buy` (0,1,0) | Resets wrapped in `:where(…)`; worth a line in the styling guide | No (docs) | Fixed in 0.3: documented in the styling guide |
| 17 | SVG attribute and tag names are written lower-case (`viewbox`, `lineargradient`, `gradientunits`). Browsers fix the case when parsing HTML, so it renders, but the output is not valid XML/XHTML | None needed | No | Fixed in 0.3: SVG names keep their camelCase |
| 18 | The published CLI (0.2.0) rejects `README.md` and `docs/` inside a theme folder (SN3002). Fixed on `main` by #17, not yet on npm | The example folders validate with the CLI built from `main`; the pushed copies have no README | No | Fixed in 0.3.0 on npm |
| 19 | Platform, not SDK: right after a publish, the first storefront render can fail (cold artifact fetch inside the 3 s budget is the likely cause) and the page silently serves the **legacy** theme, with no log line. Seen twice (console ar, esports en). Later requests render HK2 | Every live screenshot is checked for `data-hk-theme` before it is used | No, but a shopper can briefly see the old theme, and nothing records it | Platform, not SDK; not re-checked by this update |

## Status

- None of these gaps blocked a design; all three themes were built and pushed
  with `@hekana/sneferu@0.2.0` from npm.
- 0.3 fixed 1, 2, 4-10, 12 and 14-18, and most of 11. The themes (1.1.0) use
  the fixes: the workaround column above describes 1.0.1.
- Still open: 3 (cart and add-to-cart tags), 13 (carousel, theme JS), the
  platform/region part of 11, and 19 (platform).
- Colours: every hex and rgb value in the three themes and the product art
  was checked by hue; none falls in the purple to pink range (260-345°).
