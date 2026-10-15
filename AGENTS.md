# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Copilot, Claude Code and
others) working with Sneferu, the theme language and SDK for
[Hekana](https://hekana.com) stores.

- **Building a store theme** (a new design, a section, a page template): read
  [Build a theme](#build-a-theme). It applies whether you are in this repo or
  in a theme folder anywhere else.
- **Changing the SDK itself** (compiler, runtime, CLI, docs): read
  [Work on this repo](#work-on-this-repo).

Docs: [hekana.dev](https://hekana.dev). Every page in one file:
[hekana.dev/llms-full.txt](https://hekana.dev/llms-full.txt) (index:
[llms.txt](https://hekana.dev/llms.txt)). The same pages are in
[docs/](docs) in this repo.

## Build a theme

A theme is a folder: `.snf` templates (HTML with `hk-*` tags, `{{ }}` output
and `{% if %}` / `{% for %}` / `{% render %}`), a `theme.json` manifest, locale
files and CSS. Hekana compiles the source on its servers and renders every page
of the store through it. A theme cannot run JavaScript.

### Workflow

1. **Start from a design.** A mockup image or a written brief. Follow the
   project's brand (its colours, type and tone); if there is none, ask.
2. **Scaffold.** `npm create sneferu <id>` or `npx sneferu init <id>` (Node.js 20+;
   `sneferu` is the short name of `@hekana/sneferu`). It writes a
   complete store: layout, header/footer/announcement groups, a template for
   every page type, sections, blocks, snippets, `ar` and `en` locales, tokens
   and an `AGENTS.md` for the folder. To start from a finished design instead,
   `npx sneferu init <id> --template <name>` (`init --list` shows
   `starter`, `arcade`, `console`, `esports`, `creator`, `license`, `bento`).
   The `id` is the folder name: lower-case letters, digits and `-`.
3. **Build it out.** Edit `theme.json` (name, description, `defaultLocale`,
   `locales`, `tokens.colors`, `tokens.fonts`, `money.format`), then sections
   in `sections/`, repeatable items in `blocks/`, partials in `snippets/`, the
   default sections of each page in `templates/<type>.snf`, the shared header
   and footer in `groups/*.json`, the stylesheet in `assets/*.css`, interface
   words in `locales/<lang>.json`. Replace every default text the scaffold
   came with (hero, footer, product notes, menus) with the store's own.
4. **Preview.** `npx sneferu dev` serves http://127.0.0.1:4100 with sample
   data and reloads on save. Check `/`, `/products/<handle>`, `/products`,
   `/category/<handle>`, `/search?q=a`, `/cart`, `/pages/about` and a missing
   path (404), each in every locale (`/en/...`, `/ar/...`, or `?locale=`), at a
   desktop width (1440 px) and a phone width (390 px). If port 4100 is taken use
   `--port <n>`, and confirm the page carries `data-hk-theme="<id>"` (another
   theme may be answering). `--data <file>` or `.sneferu-dev/data.json` adds your
   own `store`, `collections`, `products` (by handle; a product only has a page
   when it is listed here) and `menus`.
5. **Format and check.** `npx sneferu format`, then
   `npx sneferu validate` until it prints `✔ theme <id>@<version> is valid`.
   Each problem is `file:line:col severity CODE message`; the code's fix is in
   the [diagnostics reference](https://hekana.dev/reference/diagnostics).
6. **Compare with the design.** Screenshot the dev preview at both widths and
   both directions and compare it with the mockup, section by section.
7. **Push, only when the user asks.** The user signs in once with
   `npx sneferu login` (a browser step). Then bump `version` in
   `theme.json` and run `npx sneferu push . --package <id> --dev-store`:
   it uploads the source, and publishes it on the developer's private dev
   store. Never print, log or commit a key (`HEKANA_TOKEN`, `hk_dev_…`).

### Rules

The compiler enforces most of these, and `validate` names the one you broke.

1. **Only allowed markup.** Plain HTML from the
   [allow-list](https://hekana.dev/guide/security-and-limits) and the `hk-*`
   tags of the [tag reference](https://hekana.dev/reference/tags), with only
   the props listed there (machine-readable:
   [docs/reference/tags.json](docs/reference/tags.json)). No `<script>`,
   `<style>`, `<link>`, `<iframe>`, `<form>`, no `on*` attributes, no `{{ }}`
   inside `style="…"`, no `style` on `hk-*` tags.
2. **No JavaScript, no form controls.** Behaviour comes from tags:
   `hk-search-form` (the only form), `hk-variant-picker`, `hk-add-to-cart`,
   `hk-cart-count`, `hk-cart-items`, `hk-cart-summary`, `hk-cart-drawer`,
   `hk-product-gallery`, `hk-pagination`, `hk-locale-switch`. Menus and
   questions open with `<details>`; carousels are CSS scroll-snap.
3. **Every page type.** A shippable theme has `templates/index`, `product`,
   `collection`, `search`, `cart`, `page` and `404`, and places the
   `announcement`, `header` and `footer` groups in `layout/theme.snf`. A
   missing type falls back to the SDK's default store, which will not match
   your design.
   Checkout and payment pages are never theme-rendered: checkout is Hekana's
   own, with no template or tag. Brand it only with the `checkout` block in
   `theme.json` (see [Checkout branding](https://hekana.dev/guide/checkout-branding)).
4. **Everything merchant-editable.** Nothing visible is written into a
   template. Headings, paragraphs and button labels are `text`/`textarea`
   settings with `"localized": true` and `{ "ar": …, "en": … }` defaults; links
   and images are `link`/`image` settings; repeated items (menu links, plans,
   questions, slides) are blocks, seeded in the template's `<hk-schema>` and
   offered as `presets`; small interface words are locale keys read with
   `t('key')`; colours and fonts are tokens. Every setting has a label in both
   languages, a sensible default and a limit (`maxLength`, `min`, `max`). See
   [Make everything editable](https://hekana.dev/guide/make-everything-editable).
5. **Arabic and English, both directions.** Hekana stores are Arabic-first:
   list `ar` and `en` in `locales` with a file for each holding the same keys.
   Write CSS with logical properties (`margin-inline-start`, `padding-inline`,
   `text-align: start`). `hk-icon` arrows and chevrons mirror themselves on
   Arabic pages; flip only your own inline SVG arrows, under `[dir="rtl"]`. Give Arabic
   body text a line height of 1.6 or more and no letter-spacing. Wrap store
   links in `url()` so an English page stays English.
6. **Money.** Prices are minor units (piastres). Print them with `| money` or
   `<hk-price>`; never compute a total. `"money": { "format": "whole" }` in
   `theme.json` prints `EGP 1,290` instead of `EGP 1,290.00`.
7. **Fonts and assets.** Fonts come from `tokens.fonts`, from the
   [catalogue](https://hekana.dev/guide/styling-and-responsive#fonts) (Cairo,
   IBM Plex Sans Arabic, Tajawal, Almarai, Readex Pro and others cover Arabic).
   Font and script files in `assets/` are not served. Bundled images go through
   `asset_url('file.webp')`, at most 2 MB each, compressed (WebP or AVIF).
8. **Images.** Product images through `hk-image`, `hk-product-card`,
   `hk-product-gallery` or `| img: <width>`, which carry `srcset`. Every image
   has `alt` (empty only when decorative), and a plain `<img>` has `width` and
   `height`.
9. **CSS.** In `assets/*.css`, using the token variables
   (`var(--hk-color-accent)`, `var(--hk-radius)`, `var(--hk-space-3)`). Style
   your own classes and the stable `sn-*` hooks (`sn-btn`, `sn-product-card`,
   `sn-price`), never the numbered ones (`sn-c3`). Wrap broad resets in
   `:where()`: `[data-hk-theme='x'] a { … }` outranks every single-class rule.
10. **Accessibility.** Touch targets at least 44 px tall on phones, text
    contrast at least 4.5:1, a `label` on icon-only buttons and icons, headings
    in order, a skip link to `#main`.
11. **Budgets.** Every `{% for %}` has a small `limit:`; avoid loops inside
    loops; prefer `hk-product-grid` to hand-built grids.
12. **Names and versions.** Section, block and snippet names never start with
    `hk-` (SN3043). A name exists in one form per folder, never `hero.snf` next
    to `hero.sneferu` (SN3044). A pushed version is immutable: bump `version`
    before every push.
13. **Content.** No real brand logos or trademarks you do not own, no
    invented claims, plain and specific copy. Follow the project's brand
    guidelines for colour and tone.

### Common mistakes

| Symptom | Fix |
| - | - |
| SN2004 unknown property | The prop is not on that tag. Check the tag reference; style with `class` and CSS instead |
| SN2001 element not allowed | `button`, `input`, `form`, `script`, `style` are not allowed. Use `hk-button` (a link), `hk-search-form`, `hk-add-to-cart` |
| SN2009 `{{ }}` in `style` | Use a class, a `data-*` attribute plus CSS, a tag prop or a token |
| SN2020 `{% if %}` inside an attribute value | Directives wrap elements, not attribute values. Use `class="btn btn-{{ block.settings.style }}"` with a select setting, or put the `{% if %}` around two versions of the element |
| A link on an English page goes to the Arabic page | Wrap it: `href="{{ url(section.settings.link) }}"` |
| A rule on `.btn` is ignored | A broad reset outranks it; wrap the reset in `:where()` |
| Arabic text in a template | Move it to a localized setting default or `locales/ar.json` |
| `409 HK2_VERSION_EXISTS` on push | Versions are immutable; bump `version` in `theme.json` |
| Product, cart or 404 page looks like a different store | That template is missing; add `templates/<type>.snf` and its sections |
| An arrow points backwards on Arabic pages | `hk-icon` arrows already mirror; remove your own `scaleX(-1)` |
| The docs mention something the CLI rejects | The docs on `main` can be ahead of npm; check `npx sneferu --version` and the CHANGELOG |
| `.00` on every price | Set `"money": { "format": "whole" }` in `theme.json` |
| Fonts look like the system font | Font files in `assets/` are not served; set `tokens.fonts` |

### Done means

- `npx sneferu validate` is clean and `npx sneferu format --check` passes.
- Every page type renders in `dev` in every listed locale at 1440 px and 390 px,
  with no horizontal scroll, and matches the design.
- Every visible word, link, image and colour can be changed by the merchant.
- An empty collection and a section with no blocks still look intentional.

### Copy from

The [example themes](examples/themes) are complete stores with every page type,
groups, locales and settings: [arcade](examples/themes/arcade),
[console](examples/themes/console), [esports](examples/themes/esports) (gaming),
[creator](examples/themes/creator), [license](examples/themes/license),
[bento](examples/themes/bento) (digital products),
[torque](examples/themes/torque), [odda](examples/themes/odda) (hardware),
[dawa](examples/themes/dawa), [aafia](examples/themes/aafia) (health),
[ivory](examples/themes/ivory), [asphalt](examples/themes/asphalt) (fashion),
[sage](examples/themes/sage), [henna](examples/themes/henna) (beauty),
[volt](examples/themes/volt), [bazaar](examples/themes/bazaar) (electronics),
[konafa](examples/themes/konafa), [tabkha](examples/themes/tabkha) (food),
[oak](examples/themes/oak), [mashrabiya](examples/themes/mashrabiya) (home),
[cloud](examples/themes/cloud), [blocks](examples/themes/blocks) (kids),
[velvet](examples/themes/velvet), [halo](examples/themes/halo) (jewelry). The SDK's own default store
is [packages/templates-default/theme](packages/templates-default/theme).

## Work on this repo

- `pnpm install`, `pnpm build`, `pnpm test` (vitest). All three must pass.
- Packages are in `packages/`; docs in `docs/` (MDX, published on hekana.dev).
- After changing a tag: `pnpm docs:tags` regenerates `docs/reference/tags.mdx`
  and `tags.json`. After changing `packages/templates-default/theme`:
  `pnpm gen:default-theme`.
- Every user-visible change gets a changeset (`pnpm changeset`).
- Never weaken the security rules (element allow-list, URL checks, escaping,
  render budgets) to make a theme work: add a tag or a prop instead.
