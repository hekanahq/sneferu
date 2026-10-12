# Changelog

## 0.4.1

### Patch Changes

- SN3043 reserves `hk-` names; section groups only render from the layout; SN9016 load check; SN4013 and SN4014.
- The dev server serves a 404 page.
- Add-to-cart without a `url` links to the cart; `cart-items` links to `/cart` without JavaScript.

## 0.4.0

### Minor Changes

- Page type templates (SN3035), SN2016 for page objects used on the wrong template, `product(setting)`.
- Section groups: `<hk-section-group>` (SN2017-SN2019), `groups/<name>.json` (SN3036-SN3039), nested blocks and `block_order`.
- Section `templates` allow-list (SN3040, SN3041); SN3042 for `blocks.allowed` naming a missing block.
- The artifact gains `groups`, `localeKeys`, `defaults`, token settings in `manifest.settings` and the words of the tags a theme uses in `locales`.
- The default store fills in missing page templates and group defaults (`compileTheme` option `defaults`; `withDefaults()` for stored artifacts).
- SN3043: section, block and snippet file names starting with `hk-` are reserved for the default store.

## 0.3.0

### Minor Changes

- `collection(section.settings.x)` resolves a collection chosen in section settings; unresolved settings report SN2012.
- `collections()` lookup, and loop limits that can come from settings.
- `pageDependencies()` reports the collections, products and assets a page needs.
- Template default sections with blocks.
- `hk-part` slots with product-card badge and actions parts (SN2013, SN2014).
- Curated fonts in `tokens.fonts` (SN3032), money format in `theme.json` (SN3033) and asset checks (SN3034); responsive-image checks (SN2015).
- Localized text settings (`{ ar, en }`).
- SVG output keeps camelCase names.
- Documented `:where()` zero-specificity selectors in the language reference.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
