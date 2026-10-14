# Changelog

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
