# Changelog

## 0.4.1

### Patch Changes

- Version aligned with 0.4.1; no functional changes.

## 0.4.0

### Minor Changes

- Version aligned with the other packages; no format changes.

## 0.3.0

### Minor Changes

- Version bump to keep the packages in lockstep with the 0.3 language changes; formatting handles the new `hk-*` tags and localized settings.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
