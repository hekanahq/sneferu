# Changelog

## 0.10.1

### Patch Changes

- @hekana/sneferu-core@0.10.1
- @hekana/sneferu-templates-default@0.10.1

## 0.10.0

### Patch Changes

- @hekana/sneferu-core@0.10.0
- @hekana/sneferu-templates-default@0.10.0

## 0.9.1

### Patch Changes

- @hekana/sneferu-core@0.9.1
- @hekana/sneferu-templates-default@0.9.1

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

### Minor Changes

- cee5d13: Checkout branding. `theme.json` takes an optional `checkout` block (colours, font, radius, button shape, logo, header and footer, a trust note) that brands Hekana's own checkout; there is no checkout template or tag. The compiler validates it, normalises colours, clamps the radius and drops what is invalid (warnings SN3049-SN3057); `settings.checkout` is reserved (SN3048). Core exports `CHECKOUT_SETTINGS`, `CHECKOUT_SETTING_IDS` and `checkoutDefaults(tokens)`. New guide page: Checkout branding. The unused `checkout` tag category is removed.

### Patch Changes

- Updated dependencies [cee5d13]
  - @hekana/sneferu-core@0.9.0
  - @hekana/sneferu-templates-default@0.9.0

## 0.7.0

### Minor Changes

- e598653: New error SN2020: a `{% if %}`, `{% for %}` or `{% render %}` inside an attribute value is refused. It used to pass `validate` and render as stray class names. The message says to print a value with `{{ }}` or to put the `{% if %}` around two versions of the element.

### Patch Changes

- Updated dependencies [72893bc]
- Updated dependencies [e598653]
- Updated dependencies [9e70ef1]
  - @hekana/sneferu-core@0.7.0
  - @hekana/sneferu-templates-default@0.7.0

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.
- Updated dependencies
  - @hekana/sneferu-core@0.5.1
  - @hekana/sneferu-templates-default@0.5.1

## 0.5.0

### Minor Changes

- `menu()` lookup and the `menu` setting type compile and validate; `pageDependencies().menus` lists the menu handles a page needs.
- SN9017: stored-IR argument validation for `collection`, `product` and `menu`.
- Default store header and footer menus are opt-in for saved trees; hash links are never marked active.
- Theme migrations: `migrations/*.json` is compiled and checked (SN3045, SN3046, SN3047); the artifact carries `migrations`, validated by `checkMigrationsShape`; `applyMigrations` is re-exported.
- Updated dependencies
  - @hekana/sneferu-core@0.5.0
  - @hekana/sneferu-templates-default@0.5.0

## 0.4.2

### Patch Changes

- Theme files end in `.snf`. `.sneferu` still works everywhere and a theme may mix the two; one name in both forms in one folder is SN3044. `sneferu init` writes `.snf`; `render 'name'` and section types resolve either; messages name the real file. The Prettier plugin registers `.snf`.
- Updated dependencies
  - @hekana/sneferu-core@0.4.2
  - @hekana/sneferu-templates-default@0.4.2

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
