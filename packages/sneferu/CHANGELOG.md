# Changelog

## 0.10.2

### Patch Changes

- Updated dependencies [124763f]
  - @hekana/sneferu-components@0.10.2
  - @hekana/sneferu-compiler@0.10.2
  - @hekana/sneferu-controllers@0.10.2
  - @hekana/sneferu-core@0.10.2
  - @hekana/sneferu-runtime@0.10.2
  - @hekana/sneferu-templates-default@0.10.2
  - @hekana/prettier-plugin-sneferu@0.10.2

## 0.10.1

### Patch Changes

- Updated dependencies [0f32b3d]
  - @hekana/sneferu-runtime@0.10.1
  - @hekana/sneferu-compiler@0.10.1
  - @hekana/sneferu-components@0.10.1
  - @hekana/sneferu-controllers@0.10.1
  - @hekana/sneferu-core@0.10.1
  - @hekana/sneferu-templates-default@0.10.1
  - @hekana/prettier-plugin-sneferu@0.10.1

## 0.10.0

### Minor Changes

- cbf0f2d: `<hk-variant-picker display="swatches|auto">`: photo tiles and colour dots from the option's swatches and presentation. New `<hk-inline-checkout>`: the store's own checkout in a frame on a themed page (no fields from the theme), with the `inline-checkout` controller (`MSG_CHECKOUT_*`), and a placeholder in `sneferu dev`.

### Patch Changes

- Updated dependencies [e317d94]
- Updated dependencies [cbf0f2d]
  - @hekana/sneferu-components@0.10.0
  - @hekana/sneferu-controllers@0.10.0
  - @hekana/prettier-plugin-sneferu@0.10.0
  - @hekana/sneferu-compiler@0.10.0
  - @hekana/sneferu-core@0.10.0
  - @hekana/sneferu-runtime@0.10.0
  - @hekana/sneferu-templates-default@0.10.0

## 0.9.1

### Patch Changes

- 0926a44: `sneferu login` now sends you to hekana.dev/device to approve (the address comes from the API). The developer portal moved to hekana.dev: `login`, `logout` and `whoami` point at hekana.dev/account for keys and the dev store, and the docs (Get an API key, Push and publish, README) say so. Older CLIs keep working: the old partners.hekana.com/developers/device link redirects to hekana.dev/device with the code.
  - @hekana/sneferu-compiler@0.9.1
  - @hekana/sneferu-components@0.9.1
  - @hekana/sneferu-controllers@0.9.1
  - @hekana/sneferu-core@0.9.1
  - @hekana/sneferu-runtime@0.9.1
  - @hekana/sneferu-templates-default@0.9.1
  - @hekana/prettier-plugin-sneferu@0.9.1

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

### Minor Changes

- cee5d13: Checkout branding. `theme.json` takes an optional `checkout` block (colours, font, radius, button shape, logo, header and footer, a trust note) that brands Hekana's own checkout; there is no checkout template or tag. The compiler validates it, normalises colours, clamps the radius and drops what is invalid (warnings SN3049-SN3057); `settings.checkout` is reserved (SN3048). Core exports `CHECKOUT_SETTINGS`, `CHECKOUT_SETTING_IDS` and `checkoutDefaults(tokens)`. New guide page: Checkout branding. The unused `checkout` tag category is removed.

### Patch Changes

- fb1122f: Document `collection('related')` (the product page's related products: same category, the product itself left out, at most 8) and serve it from `sneferu dev` on product routes.
- Updated dependencies [cee5d13]
  - @hekana/sneferu-core@0.9.0
  - @hekana/sneferu-compiler@0.9.0
  - @hekana/sneferu-components@0.9.0
  - @hekana/sneferu-runtime@0.9.0
  - @hekana/prettier-plugin-sneferu@0.9.0
  - @hekana/sneferu-controllers@0.9.0
  - @hekana/sneferu-templates-default@0.9.0

## 0.7.0

### Minor Changes

- bd5c8d7: `sneferu init` writes an `AGENTS.md` (and a `CLAUDE.md` that imports it) into every new theme, so an AI coding agent opened in the folder knows the commands, the files and the rules. `validate`, `build`, `push`, `format` and the VS Code extension skip `AGENTS.md` and `CLAUDE.md` at the top of a theme, like `README.md`: the compiled theme is unchanged.

### Patch Changes

- e598653: Starter: the skip link is hidden with a clip pattern that works in both directions (it was parked 10,000 px off screen on Arabic pages), the header search panel stays inside a 390 px screen, and the hero and product note read as real copy from `locales/ar.json` and `locales/en.json`. The five example themes get the same skip link fix.
- Updated dependencies [72893bc]
- Updated dependencies [e598653]
- Updated dependencies [e598653]
- Updated dependencies [e598653]
- Updated dependencies [9e70ef1]
  - @hekana/sneferu-core@0.7.0
  - @hekana/sneferu-runtime@0.7.0
  - @hekana/sneferu-compiler@0.7.0
  - @hekana/sneferu-templates-default@0.7.0
  - @hekana/sneferu-components@0.7.0
  - @hekana/prettier-plugin-sneferu@0.6.1
  - @hekana/sneferu-controllers@0.7.0

## 0.6.0

### Minor Changes

- `sneferu init --template <name>` starts a project from a complete example store: arcade, console, esports, creator, license or bento (default: starter). `sneferu init --list` shows the catalogue. The templates are bundled in the package.
- The six example themes are now complete stores (2.0.0): their own templates for every page type and editable announcement, header and footer groups.
- Updated dependencies
  - @hekana/sneferu-core@0.6.0
  - @hekana/sneferu-compiler@0.6.0
  - @hekana/sneferu-runtime@0.6.0
  - @hekana/sneferu-components@0.6.0
  - @hekana/sneferu-controllers@0.6.0
  - @hekana/sneferu-templates-default@0.6.0
  - @hekana/prettier-plugin-sneferu@0.6.0

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.
- Updated dependencies
  - @hekana/sneferu-core@0.5.1
  - @hekana/sneferu-compiler@0.5.1
  - @hekana/sneferu-runtime@0.5.1
  - @hekana/sneferu-components@0.5.1
  - @hekana/sneferu-controllers@0.5.1
  - @hekana/sneferu-templates-default@0.5.1
  - @hekana/prettier-plugin-sneferu@0.5.1

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
