# Changelog

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
