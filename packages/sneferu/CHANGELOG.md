# Changelog

## 0.5.0

### Minor Changes

- `menu()` lookups, the `menu` setting type and `pageDependencies().menus`; sample data includes menus for `dev`.
- Theme migrations: `migrations/*.json` (SN3045, SN3046, SN3047) are built into the artifact (`artifact.migrations`).
- Default store: header and footer menus, three levels, opt-in for saved trees; hash links never active. Example themes 1.3.0.
- Host impact: `RenderContext.menus`; `request.path` is in the same URL space as menu links; apply migrations on theme update.
- Updated dependencies
  - @hekana/sneferu-core@0.5.0
  - @hekana/sneferu-compiler@0.5.0
  - @hekana/sneferu-runtime@0.5.0
  - @hekana/sneferu-components@0.5.0
  - @hekana/prettier-plugin-sneferu@0.5.0
  - @hekana/sneferu-templates-default@0.5.0

## 0.4.2

### Patch Changes

- Theme files end in `.snf`. `.sneferu` still works everywhere and a theme may mix the two; one name in both forms in one folder is SN3044. `sneferu init` writes `.snf`; `render 'name'` and section types resolve either; messages name the real file. The Prettier plugin registers `.snf`.
- Updated dependencies
  - @hekana/sneferu-core@0.4.2
  - @hekana/sneferu-compiler@0.4.2
  - @hekana/prettier-plugin-sneferu@0.4.2
  - @hekana/sneferu-templates-default@0.4.2
  - @hekana/sneferu-components@0.4.2
  - @hekana/sneferu-controllers@0.4.2
  - @hekana/sneferu-runtime@0.4.2

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
