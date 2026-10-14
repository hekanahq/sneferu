# Changelog

## 0.7.0

- Version aligned with the rest of the Sneferu group (the plugin is now in the changesets fixed group). No code changes since 0.6.1.

## 0.6.1

### Patch Changes

- Updated dependencies [e598653]
  - @hekana/sneferu-compiler@0.7.0

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.
- Updated dependencies
  - @hekana/sneferu-compiler@0.5.1

## 0.5.0

### Minor Changes

- No functional changes; versions follow the fixed group.
- Updated dependencies
  - @hekana/sneferu-compiler@0.5.0

## 0.4.2

### Patch Changes

- Theme files end in `.snf`. `.sneferu` still works everywhere and a theme may mix the two; one name in both forms in one folder is SN3044. `sneferu init` writes `.snf`; `render 'name'` and section types resolve either; messages name the real file. The Prettier plugin registers `.snf`.
- Updated dependencies
  - @hekana/sneferu-compiler@0.4.2

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
