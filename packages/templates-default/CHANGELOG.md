# Changelog

## 0.8.0

### Minor Changes

- The checkout page is part of the theme. New page type `checkout` (`templates/checkout.snf`) and five privileged tags, `hk-checkout-layout`, `hk-checkout-contact`, `hk-checkout-shipping`, `hk-checkout-summary` and `hk-checkout-payment`, that mark where Hekana's own checkout sits and how it is laid out (columns, summary position, sticky summary, density, card style, part headings, the confirm button text). The theme's header and footer groups, tokens, fonts and CSS surround it; the fields, totals, delivery rates and payment stay Hekana's. Sections for the page list `checkout` in their `templates`; a section for any other page can no longer be placed on it. New compiler rules SN2030 to SN2041 (the tags only on the checkout page, once each, the payment part required, only layout, typography, image and link tags, no cart or product data, no prices, no media players, no catalogue pickers, links stay in the store, no inline style, no reserved attributes, the layout only inside page structure) and runtime diagnostics SN4015 to SN4017. `splitCheckout(html)` in the runtime finds the layout in a rendered page for the host (null when the page has no layout holding the payment part, or the layout sits inside a link or toggle: the host then renders its default checkout), and `restrictCheckoutPage` keeps the whole page's links inside the store and drops inline styles. The default store ships a themed checkout (`templates/checkout`, section `checkout-main`, block `checkout-note`) that `sneferu init` scaffolds, the six example themes have their own (2.1.0), and `sneferu dev` serves `/checkout` with labelled stub boxes where the platform's checkout will sit.

## 0.7.0

### Patch Changes

- e598653: Starter: the skip link is hidden with a clip pattern that works in both directions (it was parked 10,000 px off screen on Arabic pages), the header search panel stays inside a 390 px screen, and the hero and product note read as real copy from `locales/ar.json` and `locales/en.json`. The five example themes get the same skip link fix.

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.

## 0.5.0

### Minor Changes

- The default store header and footer render menus (three levels in the header), opt-in for saved trees.
- Example themes 1.3.0 use menus in their headers and footers.

## 0.4.2

### Patch Changes

- Theme files end in `.snf`. `.sneferu` still works everywhere and a theme may mix the two; one name in both forms in one folder is SN3044. `sneferu init` writes `.snf`; `render 'name'` and section types resolve either; messages name the real file. The Prettier plugin registers `.snf`.

## 0.4.1

### Patch Changes

- Default store cart line layout and token-coloured search.
- Section groups placed in the layout only.

## 0.4.0

### Minor Changes

- First release: the default store (templates for every page type, header, footer, announcement bar, product page blocks, snippets, tokens, locales, CSS) that the compiler borrows from and `sneferu init` scaffolds.
