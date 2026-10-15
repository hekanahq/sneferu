# Changelog

## 0.10.0

### Minor Changes

- e317d94: `<hk-add-to-cart>` on a list card for a product with variants and no selected variant now renders a link to the product page (new `choose-label` prop, default "Choose options" / «اختر») instead of a button that cannot add.
- cbf0f2d: `<hk-variant-picker display="swatches|auto">`: photo tiles and colour dots from the option's swatches and presentation. New `<hk-inline-checkout>`: the store's own checkout in a frame on a themed page (no fields from the theme), with the `inline-checkout` controller (`MSG_CHECKOUT_*`), and a placeholder in `sneferu dev`.

### Patch Changes

- @hekana/sneferu-core@0.10.0

## 0.9.1

### Patch Changes

- @hekana/sneferu-core@0.9.1

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

### Patch Changes

- Updated dependencies [cee5d13]
  - @hekana/sneferu-core@0.9.0

## 0.7.0

### Patch Changes

- Updated dependencies [72893bc]
- Updated dependencies [9e70ef1]
  - @hekana/sneferu-core@0.7.0

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.
- Updated dependencies
  - @hekana/sneferu-core@0.5.1

## 0.5.0

### Minor Changes

- `menu()` lookup and the `menu` setting type are understood by the component layer.
- Updated dependencies
  - @hekana/sneferu-core@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies
  - @hekana/sneferu-core@0.4.2

## 0.4.1

### Patch Changes

- Add-to-cart without a `url` links to the cart; `cart-items` links to `/cart` without JavaScript.
- Variant labels fall back to 'Option N'.
- `CartLine` minQuantity/quantityStep support.

## 0.4.0

### Minor Changes

- Tags: `hk-product-gallery`, `hk-pagination`, `hk-locale-switch`, `hk-variant-picker`, `hk-add-to-cart`, `hk-cart-count`, `hk-cart-items`, `hk-cart-summary`, `hk-cart-drawer`, `hk-section-group`; `hk-price` follows the picked variant.
- `hk-add-to-cart` without a safe product url links to the cart page; untitled variants show as "Option N"; the `hk-cart-items` no-JS link goes to the cart page.

## 0.3.0

### Minor Changes

- New tags: `hk-icon` (71 Lucide icons, ISC licence, shipped as `LICENSE-lucide`), `hk-search-form`, `hk-rich-text` (sanitised) and `hk-part`.
- `hk-button` supports icons and builds store-relative links with the locale prefix.
- Product card exposes badge and actions parts.
- `hk-image` and product cards emit `srcset` plus `width` and `height` attributes from props.
- Image variants served by the asset contract.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
