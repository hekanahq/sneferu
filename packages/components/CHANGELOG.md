# Changelog

## 0.3.0

### Minor Changes

- New tags: `hk-icon` (71 Lucide icons, ISC licence, shipped as `LICENSE-lucide`), `hk-search-form`, `hk-rich-text` (sanitised) and `hk-part`.
- `hk-button` supports icons and builds store-relative links with the locale prefix.
- Product card exposes badge and actions parts.
- `hk-image` and product cards emit `srcset` plus `width` and `height` attributes from props.
- Image variants served by the asset contract.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
