/**
 * The AGENTS.md (and the CLAUDE.md that points at it) `sneferu init` writes into every new theme, so an AI
 * coding agent opened in a fresh theme folder knows the commands, the files and the rules. Both files are
 * project files: `loadTheme` skips them, so they are never checked, built or pushed.
 */
export const THEME_AGENTS_MD = `# AGENTS.md: working on this Sneferu theme

This folder is a Sneferu theme for Hekana stores: \`.snf\` templates (HTML with
\`hk-*\` tags, \`{{ }}\` and \`{% if/for/render %}\`), a \`theme.json\` manifest,
locale files and CSS. Hekana compiles it on its servers and renders it for every
page of a store.

Docs: https://hekana.dev. Every page in one file, for agents:
https://hekana.dev/llms-full.txt. Tags and props:
https://hekana.dev/reference/tags. Error codes (SNxxxx) and their fixes:
https://hekana.dev/reference/diagnostics.

## Commands

Run them in this folder (Node.js 20 or newer). Use \`npx sneferu <command>\`,
or \`sneferu <command>\` after \`npm i -g sneferu\` (\`sneferu\` is the short name of
\`@hekana/sneferu\`; both install the same CLI).

| Command | Use |
| - | - |
| \`dev\` | Preview at http://127.0.0.1:4100 (\`--port <n>\` if 4100 is taken; check the page has \`data-hk-theme="<id>"\`) with sample data. \`/en/...\` or \`?locale=en\` for English, \`/ar/...\` for Arabic. Pages: \`/\`, \`/products/<handle>\`, \`/products\`, \`/category/<handle>\`, \`/search?q=a\`, \`/cart\`, \`/pages/about\`, any other path for the 404. \`--data <file>\` (or \`.sneferu-dev/data.json\`: \`store\`, \`collections\`, \`products\` by handle, \`menus\`) for your own sample data |
| \`format\` | Format every \`.snf\`, \`theme.json\` and locale file. \`format --check\` only reports |
| \`validate\` | Compile and print diagnostics as \`file:line:col severity CODE message\`. Exit 0 = valid |
| \`build\` | Write \`dist/<id>-<version>.sneferu.json\`. You never upload it |
| \`login\`, \`whoami\` | Sign in with a Hekana developer key (the user does this, in a browser) |
| \`push . --package <id> --dev-store\` | Upload the source and publish it on the developer's own dev store. Only when the user asks |

## Files

| Path | What it is |
| - | - |
| \`theme.json\` | id, name, version, locales, theme settings, \`tokens\` (colours, fonts, layout), \`money.format\` |
| \`layout/theme.snf\` | The frame: \`<hk-section-group name="announcement\\|header\\|footer" />\` and \`<hk-slot name="content" />\` |
| \`templates/<type>.snf\` | One per page type: \`index\`, \`product\`, \`collection\`, \`search\`, \`cart\`, \`page\`, \`404\` (alternates like \`product.digital.snf\`). Usually \`<hk-sections />\` plus an \`<hk-schema>\` listing the default sections |
| \`groups/<name>.json\` | The sections the header, footer and announcement bar start with |
| \`sections/*.snf\` | Page parts the merchant adds, reorders and edits; each ends with an \`<hk-schema>\` |
| \`blocks/*.snf\` | Repeatable items inside a section (a menu link, a slide, a question) |
| \`snippets/*.snf\` | Partials for \`{% render 'name', key: value %}\`; no schema |
| \`locales/ar.json\`, \`locales/en.json\` | Flat \`{ "key": "text" }\` maps for small interface words, read with \`t('key')\` |
| \`assets/\` | \`*.css\` (the stylesheet) and images. Only images are served on the store |

This AGENTS.md, CLAUDE.md, README, LICENSE, CHANGELOG, a top-level \`docs/\`
folder, \`package.json\`, lock files and dot-folders are not part of the theme:
the CLI skips them. Anything else in the folder is checked.

## Rules

The compiler enforces most of these; \`validate\` names the rule you broke.

1. **Only the allowed markup.** Plain HTML from the allow-list and the \`hk-*\`
   tags in the tag reference, with the props listed there (an unknown prop is
   SN2004). No \`<script>\`, \`<style>\`, \`<link>\`, \`<iframe>\`, \`<form>\`, no
   \`on*\` attributes, no \`{{ }}\` inside \`style="…"\`, no \`style\` on \`hk-*\` tags.
2. **No JavaScript and no form controls.** Behaviour comes from tags:
   \`hk-search-form\` (the only form), \`hk-variant-picker\`, \`hk-add-to-cart\`,
   \`hk-cart-count\`, \`hk-cart-items\`, \`hk-cart-summary\`, \`hk-cart-drawer\`,
   \`hk-product-gallery\`. Open menus and questions with \`<details>\`, carousels
   with CSS scroll-snap.
3. **Nothing visible is written into a template.** Headings and paragraphs are
   \`text\`/\`textarea\` settings with \`"localized": true\` and \`{ "ar": …, "en": … }\`
   defaults; links and images are \`link\`/\`image\` settings; repeated items are
   blocks; small labels are locale keys (\`{{ t('sold_out') }}\`); colours and
   fonts are tokens. Give every setting a label in both languages, a default and
   a limit (\`maxLength\`, \`min\`, \`max\`).
4. **Both directions.** Write CSS with logical properties (\`margin-inline-start\`,
   \`padding-inline\`, \`text-align: start\`). \`hk-icon\` arrows and chevrons
   mirror themselves on Arabic pages: flip only your own inline SVG arrows, with
   \`[dir="rtl"]\`. Every locale the theme lists has a locale file with the same keys.
5. **Store links go through \`url()\`** (\`{{ url('/products') }}\`), so English pages
   stay English. Only \`https:\`, \`mailto:\`, \`tel:\` and relative URLs.
6. **Prices are minor units.** Print them with \`| money\` or \`<hk-price>\`; never
   compute totals. \`"money": { "format": "whole" }\` in \`theme.json\` drops \`.00\`.
7. **Fonts** come from \`tokens.fonts\` (the catalogue on hekana.dev; Cairo, IBM
   Plex Sans Arabic, Tajawal and others have Arabic). Font files in \`assets/\` are
   not served.
8. **Images.** Product images through \`hk-image\`, \`hk-product-card\` or
   \`| img: 400\` (they carry \`srcset\`); every \`<img>\` has \`alt\`, \`width\` and
   \`height\`; bundled images through \`asset_url('file.webp')\`, at most 2 MB each.
9. **CSS lives in \`assets/*.css\`.** Style your own classes and the stable \`sn-*\`
   hooks (\`sn-btn\`, \`sn-product-card\`, \`sn-price\`), never the numbered ones
   (\`sn-c3\`). Wrap broad resets in \`:where()\`, or a rule like
   \`[data-hk-theme='x'] a\` beats every single-class rule.
10. **Accessible.** Buttons and links at least 44 px tall on phones, text
    contrast at least 4.5:1, \`label\` on icon-only \`hk-icon\`s and buttons.
11. **Small loops.** Every \`{% for %}\` has a \`limit:\`; avoid loops inside loops.
12. **Names.** Section, block and snippet names never start with \`hk-\` (SN3043).
    One name exists once per folder: not \`hero.snf\` next to \`hero.sneferu\` (SN3044).
13. **Versions are immutable.** Bump \`version\` in \`theme.json\` before every push.
14. **Checkout is Hekana's.** There is no checkout template or tag; brand it only with
    the \`checkout\` block in \`theme.json\` (colours, font, radius, logo, header and footer, trust note).

## Done means

- \`validate\` prints \`✔ theme <id>@<version> is valid\` and \`format --check\` passes.
- Every page type renders in \`dev\` in every listed locale, at a desktop width
  (1440 px) and a phone width (390 px), with no horizontal scroll.
- An empty collection and a section with no blocks still look intentional.
- No copy is left over from the template you started from: replace every
  default text in settings, groups and locales with the store's own.

## Start from an example

\`npx sneferu init --list\` lists the templates; six complete example stores
are at https://github.com/hekanahq/sneferu/tree/main/examples/themes. Copy patterns
from them before inventing new ones.
`;

/** Claude Code reads CLAUDE.md; `@AGENTS.md` imports the file above. */
export const THEME_CLAUDE_MD = `See [AGENTS.md](AGENTS.md).

@AGENTS.md
`;
