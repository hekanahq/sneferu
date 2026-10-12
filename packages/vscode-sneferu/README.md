# Sneferu for Visual Studio Code

The official extension for building [Hekana](https://hekana.com) store themes with
[Sneferu](https://hekana.dev): language support, live diagnostics from the Sneferu
compiler, theme checks, formatting and a live preview beside your editor.

![Completion for hk-* tags](https://hekana.dev/developers/examples/vscode-completion@2x.webp)

## Features

### Language support

- Highlighting for `.snf` files (and the older `.sneferu`): HTML, `hk-*` tags, `{{ expression | filter }}`,
  `{% if / for / render %}` and the JSON inside `<hk-schema>`.
- Comment toggling, bracket and quote auto-closing, closing tags added when you type `>`,
  and linked editing: rename `<hk-stack>` and its `</hk-stack>` together.
- Snippets: `section`, `section-blocks`, `schema`, `setting`, `template-schema`, `if`,
  `ifelse`, `for`, `blocks`, `render`, `t`, `product-grid`, `image`, `layout`.

### Completion and hover docs

Completion for:

- `hk-*` tags (with their required props filled in) and allowed HTML elements
- props of a tag, their `tablet-` / `mobile-` variants and their values (`align="start|center|end|stretch"`, `theme:accent` for colours)
- filters after `|`, lookups (`collection('…')`, `t('…')`, `asset_url('…')` …) and objects:
  `section.settings.*` from the file's own schema, `block.settings.*`, `settings.*` from
  `theme.json`, product fields in a `{% for p in … %}` loop, `forloop.*`
- translation keys in `t('…')` and `'…' | t`, snippet names in `{% render '…' %}`,
  asset files in `asset_url('…')`
- field types and keys inside `<hk-schema>`

Hover shows the tag reference (props, types, ranges, defaults, children), filter and
lookup docs, a setting's type, label and default, and a translation in every locale.

![Hover docs](https://hekana.dev/developers/examples/vscode-hover@2x.webp)

The tag, filter and lookup data is generated from the Sneferu SDK when the extension is
built, so a new SDK release brings its new tags and filters with the next build.

### Live diagnostics

The Sneferu compiler checks the whole theme as you type, unsaved changes included. Every
problem shows its SN code, linked to [the diagnostics reference](https://hekana.dev/reference/diagnostics).

![Diagnostics](https://hekana.dev/developers/examples/vscode-diagnostics@2x.webp)

### Theme checks

Problems the compiler accepts but a reviewer would flag:

| Check | Finds |
| - | - |
| `UnusedSetting` | a schema or `theme.json` setting no template reads |
| `UndefinedSetting` | `section.settings.x` that the schema does not declare |
| `TranslationKeyExists` | a `t('key')` missing from the default locale (quick fix: add it) |
| `MatchingTranslations` | a key in `en.json` but not `ar.json`, or the other way (quick fix: add it) |
| `MissingLocaleFile` | a locale in `theme.json` without its file |
| `ImgAltText` | `<hk-image>` or `<img>` without `alt` (quick fix); `alt=""` marks a decorative image |
| `SchemaLabelEnglish` | a schema name or label with no English text |
| `AssetSize` | an asset over 500 KB (setting `sneferu.checks.assetSizeWarnKb`) |
| `MissingAsset` | `asset_url('x')` where `assets/x` does not exist |
| `OrphanedSnippet` | a snippet nothing renders |

Turn checks off with `sneferu.checks.disabled`, or all of them with `sneferu.checks.enable`.

### Navigation

Ctrl+click (Cmd+click on macOS) a `{% render 'name' %}` to open the snippet, a translation key to
jump to it in each locale file, a setting to its schema entry, a template's section
`"type"` to the section file.

### Formatting

Format Document uses Prettier and `@hekana/prettier-plugin-sneferu`, the same as
`sneferu format`, with your `.prettierrc` if the theme has one. A change that would alter
what the compiler makes of the file is refused.

### Live preview

**Sneferu: Open Preview** (or the preview button in the editor title) starts
`sneferu dev` for the theme and shows it beside the editor:

- desktop, tablet (820 px) and phone (390 px) widths
- Arabic and English
- every template in `templates/`
- reload on save
- Inspect, or Alt+click: click a section in the preview to open its file

The status bar shows the dev server; click it to stop. **Sneferu: Stop Dev Server** does
the same.

![Live preview](https://hekana.dev/developers/examples/vscode-preview@2x.webp)

### Commands

| Command | What it does |
| - | - |
| Sneferu: Open Preview | start `sneferu dev` and open the preview |
| Sneferu: Stop Dev Server | stop it |
| Sneferu: Validate Theme | check the whole theme, list problems |
| Sneferu: Format Theme | `sneferu format` on the theme |
| Sneferu: Build Theme | `sneferu build` to `dist/` |
| Sneferu: Push to Dev Store | `sneferu push --dev-store`, after you confirm |
| Sneferu: Log In / Who Am I | `sneferu login` and `sneferu whoami` in a terminal |

The extension includes the Sneferu CLI and runs it with the editor's own Node.js, so
nothing else needs installing. A theme with its own `@hekana/sneferu` in `node_modules`
uses that version instead; `sneferu.cliPath` points at any other.

## Settings

| Setting | Default | |
| - | - | - |
| `sneferu.cliPath` | | CLI to run instead of the bundled one |
| `sneferu.preview.port` | `4100` | first port tried for the dev server |
| `sneferu.preview.dataFile` | | sample data for `sneferu dev --data`, relative to the theme |
| `sneferu.preview.reloadOnSave` | `true` | reload the preview when a theme file is saved |
| `sneferu.diagnostics.delay` | `250` | ms after typing before the theme is checked |
| `sneferu.checks.enable` | `true` | run the theme checks |
| `sneferu.checks.disabled` | `[]` | checks to turn off, by name |
| `sneferu.checks.assetSizeWarnKb` | `500` | asset size budget |

## Docs

- [Editor setup: VS Code](https://hekana.dev/guide/vscode)
- [Build your first theme](https://hekana.dev/guide/getting-started)
- [Tag reference](https://hekana.dev/reference/tags) · [Language](https://hekana.dev/reference/language) · [Diagnostics](https://hekana.dev/reference/diagnostics)
