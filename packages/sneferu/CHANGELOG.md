# Changelog

## 0.8.0

### Minor Changes

- The checkout page is part of the theme. New page type `checkout` (`templates/checkout.snf`) and five privileged tags, `hk-checkout-layout`, `hk-checkout-contact`, `hk-checkout-shipping`, `hk-checkout-summary` and `hk-checkout-payment`, that mark where Hekana's own checkout sits and how it is laid out (columns, summary position, sticky summary, density, card style, part headings, the confirm button text). The theme's header and footer groups, tokens, fonts and CSS surround it; the fields, totals, delivery rates and payment stay Hekana's. Sections for the page list `checkout` in their `templates`; a section for any other page can no longer be placed on it. New compiler rules SN2030 to SN2041 (the tags only on the checkout page, once each, the payment part required, only layout, typography, image and link tags, no cart or product data, no prices, no media players, no catalogue pickers, links stay in the store, no inline style, no reserved attributes, the layout only inside page structure) and runtime diagnostics SN4015 to SN4017. `splitCheckout(html)` in the runtime finds the layout in a rendered page for the host (null when the page has no layout holding the payment part, or the layout sits inside a link or toggle: the host then renders its default checkout), and `restrictCheckoutPage` keeps the whole page's links inside the store and drops inline styles. The default store ships a themed checkout (`templates/checkout`, section `checkout-main`, block `checkout-note`) that `sneferu init` scaffolds, the six example themes have their own (2.1.0), and `sneferu dev` serves `/checkout` with labelled stub boxes where the platform's checkout will sit.

### Patch Changes

- Updated dependencies
  - @hekana/sneferu-core@0.8.0
  - @hekana/sneferu-components@0.8.0
  - @hekana/sneferu-compiler@0.8.0
  - @hekana/sneferu-runtime@0.8.0
  - @hekana/sneferu-templates-default@0.8.0
  - @hekana/prettier-plugin-sneferu@0.8.0
  - @hekana/sneferu-controllers@0.8.0

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
