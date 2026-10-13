# Sneferu

Build themes for [Hekana](https://hekana.com) stores. Sneferu is Hekana's theme
language and SDK: HTML with `hk-*` tags, `{{ }}` and `{% if/for/render %}`,
compiled to a safe artifact and previewed locally with sample data.

**Documentation: [hekana.dev](https://hekana.dev)** (guides, tutorials, tag and
language reference, [llms.txt](https://hekana.dev/llms.txt) for AI assistants).

## Quick start

Node.js 20 or newer.

    npx @hekana/sneferu init my-theme
    cd my-theme
    npx @hekana/sneferu dev        # http://127.0.0.1:4100 (English; ?locale=ar for Arabic)
    npx @hekana/sneferu validate
    npx @hekana/sneferu build      # dist/<id>-<version>.sneferu.json

Or install it once with `npm i -g @hekana/sneferu` for the `sneferu` and `snf` commands.

Commands: `init`, `dev`, `validate`, `build`, `format` (`--check` for CI), `login`,
`logout`, `whoami`, `push` (with a developer key; `--dev-store` publishes on your dev store).

To push you need a Hekana account (create one at https://dashboard.hekana.com/signup; the
partner portal has no sign-up of its own), then turn on developer access at
https://partners.hekana.com/developers. `sneferu login` saves a developer key and revokes
the previously saved key for the same API. The server allows 30 pushes per hour per key and
60 per developer, at most 5 versions waiting for review and at most 20 theme packages per
developer. Reserved slugs: `starter`, `hekana`, `default`, `admin`, `official`, `theme`, `themes`, `test`, `demo`, `preview`, and anything starting with `hekana-`.

## Packages

| npm package | What it is |
|---|---|
| [`@hekana/sneferu`](https://www.npmjs.com/package/@hekana/sneferu) | The CLI: `init`, `dev`, `validate`, `build`, `format`, `login`, `push` |
| [`@hekana/sneferu-core`](https://www.npmjs.com/package/@hekana/sneferu-core) | Parser, tag and filter definitions, diagnostics |
| [`@hekana/sneferu-compiler`](https://www.npmjs.com/package/@hekana/sneferu-compiler) | Compiles a theme folder into one artifact; theme migrations |
| [`@hekana/sneferu-runtime`](https://www.npmjs.com/package/@hekana/sneferu-runtime) | Renders a compiled artifact with store data |
| [`@hekana/sneferu-components`](https://www.npmjs.com/package/@hekana/sneferu-components) | The built-in `hk-*` components and icons |
| [`@hekana/sneferu-controllers`](https://www.npmjs.com/package/@hekana/sneferu-controllers) | Variant picker, add to cart and cart drawer, with no theme JavaScript |
| [`@hekana/sneferu-templates-default`](https://www.npmjs.com/package/@hekana/sneferu-templates-default) | The default theme `init` starts from |
| [`@hekana/prettier-plugin-sneferu`](https://www.npmjs.com/package/@hekana/prettier-plugin-sneferu) | Prettier plugin for `.snf` / `.sneferu` files |

## Example themes

Six complete themes in [examples/themes](examples/themes), each with a README,
screenshots and a live demo store:
[Arcade](examples/themes/arcade), [Console](examples/themes/console) and
[Esports](examples/themes/esports) (gaming top-ups and gift cards);
[Bento](examples/themes/bento), [Creator](examples/themes/creator) and
[License](examples/themes/license) (digital products). The
[gaming](https://hekana.dev/guide/tutorial-gaming-store) and
[digital store](https://hekana.dev/guide/tutorial-digital-store) tutorials walk
through Arcade and Bento.

## VS Code extension

[packages/vscode-sneferu](packages/vscode-sneferu): syntax highlighting,
completion, hover docs, live diagnostics, theme checks, formatting and a live
preview. Install it from the .vsix linked in
[Editor setup: VS Code](https://hekana.dev/guide/vscode).

## Development

    pnpm install
    pnpm build
    pnpm test

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
11. [Tutorial: build a digital products store theme](docs/guide/11-tutorial-digital-store.mdx): the Bento example theme from mockup to live store; Creator and License in [examples/themes](examples/themes)
12. [Tutorial: build a gaming store theme](docs/guide/12-tutorial-gaming-store.mdx): the Arcade example theme from mockup to live store; Console and Esports in [examples/themes](examples/themes)
13. [Editor setup: VS Code](docs/guide/13-editor-setup-vscode.mdx): the Sneferu extension: completion, hover, live diagnostics, theme checks, formatting and a live preview ([packages/vscode-sneferu](packages/vscode-sneferu))
14. [Icons and search](docs/guide/14-icons-and-search.mdx): `hk-icon` with the bundled Lucide set, icons in buttons, right-to-left mirroring; `hk-search-form`, the only form a theme can render
15. [Images and assets](docs/guide/15-images-and-assets.mdx): which assets the store serves, `asset_url()`, images in CSS, SVG rules, responsive images with `srcset`
16. [Page types](docs/guide/16-page-types.mdx): `product`, `collection`, `search`, `cart`, `page` and `404` templates, alternates such as `product.codes`, and the objects each one has in scope (`product`, `collection`, `paginate`, `search`, `page`, `request`, `localization`)
17. [Cart and controllers](docs/guide/17-cart-and-controllers.mdx): `@hekana/sneferu-controllers`, the variant picker, add to cart and the cart drawer, with no theme JavaScript
18. [Header, footer and section groups](docs/guide/18-section-groups.mdx): shared groups placed in the layout and edited once for the whole store
19. [Make everything editable](docs/guide/19-make-everything-editable.mdx): where every word, link, image and colour of a theme comes from
20. [Menus](docs/guide/20-menus.mdx): `menu('main')` and the `menu` setting: the store's navigation in the header and footer, with the active link marked
21. [Updating a theme: migrations](docs/guide/21-updating-a-theme-migrations.mdx): `migrations/*.json` renames and removals, and `applyMigrations` for hosts

## Reference

- [Tag reference](docs/reference/tags.mdx): every `hk-*` tag and prop (generated: `pnpm docs:tags`)
- [Language reference](docs/language.mdx): grammar, directives, scope, filters
- [Diagnostics](docs/diagnostics.mdx): every SN code and its fix

## Contributing and security

Issues are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Report security
problems privately as described in [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE), copyright (c) 2026 Hekana.
