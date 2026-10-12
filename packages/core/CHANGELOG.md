# Changelog

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
