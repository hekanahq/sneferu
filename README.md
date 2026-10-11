# Sneferu

Build themes for Hekana stores. Sneferu is Hekana's theme language and SDK —
HTML with `hk-*` tags, `{{ }}` and `{% if/for/render %}`, compiled to a safe
artifact and previewed locally.

    npx @hekana/sneferu init my-theme
    cd my-theme
    npx @hekana/sneferu dev        # http://127.0.0.1:4100 (Arabic, ?locale=en)
    npx @hekana/sneferu validate
    npx @hekana/sneferu build      # dist/<id>-<version>.sneferu.json

Commands: `init`, `dev`, `validate`, `build`, `push` (admin only during phase 1b).

The npm package is not published yet. From a clone: `pnpm install && pnpm build`,
then `node packages/sneferu/dist/cli.js <command> <theme folder>`.

## Developer guide

1. [Getting started](docs/guide/01-getting-started.md): install, `init`, `dev`, `validate`, `build`
2. [Theme structure](docs/guide/02-theme-structure.md): every folder and file, `theme.json`, limits
3. [Sections and blocks](docs/guide/03-sections-and-blocks.md): `<hk-schema>`, field types, settings coercion, blocks
4. [Data and expressions](docs/guide/04-data-and-expressions.md): scope, lookups, filters, truthiness, loops
5. [Styling and responsive](docs/guide/05-styling-and-responsive.md): tokens, theme CSS, breakpoints, RTL
6. [Security and limits](docs/guide/06-security-and-limits.md): allow-list, URLs, render budgets
7. [Publishing](docs/guide/07-publishing.md): `sneferu push`, versions, install and publish
8. [Cookbook](docs/guide/08-cookbook.md): announcement bar, hero, feature row, product grid, subscription plans, each with a picture of the result

## Reference

- [Tag reference](docs/reference/tags.md): every `hk-*` tag and prop (generated: `pnpm docs:tags`)
- [Language reference](docs/language.md): grammar, directives, scope, filters
- [Diagnostics](docs/diagnostics.md): every SN code and its fix
