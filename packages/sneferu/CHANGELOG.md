# Changelog

## 0.3.0

### Minor Changes

- `sneferu init` takes the theme name from the target folder.
- Dev server sample data includes category collections; assets and images are served.
- `build` and `validate` report the new diagnostics (SN2012 to SN2015, SN3032 to SN3034).
- Starter theme updated for the 0.3 contract.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
