# Changelog

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

### Patch Changes

- Updated dependencies [cee5d13]
  - @hekana/sneferu-core@0.9.0

## 0.7.0

### Minor Changes

- 9e70ef1: New `tag_values` filter: `{{ product.tags | tag_values: 'top' }}` returns the values of the tags written `top:Bergamot`, so a template can build structured content (fragrance notes, materials) from plain product tags.

### Patch Changes

- e598653: A template's default sections now keep blocks nested inside blocks (for example the checklist lines of a plan), so they render on a new store and their collections and products are fetched.
- Updated dependencies [72893bc]
- Updated dependencies [9e70ef1]
  - @hekana/sneferu-core@0.7.0

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.
- Updated dependencies
  - @hekana/sneferu-core@0.5.1

## 0.5.0

### Minor Changes

- `menu()` lookup renders menus from `RenderContext.menus`; `pageDependencies().menus` reports the menus a page uses; hash links are never active; `request.path` stays in the same URL space as menu links.
- Host impact: provide `RenderContext.menus`, and apply migrations when a theme is updated (`applyMigrations`).
- Updated dependencies
  - @hekana/sneferu-core@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies
  - @hekana/sneferu-core@0.4.2

## 0.4.1

### Patch Changes

- Cart lines honour `minQuantity` and `quantityStep`; new text keys `increase`, `decrease`, `add_failed`; raw errors are never shown.
- `onColor` chooses the higher-contrast text colour, and a theme `on-primary`/`on-accent` token wins.
- Host impact: `CartHost` `t()` must provide `increase`, `decrease` and `add_failed`; `CartLine` may carry `minQuantity` and `quantityStep`.

## 0.4.0

### Minor Changes

- `renderPage` options `groups`, `locale_overrides`, `fontBase`, `request`, `localization`; per-page-type scope; nested blocks (`block.blocks`).
- `RenderResult.tokenCss` and `fontCss`; `themeTokenCss` and `themeFontCss` take the resolved theme settings; the default store's CSS is added when its sections render.
- `pageDependencies` reports `products` and reads groups; `resolveThemeSettings` exported.
- `<hk-section-group>` renders only from the layout (SN4013 elsewhere) and an artifact placing it anywhere else is rejected at load (SN9016); group sections honour the section's `templates` list (SN4014).

## 0.3.0

### Minor Changes

- `themeFontCss` emits `@font-face` and font stacks for curated fonts; Arabic falls back to Cairo.
- `url()` helper, locale-aware, so store-relative links gain `/en` on English pages.
- Money filter accepts `'whole'` and `'major'` formats and honours `money.format` from `theme.json`.
- `collection(section.settings.x)`, `collections()` lookup and loop limits taken from settings.
- `pageDependencies()` for a rendered page.
- Localized `{ ar, en }` text settings resolve by locale.
- Asset handling: images served, `asset_url` normalisation.
- Responsive images: `pickVariant` selects a variant by width and `srcset` is built from available variants.
- `hk-rich-text` output passes through the sanitiser.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
