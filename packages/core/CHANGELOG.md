# Changelog

## 0.8.0

### Minor Changes

- The checkout page is part of the theme. New page type `checkout` (`templates/checkout.snf`) and five privileged tags, `hk-checkout-layout`, `hk-checkout-contact`, `hk-checkout-shipping`, `hk-checkout-summary` and `hk-checkout-payment`, that mark where Hekana's own checkout sits and how it is laid out (columns, summary position, sticky summary, density, card style, part headings, the confirm button text). The theme's header and footer groups, tokens, fonts and CSS surround it; the fields, totals, delivery rates and payment stay Hekana's. Sections for the page list `checkout` in their `templates`; a section for any other page can no longer be placed on it. New compiler rules SN2030 to SN2041 (the tags only on the checkout page, once each, the payment part required, only layout, typography, image and link tags, no cart or product data, no prices, no media players, no catalogue pickers, links stay in the store, no inline style, no reserved attributes, the layout only inside page structure) and runtime diagnostics SN4015 to SN4017. `splitCheckout(html)` in the runtime finds the layout in a rendered page for the host (null when the page has no layout holding the payment part, or the layout sits inside a link or toggle: the host then renders its default checkout), and `restrictCheckoutPage` keeps the whole page's links inside the store and drops inline styles. The default store ships a themed checkout (`templates/checkout`, section `checkout-main`, block `checkout-note`) that `sneferu init` scaffolds, the six example themes have their own (2.1.0), and `sneferu dev` serves `/checkout` with labelled stub boxes where the platform's checkout will sit.

## 0.7.0

### Minor Changes

- 72893bc: Font catalogue: 14 new families. Latin serif (Playfair Display, Cormorant Garamond, Fraunces), condensed display (Oswald, Bebas Neue), rounded (Nunito, Fredoka), modern sans (DM Sans, Manrope), Arabic serif (Amiri, Noto Naskh Arabic) and Arabic display (El Messiri, Reem Kufi, Lalezar). Serif families get a `serif` generic fallback. Hekana must host the new files before a theme uses them.
- 9e70ef1: New `tag_values` filter: `{{ product.tags | tag_values: 'top' }}` returns the values of the tags written `top:Bergamot`, so a template can build structured content (fragrance notes, materials) from plain product tags.

## 0.6.0

### Minor Changes

- Version bump to stay in step with `@hekana/sneferu` 0.6.0. No code changes.

## 0.5.1

### Patch Changes

- Licensed under MIT. The source is public at https://github.com/hekanahq/sneferu. No code changes.

## 0.5.0

### Minor Changes

- `menu()` lookup (added to `LOOKUPS`) and the `menu` setting field type.
- SN9017: stored-IR argument validation for `collection`, `product` and `menu` lookups.
- Theme migrations: `migrations/*.json` files are described by `checkMigrationsShape` and applied with the pure `applyMigrations` helper; `RenderContext` gains `menus`.

## 0.4.2

### Patch Changes

- Theme files end in `.snf`. `.sneferu` still works everywhere and a theme may mix the two; one name in both forms in one folder is SN3044. `sneferu init` writes `.snf`; `render 'name'` and section types resolve either; messages name the real file. The Prettier plugin registers `.snf`.

## 0.4.1

### Patch Changes

- Diagnostics SN3043 (names starting with `hk-` are reserved), SN9016 (load check), SN4013 and SN4014.
- `CartLine` may carry `minQuantity` and `quantityStep`.
- Section groups only render from the layout.
- Host impact: `CartHost` `t()` must provide the keys `increase`, `decrease` and `add_failed`.

## 0.4.0

### Minor Changes

- Page types (`PAGE_TYPES`, `parseTemplateName`, `pageKeyOf`), the shared groups (`GROUP_NAMES`), `sectionAllowedOn`, `buildPaginate`, and the context types hosts pass or store: `ThemeProduct`, `ThemePaginate`, `ThemeCollectionPage`, `PageNode`, `SectionGroups`, `LocaleOverrides`.
- `tokenSettings()`: the standard theme settings for colours, fonts, radius, spacing, button style and width. `FIELD_INSPECTORS` describes every field type for the builder; new field type `data`; `Field.group`.
- `HkTag.strings`: the words a tag prints itself.

## 0.3.0

### Minor Changes

- Diagnostic codes SN2012 (collection setting does not resolve), SN2013 and SN2014 (`hk-part` misuse), SN2015 (image dimensions) and SN3032 to SN3034 (curated fonts, money format, asset contract).
- Field schema accepts localized text settings as `{ ar, en }` objects.
- Theme contract: `tokens.fonts` (curated font list), `money.format` in `theme.json`, `pageDependencies()` shape, and the `hk-rich-text` sanitiser.
- SVG output keeps camelCase element and attribute names.

Compatibility: artifacts built with 0.2 render the same HTML and CSS under 0.3, with two exceptions. `hk-button` links that are store-relative gain the `/en` prefix on English pages, and SVG element and attribute names keep their camelCase (for example `viewBox`). Responsive images now carry `width` and `height` attributes taken from props, so image markup differs from 0.2.
