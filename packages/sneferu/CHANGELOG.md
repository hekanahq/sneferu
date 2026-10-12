# Changelog

## 0.4.1

### Patch Changes

- CLI reports 0.4.1; picks up the compiler, runtime and dev 404 page changes.
- Example themes are now 1.2.0 with every page type.

## 0.4.0

### Minor Changes

- `init` scaffolds the complete default store; `init --template starter`. `dev` serves every page type (`/products/<handle>`, `/category/<handle>`, `/search`, `/cart`, `/pages/<handle>`, 404, `/en` and `/ar` prefixes). `format` also formats `groups/*.json`.

## 0.3.0

### Minor Changes

- `sneferu init` takes the theme name from the target folder.
- Dev server sample data includes category collections; assets and images are served.
- `build` and `validate` report the new diagnostics (SN2012 to SN2015, SN3032 to SN3034).
- Starter theme updated for the 0.3 contract.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
