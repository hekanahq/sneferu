# Changelog

## 0.10.0

## 0.9.1

## 0.9.0

0.8.0 was the reverted checkout-template release (#63, #67) and stays on npm under the `next` tag only; this release supersedes it.

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
