# Changelog

## 0.2.1

- Licensed under MIT; the repository and issue links point at the public repo, github.com/hekanahq/sneferu.

## 0.2.0

- Theme files end in `.snf` now. `.sneferu` still works: the language, file icon, highlighting, completion, diagnostics, theme checks, formatting, the preview and go to definition handle both, and `render 'name'` or a section `type` opens whichever file the theme has.

## 0.1.0

First release.

- The `sneferu` language for `*.sneferu`: highlighting for HTML, `hk-*` tags, `{{ }}`, `{% %}` and the JSON inside `<hk-schema>`; comment toggling, bracket and tag auto-closing, linked editing of tag pairs, snippets.
- Language server: completion for tags, props and their values, filters, lookups, objects, settings, translation keys and snippet names; hover docs; live diagnostics from the Sneferu compiler with links to every SN code; go to definition and document links; formatting with `@hekana/prettier-plugin-sneferu`.
- Theme checks: UnusedSetting, UndefinedSetting, TranslationKeyExists, MatchingTranslations (with a quick fix), MissingLocaleFile, ImgAltText (with a quick fix), SchemaLabelEnglish, AssetSize, MissingAsset, OrphanedSnippet.
- JSON schema for `theme.json`.
- Live preview: `sneferu dev` in a panel beside the editor with desktop, tablet and phone widths, Arabic and English, template switching, reload on save and click to open a section's file.
- Commands: Validate Theme, Format Theme, Build Theme, Push to Dev Store, Log In, Who Am I.
