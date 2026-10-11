# Changelog

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
