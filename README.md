# Sneferu

Build themes for Hekana stores. Sneferu is Hekana's theme language and SDK —
HTML with `hk-*` tags, `{{ }}` and `{% if/for/render %}`, compiled to a safe
artifact and previewed locally.

    npx @hekana/sneferu init my-theme
    cd my-theme
    npx @hekana/sneferu dev        # http://127.0.0.1:4100 (English; ?locale=ar for Arabic)
    npx @hekana/sneferu validate
    npx @hekana/sneferu build      # dist/<id>-<version>.sneferu.json

Commands: `init`, `dev`, `validate`, `build`, `format` (`--check` for CI), `login`, `logout`, `whoami`, `push` (with a developer key; `--dev-store` publishes on your dev store).

To push you need a Hekana account (create one at https://dashboard.hekana.com/signup; the
partner portal has no sign-up of its own), then turn on developer access at
https://partners.hekana.com/developers. `sneferu login` saves a developer key and revokes
the previously saved key for the same API. The server allows 30 pushes per hour per key and
60 per developer, at most 5 versions waiting for review and at most 20 theme packages per
developer. Reserved slugs: `starter`, `hekana`, `default`, `admin`, `official`, `theme`, `themes`, `test`, `demo`, `preview`, and anything starting with `hekana-`.

Install: `npx @hekana/sneferu <command>` (Node.js 20 or newer), or `npm install -g @hekana/sneferu` for the `sneferu` / `snf` commands.

## Developer guide

1. [Getting started](docs/guide/01-getting-started.mdx): install, `init`, `dev`, `validate`, `build`
2. [Theme structure](docs/guide/02-theme-structure.mdx): every folder and file, `theme.json`, limits
3. [Sections and blocks](docs/guide/03-sections-and-blocks.mdx): `<hk-schema>`, field types, settings coercion, blocks
4. [Data and expressions](docs/guide/04-data-and-expressions.mdx): scope, lookups, filters, truthiness, loops
5. [Styling and responsive](docs/guide/05-styling-and-responsive.mdx): tokens, theme CSS, breakpoints, RTL
6. [Security and limits](docs/guide/06-security-and-limits.mdx): allow-list, URLs, render budgets
7. [Publishing](docs/guide/07-publishing.mdx): `sneferu push`, versions, dev store, review
8. [Cookbook](docs/guide/08-cookbook.mdx): announcement bar, hero, feature row, product grid, subscription plans, each with a picture of the result
9. [Get an API key](docs/guide/09-get-an-api-key.mdx): developer access, `sneferu login`, `HEKANA_TOKEN` for CI
10. [Format your theme](docs/guide/10-format-your-theme.mdx): `sneferu format`, `@hekana/prettier-plugin-sneferu`, VS Code format on save

## Reference

- [Tag reference](docs/reference/tags.mdx): every `hk-*` tag and prop (generated: `pnpm docs:tags`)
- [Language reference](docs/language.mdx): grammar, directives, scope, filters
- [Diagnostics](docs/diagnostics.mdx): every SN code and its fix
