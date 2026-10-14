# Changelog

## 0.8.0

### Minor Changes

- The checkout page is part of the theme. New page type `checkout` (`templates/checkout.snf`) and five privileged tags, `hk-checkout-layout`, `hk-checkout-contact`, `hk-checkout-shipping`, `hk-checkout-summary` and `hk-checkout-payment`, that mark where Hekana's own checkout sits and how it is laid out (columns, summary position, sticky summary, density, card style, part headings, the confirm button text). The theme's header and footer groups, tokens, fonts and CSS surround it; the fields, totals, delivery rates and payment stay Hekana's. Sections for the page list `checkout` in their `templates`; a section for any other page can no longer be placed on it. New compiler rules SN2030 to SN2041 (the tags only on the checkout page, once each, the payment part required, only layout, typography, image and link tags, no cart or product data, no prices, no media players, no catalogue pickers, links stay in the store, no inline style, no reserved attributes, the layout only inside page structure) and runtime diagnostics SN4015 to SN4017. `splitCheckout(html)` in the runtime finds the layout in a rendered page for the host (null when the page has no layout holding the payment part, or the layout sits inside a link or toggle: the host then renders its default checkout), and `restrictCheckoutPage` keeps the whole page's links inside the store and drops inline styles. The default store ships a themed checkout (`templates/checkout`, section `checkout-main`, block `checkout-note`) that `sneferu init` scaffolds, the six example themes have their own (2.1.0), and `sneferu dev` serves `/checkout` with labelled stub boxes where the platform's checkout will sit.

### Patch Changes

- Updated dependencies
  - @hekana/sneferu-core@0.8.0

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
