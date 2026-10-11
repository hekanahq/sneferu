# Tutorial: Arcade, a neon gaming top-up store

Arcade is a home page for a shop that sells game gift cards, in-game currency
and top-up packs as codes. It is near-black with neon cyan and lime: a row of
platform tabs, a big title, a row of amount chips, an "instant delivery" line,
six category tiles, three "how you get your code" steps, a product grid and a
FAQ. It is right-to-left in Arabic and left-to-right in English from the same
files.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief. Its Arabic is placeholder text, its
prices were in dollars, and its cyan-to-magenta glow became cyan-to-lime. Live:
[demo-arcade.hekana.com](https://demo-arcade.hekana.com) and
[/en](https://demo-arcade.hekana.com/en).

What the theme uses: plain HTML for structure, `hk-section`, `hk-stack`,
`hk-grid`, `hk-heading`, `hk-button` and `hk-product-grid`, five snippets (an
inline SVG icon set, a chip, a tile, a step and a FAQ item), `<details>` for
the phone menu and the FAQ, and one stylesheet. There is no JavaScript.

## Files

```
assets/fonts.css
assets/theme.css
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/arcade-categories.sneferu
sections/arcade-faq.sneferu
sections/arcade-hero.sneferu
sections/arcade-products.sneferu
sections/arcade-steps.sneferu
snippets/chip.sneferu
snippets/faq-item.sneferu
snippets/icon.sneferu
snippets/step.sneferu
snippets/tile.sneferu
templates/index.sneferu
theme.json
```

Next to the theme: `README.md` and `docs/` (this tutorial and its pictures).
The CLI skips both: they are never checked and never pushed.

## Data it needs

| What | Used by |
| - | - |
| Products marked featured (or, if none are, the newest products) | the product grid, via `collection('featured')` |
| Categories with the handles `gift-cards`, `game-currency`, `top-ups`, `subscriptions` | the category tiles and the menu links, as `/category/<handle>` |

Prices are in piastres in the data and printed by `hk-product-grid`, for example
`EGP 99.00` in English; on the Arabic page the currency comes after the
number.

## 1. Start from the starter

```bash
npx @hekana/sneferu init arcade
cd arcade
```

Delete the starter's `sections/hero.sneferu`, `sections/featured.sneferu` and
`blocks/chip.sneferu`; this theme writes its own.

## 2. Manifest and tokens

```json title="theme.json"
{
  "id": "arcade",
  "name": "Arcade",
  "version": "1.0.1",
  "author": "Hekana",
  "description": "A dark gaming store for gift cards and top-ups: neon cyan and lime, amount chips, category tiles, redeem steps.",
  "category": "gaming",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#22D3EE",
      "secondary": "#0D141C",
      "accent": "#A3E635",
      "background": "#070A0F",
      "text": "#E6EDF3",
      "muted": "#8B98A9",
      "surface": "#0C1219",
      "line": "#1C2A36"
    },
    "layout": { "contentWidth": "1200px" }
  }
}
```

- `defaultLocale` is `ar`, so `/` renders Arabic (right to left) and `/en`
  English.
- Every colour is a token. Besides the five required keys there are `muted`,
  `surface` and `line`; each becomes a variable such as `--hk-color-surface`.
- `primary` is the cyan and `accent` the lime. The stylesheet names them
  `--arc-cyan` and `--arc-lime` and builds one gradient from them.

## 3. Fonts

`tokens.fonts` is not turned into CSS yet, and the platform does not serve
theme font files yet, so `assets/fonts.css` has `@font-face` rules pointing at
Google Fonts (`https://fonts.gstatic.com`), Arabic and Latin subsets of Rubik:

```css title="assets/fonts.css"
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nErXyi0A.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXw.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nErXyi0A.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXw.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nErXyi0A.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Rubik'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXw.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
```

## 4. Icons: one snippet of inline SVG

There is no icon tag, so `snippets/icon.sneferu` draws every icon on a 24 px
grid and picks one by name. Each icon uses `stroke="currentColor"`, so CSS sets
its colour.

```html title="snippets/icon.sneferu"
<svg
  class="ic ic-{{ name }}"
  viewBox="0 0 24 24"
  width="24"
  height="24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {% if name == 'menu' %}<path d="M4 7h16M4 12h16M4 17h16" />
  {% elsif name == 'cart' %}<path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6.2" /><circle
      cx="9.5"
      cy="20"
      r="1.2"
    /><circle cx="17" cy="20" r="1.2" />
  {% elsif name == 'search' %}<circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" />
  {% elsif name == 'bolt' %}<path d="M13 2L5 13.5h6L10 22l8-11.5h-6L13 2z" />
  {% elsif name == 'coin' %}<circle cx="12" cy="12" r="8.5" /><path d="M9 9.5l3-2 3 2v5l-3 2-3-2z" />
  {% elsif name == 'card' %}<rect x="2.5" y="5" width="19" height="14" rx="2.5" /><rect
      x="5.5"
      y="8"
      width="5"
      height="4"
      rx="1"
    /><path d="M14 15.5h4.5M5.5 15.5h5" />
  {% elsif name == 'gem' %}<path d="M6 3.5h12l3.5 5L12 21 2.5 8.5 6 3.5z" /><path d="M2.5 8.5h19M9 3.5L12 21l3-17.5" />
  {% elsif name == 'coins' %}<ellipse cx="9" cy="7" rx="6" ry="2.5" /><path
      d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7"
    /><path d="M9 16.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4c0-1.4-2.7-2.5-6-2.5" /><path d="M9 12.5v4" />
  {% elsif name == 'gamepad' %}<path
      d="M7 7h10a4.5 4.5 0 0 1 4.4 5.5l-.9 4a2.6 2.6 0 0 1-4.4 1.2L14 15.5h-4l-2.1 2.2a2.6 2.6 0 0 1-4.4-1.2l-.9-4A4.5 4.5 0 0 1 7 7z"
    /><path d="M7.5 10v3M6 11.5h3" /><circle cx="16" cy="10.5" r=".6" /><circle cx="17.5" cy="12.5" r=".6" />
  {% elsif name == 'calendar' %}<rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path
      d="M3.5 10h17M8 3v4M16 3v4M8 14h3"
    />
  {% elsif name == 'phone' %}<rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" />
  {% elsif name == 'pay' %}<circle cx="12" cy="12" r="9" /><path
      d="M15 8.5h-4.2a2 2 0 0 0 0 4h2.4a2 2 0 0 1 0 4H9M12 6.5v2M12 16.5v1.5"
    />
  {% elsif name == 'mail' %}<rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5L12 13l8.5-6.5" />
  {% elsif name == 'trophy' %}<path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path
      d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"
    />
  {% elsif name == 'chevron' %}<path d="M9 6l6 6-6 6" />
  {% endif %}
</svg>
```

Use it with `{% render 'icon', name: 'cart' %}`. The page-wide gradient used
by the tile icons is declared once in the layout (next step) as
`<linearGradient id="arc-grad">`, and the CSS points icons at it with
`stroke: url(#arc-grad)`.

## 5. Layout: header and footer

```html title="layout/theme.sneferu"
<svg class="arc-defs" width="0" height="0" aria-hidden="true">
  <defs>
    <linearGradient id="arc-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22D3EE" />
      <stop offset="1" stop-color="#A3E635" />
    </linearGradient>
  </defs>
</svg>
<header class="arc-header">
  <hk-container>
    <div class="arc-bar">
      <details class="arc-menu">
        <summary aria-label="{{ t('menu') }}">
          {% render 'icon', name: 'menu' %}
        </summary>
        <nav class="arc-menu-panel">
          <a href="{{ t('url_home') }}">{{ t('nav_home') }}</a>
          <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
          <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
          <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
          <a href="#faq">{{ t('nav_faq') }}</a>
        </nav>
      </details>
      <a class="arc-logo" href="{{ t('url_home') }}">{{ store.name }}</a>
      <a class="arc-search" href="{{ t('url_search') }}">
        <span>{{ t('search_placeholder') }}</span>
        {% render 'icon', name: 'search' %}
      </a>
      <a class="arc-cart" href="{{ t('url_cart') }}" aria-label="{{ t('cart') }}">{% render 'icon', name: 'cart' %}</a>
    </div>
  </hk-container>
</header>
<main class="arc-main"><hk-slot name="content" /></main>
<footer class="arc-footer">
  <hk-container>
    <div class="arc-footer-grid">
      <div class="arc-footer-brand">
        <span class="arc-logo">{{ store.name }}</span>
        <p>{{ t('footer_about') }}</p>
      </div>
      <nav class="arc-footer-links" aria-label="{{ t('footer_links') }}">
        <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
        <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
        <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
        <a href="{{ t('url_prefix') }}/category/top-ups">{{ t('cat_topups') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
    </div>
    <p class="arc-copy">© {{ store.name }}</p>
  </hk-container>
</footer>
```

- The search box is a link styled as a field: themes have no form inputs, so
  it opens the store's search page.
- `<details>`/`<summary>` is the phone menu; it opens without JavaScript.
- Every internal link comes from the locale files: `t('url_products')` is
  `/products` in Arabic and `/en/products` in English, so a shopper on the
  English page stays in English.

```css title="assets/theme.css (root and header)"
/* Arcade: near-black ground, neon cyan + lime. Colours come from theme.json tokens. */
[data-hk-theme='arcade'] {
  --arc-cyan: var(--hk-color-primary);
  --arc-lime: var(--hk-color-accent);
  --arc-grad: linear-gradient(90deg, var(--arc-cyan), var(--arc-lime));
  --arc-glow: 0 0 0 1px rgba(34, 211, 238, 0.35), 0 0 18px rgba(34, 211, 238, 0.18);
  min-height: 100vh;
  font-family: 'Rubik', system-ui, sans-serif;
  line-height: 1.6;
  background:
    radial-gradient(900px 420px at 50% -120px, rgba(34, 211, 238, 0.12), transparent 70%),
    radial-gradient(700px 360px at 85% 30%, rgba(163, 230, 53, 0.06), transparent 70%),
    var(--hk-color-background);
}
:where([data-hk-theme='arcade'] a) { color: inherit; text-decoration: none; }
:where([data-hk-theme='arcade'] h1, [data-hk-theme='arcade'] h2, [data-hk-theme='arcade'] p) { margin: 0; }
.arc-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.ic { width: 24px; height: 24px; flex: none; }

/* Header */
.arc-header { position: sticky; top: 0; z-index: 10; background: rgba(7, 10, 15, 0.85); backdrop-filter: blur(10px); border-bottom: 1px solid var(--hk-color-line); }
.arc-bar { display: flex; align-items: center; gap: 16px; min-height: 64px; }
.arc-logo { font-weight: 700; font-size: 20px; letter-spacing: 0.01em; background: var(--arc-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.arc-search { flex: 1; max-width: 460px; margin-inline-start: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding-inline: 18px 14px; border-radius: 999px; border: 1px solid rgba(34, 211, 238, 0.35); background: rgba(12, 18, 25, 0.8); color: var(--hk-color-muted); font-size: 14px; }
.arc-search:hover { border-color: var(--arc-cyan); }
.arc-cart { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; color: var(--hk-color-text); }
.arc-cart:hover, .arc-menu summary:hover { color: var(--arc-cyan); }
.arc-menu { position: relative; display: none; }
.arc-menu summary { list-style: none; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer; color: var(--hk-color-text); }
.arc-menu summary::-webkit-details-marker { display: none; }
.arc-menu-panel { position: absolute; inset-inline-start: 0; top: 52px; min-width: 220px; display: grid; padding: 8px; border-radius: 14px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5); }
.arc-menu-panel a { padding: 12px 14px; border-radius: 10px; min-height: 44px; }
.arc-menu-panel a:hover { background: rgba(34, 211, 238, 0.08); color: var(--arc-cyan); }
```

- `:where(…)` keeps the link and heading resets at zero specificity, so a
  single class such as `.arc-chip` still sets its own colour.

## 6. Locale files

Interface words and default copy live in `locales/ar.json` and
`locales/en.json`, with the same keys; the Arabic file has the words in
Egyptian Arabic, `url_prefix` empty and the paths without `/en`. The first
lines of the English file:

```json title="locales/en.json (excerpt)"
{
  "url_prefix": "/en",
  "url_home": "/en",
  "url_products": "/en/products",
  "hero_title": "Game cards and top-ups",
  "egp": "EGP",
  "instant_delivery": "Instant delivery"
}
```

A section setting has one value for every language, so text settings default
to `""` and the template falls back to the locale:
`{{ section.settings.title | default: t('hero_title') }}`. The merchant's own
text, once typed, replaces both.

## 7. Hero: tabs, title, amount chips

```html title="sections/arcade-hero.sneferu"
<hk-section padding-y="32" mobile-padding-y="16" class="arc-hero">
  <nav class="arc-tabs" aria-label="{{ t('platforms') }}">
    <a class="arc-tab is-active" href="{{ t('url_products') }}">{{ section.settings.tab_1 | default: t('tab_1') }}</a>
    <a
      class="arc-tab"
      href="{{ t('url_prefix') }}/category/gift-cards"
    >{{ section.settings.tab_2 | default: t('tab_2') }}</a>
    <a
      class="arc-tab"
      href="{{ t('url_prefix') }}/category/gift-cards"
    >{{ section.settings.tab_3 | default: t('tab_3') }}</a>
    <a
      class="arc-tab"
      href="{{ t('url_prefix') }}/category/gift-cards"
    >{{ section.settings.tab_4 | default: t('tab_4') }}</a>
    <a
      class="arc-tab"
      href="{{ t('url_prefix') }}/category/top-ups"
    >{{ section.settings.tab_5 | default: t('tab_5') }}</a>
  </nav>
  <hk-stack gap="28" mobile-gap="20" align="center">
    <hk-heading
      text="{{ section.settings.title | default: t('hero_title') }}"
      level="h1"
      size="44"
      tablet-size="36"
      mobile-size="24"
      align="center"
      class="arc-title"
    />
    <div class="arc-chips">
      {% render 'chip', amount: section.settings.amount_1 %}
      {% render 'chip', amount: section.settings.amount_2 %}
      {% render 'chip', amount: section.settings.amount_3 %}
      {% render 'chip', amount: section.settings.amount_4 %}
      {% render 'chip', amount: section.settings.amount_5 %}
      {% render 'chip', amount: section.settings.amount_6 %}
      {% render 'chip', amount: section.settings.amount_7 %}
      {% render 'chip', amount: section.settings.amount_8 %}
    </div>
    <div class="arc-actions">
      <hk-button
        label="{{ t('browse_cards') }}"
        href="{{ t('url_prefix') }}/category/gift-cards"
        variant="outline"
        size="sm"
        class="arc-browse"
      />
      <span class="arc-instant">
        <span class="arc-instant-icon">{% render 'icon', name: 'bolt' %}</span>
        {{ t('instant_delivery') }}
      </span>
    </div>
  </hk-stack>
</hk-section>
<hk-schema>
  {
    "name": "Arcade hero",
    "version": 1,
    "settings": {
      "title": {
        "type": "text",
        "label": "Title (empty = theme text)",
        "default": "",
        "maxLength": 80
      },
      "tab_1": {
        "type": "text",
        "label": "Tab 1",
        "default": "",
        "maxLength": 24
      },
      "tab_2": {
        "type": "text",
        "label": "Tab 2",
        "default": "",
        "maxLength": 24
      },
      "tab_3": {
        "type": "text",
        "label": "Tab 3",
        "default": "",
        "maxLength": 24
      },
      "tab_4": {
        "type": "text",
        "label": "Tab 4",
        "default": "",
        "maxLength": 24
      },
      "tab_5": {
        "type": "text",
        "label": "Tab 5",
        "default": "",
        "maxLength": 24
      },
      "amount_1": {
        "type": "number",
        "label": "Amount 1 (EGP)",
        "default": 100,
        "min": 0,
        "max": 100000
      },
      "amount_2": {
        "type": "number",
        "label": "Amount 2 (EGP)",
        "default": 200,
        "min": 0,
        "max": 100000
      },
      "amount_3": {
        "type": "number",
        "label": "Amount 3 (EGP)",
        "default": 300,
        "min": 0,
        "max": 100000
      },
      "amount_4": {
        "type": "number",
        "label": "Amount 4 (EGP)",
        "default": 500,
        "min": 0,
        "max": 100000
      },
      "amount_5": {
        "type": "number",
        "label": "Amount 5 (EGP)",
        "default": 750,
        "min": 0,
        "max": 100000
      },
      "amount_6": {
        "type": "number",
        "label": "Amount 6 (EGP)",
        "default": 1000,
        "min": 0,
        "max": 100000
      },
      "amount_7": {
        "type": "number",
        "label": "Amount 7 (EGP)",
        "default": 1500,
        "min": 0,
        "max": 100000
      },
      "amount_8": {
        "type": "number",
        "label": "Amount 8 (EGP)",
        "default": 2000,
        "min": 0,
        "max": 100000
      }
    }
  }
</hk-schema>
```

```html title="snippets/chip.sneferu"
{% if amount %}
  <a class="arc-chip" href="{{ t('url_search') }}">
    <span class="arc-chip-icon">{% render 'icon', name: 'coin' %}</span>
    <span class="arc-chip-amount">{{ amount }}</span>
    <span class="arc-chip-cur">{{ t('egp') }}</span>
  </a>
{% endif %}
```

- The tabs are links (`<a class="arc-tab">`), the first one marked
  `is-active`.
- Template default sections cannot carry blocks, so the eight amounts are
  eight `number` settings, and the chip snippet skips an amount set to `0`.
- `money` formats piastres, and these amounts are whole pounds, so the chip
  prints the number and `t('egp')`.

```css title="assets/theme.css (hero)"
/* Hero: platform tabs, title, amount chips */
.arc-tabs { display: flex; justify-content: center; gap: 4px; width: fit-content; max-width: 100%; margin: 0 auto 40px; padding: 4px; border-radius: 999px; border: 1px solid transparent; background: linear-gradient(var(--hk-color-background), var(--hk-color-background)) padding-box, linear-gradient(90deg, rgba(34, 211, 238, 0.7), rgba(163, 230, 53, 0.55)) border-box; overflow-x: auto; scrollbar-width: none; }
.arc-tab { display: inline-flex; align-items: center; min-height: 40px; padding-inline: 26px; border-radius: 999px; font-size: 14px; font-weight: 500; color: var(--hk-color-text); white-space: nowrap; border: 1px solid transparent; }
.arc-tab:hover { color: var(--arc-cyan); }
.arc-tab.is-active { border-color: var(--arc-cyan); box-shadow: 0 0 14px rgba(34, 211, 238, 0.45), inset 0 0 10px rgba(34, 211, 238, 0.15); }
.arc-title { font-weight: 700; letter-spacing: 0; }
.arc-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
@media (min-width: 1024px) { .arc-chips { flex-wrap: nowrap; } }
.arc-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding-inline: 10px 12px; border-radius: 8px; background: var(--arc-grad); color: #04131A; font-weight: 700; font-size: 17px; white-space: nowrap; box-shadow: 0 0 16px rgba(34, 211, 238, 0.35), 0 0 22px rgba(163, 230, 53, 0.18); transition: transform 0.15s, box-shadow 0.15s; }
.arc-chip:hover { transform: translateY(-2px); box-shadow: 0 0 22px rgba(34, 211, 238, 0.55), 0 0 30px rgba(163, 230, 53, 0.3); }
.arc-chip-icon { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 50%; background: rgba(4, 19, 26, 0.85); color: var(--arc-cyan); }
.arc-chip-icon .ic { width: 18px; height: 18px; }
.arc-chip-cur { font-size: 11px; font-weight: 600; }
.arc-actions { width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.arc-browse { justify-self: start; }
.sn-btn.arc-browse { display: inline-flex; align-items: center; line-height: 1; min-height: 44px; padding-inline: 18px; border-radius: 12px; border: 1px solid transparent; font-size: 14px; color: var(--hk-color-text); background: linear-gradient(var(--hk-color-background), var(--hk-color-background)) padding-box, linear-gradient(90deg, var(--arc-cyan), var(--arc-lime)) border-box; }
.arc-instant { display: inline-flex; align-items: center; gap: 10px; font-weight: 500; font-size: 17px; }
.arc-instant-icon { display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid var(--arc-cyan); color: var(--arc-cyan); box-shadow: 0 0 12px rgba(34, 211, 238, 0.4); }
.arc-instant-icon .ic { width: 18px; height: 18px; }
```

- The tab bar's gradient border is two backgrounds: the page colour on
  `padding-box` and the cyan-to-lime gradient on `border-box`.
- On phones the chips become a six-column grid and the 7th and 8th are hidden
  (step 11).

## 8. Category tiles

```html title="sections/arcade-categories.sneferu"
<hk-section padding-y="24" mobile-padding-y="16" class="arc-cats">
  {% if section.settings.heading %}
    <hk-heading text="{{ section.settings.heading }}" level="h2" size="24" mobile-size="20" class="arc-h2" />
  {% endif %}
  <hk-grid columns="3" mobile-columns="2" gap="16" mobile-gap="12">
    {% render 'tile', icon: section.settings.icon_1, handle: section.settings.handle_1, title: section.settings.title_1 | default: t('cat_gift_cards') %}
    {% render 'tile', icon: section.settings.icon_2, handle: section.settings.handle_2, title: section.settings.title_2 | default: t('cat_currency') %}
    {% render 'tile', icon: section.settings.icon_3, handle: section.settings.handle_3, title: section.settings.title_3 | default: t('cat_topups') %}
    {% render 'tile', icon: section.settings.icon_4, handle: section.settings.handle_4, title: section.settings.title_4 | default: t('cat_subscriptions') %}
    {% render 'tile', icon: section.settings.icon_5, handle: section.settings.handle_5, title: section.settings.title_5 | default: t('cat_console') %}
    {% render 'tile', icon: section.settings.icon_6, handle: section.settings.handle_6, title: section.settings.title_6 | default: t('cat_mobile') %}
  </hk-grid>
</hk-section>
<hk-schema>
  {
    "name": "Category tiles",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (optional)",
        "default": "",
        "maxLength": 60
      },
      "title_1": {
        "type": "text",
        "label": "Tile 1 title",
        "default": "",
        "maxLength": 32
      },
      "handle_1": {
        "type": "text",
        "label": "Tile 1 category handle",
        "default": "gift-cards",
        "maxLength": 60
      },
      "icon_1": {
        "type": "select",
        "label": "Tile 1 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "card"
      },
      "title_2": {
        "type": "text",
        "label": "Tile 2 title",
        "default": "",
        "maxLength": 32
      },
      "handle_2": {
        "type": "text",
        "label": "Tile 2 category handle",
        "default": "game-currency",
        "maxLength": 60
      },
      "icon_2": {
        "type": "select",
        "label": "Tile 2 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "gem"
      },
      "title_3": {
        "type": "text",
        "label": "Tile 3 title",
        "default": "",
        "maxLength": 32
      },
      "handle_3": {
        "type": "text",
        "label": "Tile 3 category handle",
        "default": "top-ups",
        "maxLength": 60
      },
      "icon_3": {
        "type": "select",
        "label": "Tile 3 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "bolt"
      },
      "title_4": {
        "type": "text",
        "label": "Tile 4 title",
        "default": "",
        "maxLength": 32
      },
      "handle_4": {
        "type": "text",
        "label": "Tile 4 category handle",
        "default": "subscriptions",
        "maxLength": 60
      },
      "icon_4": {
        "type": "select",
        "label": "Tile 4 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "calendar"
      },
      "title_5": {
        "type": "text",
        "label": "Tile 5 title",
        "default": "",
        "maxLength": 32
      },
      "handle_5": {
        "type": "text",
        "label": "Tile 5 category handle",
        "default": "gift-cards",
        "maxLength": 60
      },
      "icon_5": {
        "type": "select",
        "label": "Tile 5 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "gamepad"
      },
      "title_6": {
        "type": "text",
        "label": "Tile 6 title",
        "default": "",
        "maxLength": 32
      },
      "handle_6": {
        "type": "text",
        "label": "Tile 6 category handle",
        "default": "top-ups",
        "maxLength": 60
      },
      "icon_6": {
        "type": "select",
        "label": "Tile 6 icon",
        "options": ["card", "coins", "gem", "bolt", "gamepad", "calendar", "phone", "trophy"],
        "default": "phone"
      }
    }
  }
</hk-schema>
```

```html title="snippets/tile.sneferu"
<a class="arc-tile" href="{{ t('url_prefix') }}/category/{{ handle }}">
  <span class="arc-tile-icon">{% render 'icon', name: icon %}</span>
  <span class="arc-tile-title">{{ title }}</span>
</a>
```

- `hk-grid columns="3" mobile-columns="2"` gives three tiles a row on desktop
  and two on phones.
- Each tile's title, category handle and icon are settings; the titles default
  to locale text.

```css title="assets/theme.css (tiles)"
/* Category tiles */
.arc-h2 { font-weight: 700; }
.arc-cats .sn-inner > h2 { margin-bottom: 16px; }
.arc-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 120px; padding: 18px 12px; border-radius: 14px; text-align: center; background: linear-gradient(180deg, rgba(13, 20, 28, 0.95), rgba(9, 13, 19, 0.95)); border: 1px solid rgba(34, 211, 238, 0.22); box-shadow: inset 0 0 24px rgba(34, 211, 238, 0.05); transition: border-color 0.15s, box-shadow 0.15s; }
.arc-tile:nth-child(even) { border-color: rgba(163, 230, 53, 0.2); }
.arc-tile:hover { border-color: var(--arc-cyan); box-shadow: var(--arc-glow); }
.arc-tile-icon .ic { width: 52px; height: 52px; stroke: url(#arc-grad); stroke-width: 1.6; filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.35)); }
.arc-tile-title { font-weight: 600; font-size: 17px; }
```

## 9. How you get your code

```html title="sections/arcade-steps.sneferu"
<hk-section padding-y="48" mobile-padding-y="32" class="arc-steps">
  <hk-stack gap="24" align="center">
    <hk-heading
      text="{{ section.settings.heading | default: t('steps_heading') }}"
      level="h2"
      size="28"
      mobile-size="20"
      align="center"
      class="arc-h2"
    />
    <ol class="arc-step-list">
      {% render 'step', n: 1, icon: 'pay', title: t('step_1_title'), text: t('step_1_text') %}
      {% render 'step', n: 2, icon: 'mail', title: t('step_2_title'), text: t('step_2_text') %}
      {% render 'step', n: 3, icon: 'trophy', title: t('step_3_title'), text: t('step_3_text') %}
    </ol>
  </hk-stack>
</hk-section>
<hk-schema>
  {
    "name": "How to redeem",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty = theme text)",
        "default": "",
        "maxLength": 60
      }
    }
  }
</hk-schema>
```

```html title="snippets/step.sneferu"
<li class="arc-step">
  <span class="arc-step-icon">{% render 'icon', name: icon %}</span>
  <span class="arc-step-n">{{ n }}</span>
  <strong class="arc-step-title">{{ title }}</strong>
  <span class="arc-step-text">{{ text }}</span>
</li>
```

The copy is factual for a Hekana digital store: codes are sent automatically by
email once an online payment is confirmed.

```css title="assets/theme.css (steps)"
/* How to redeem */
.arc-step-list { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.arc-step { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 24px 16px; border-radius: 14px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); }
.arc-step-icon { display: inline-flex; width: 52px; height: 52px; align-items: center; justify-content: center; border-radius: 14px; color: var(--arc-cyan); background: rgba(34, 211, 238, 0.08); margin-bottom: 6px; }
.arc-step-icon .ic { width: 28px; height: 28px; stroke: url(#arc-grad); }
.arc-step-n { position: absolute; top: 12px; inset-inline-start: 14px; font-size: 13px; font-weight: 700; color: var(--arc-lime); }
.arc-step-title { font-size: 16px; }
.arc-step-text { font-size: 14px; color: var(--hk-color-muted); }
```

## 10. Products and FAQ

```html title="sections/arcade-products.sneferu"
<hk-section padding-y="40" mobile-padding-y="28" class="arc-products">
  <hk-stack gap="20">
    <div class="arc-row-head">
      <hk-heading
        text="{{ section.settings.heading | default: t('products_heading') }}"
        level="h2"
        size="28"
        mobile-size="20"
        class="arc-h2"
      />
      <a class="arc-more" href="{{ t('url_products') }}">{{ t('view_all') }}</a>
    </div>
    {% if collection('featured').products %}
      <hk-product-grid
        products="{{ collection('featured').products }}"
        limit="{{ section.settings.count }}"
        columns="4"
        tablet-columns="3"
        mobile-columns="2"
        class="arc-grid"
      />
    {% else %}
      <p class="arc-empty">{{ t('empty_products') }}</p>
    {% endif %}
  </hk-stack>
</hk-section>
<hk-schema>
  {
    "name": "Featured products",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty = theme text)",
        "default": "",
        "maxLength": 60
      },
      "count": {
        "type": "range",
        "label": "Products",
        "default": 8,
        "min": 2,
        "max": 24,
        "step": 1
      }
    }
  }
</hk-schema>
```

`hk-product-grid` renders a card per product (`sn-product-card`, `sn-title`,
`sn-price`); the stylesheet gives them the dark tile look. With no products the
section shows the `empty_products` line instead.

```html title="sections/arcade-faq.sneferu"
<hk-section padding-y="48" mobile-padding-y="32" class="arc-faq">
  <div id="faq" class="arc-faq-wrap">
    <hk-heading
      text="{{ section.settings.heading | default: t('faq_heading') }}"
      level="h2"
      size="28"
      mobile-size="20"
      class="arc-h2"
    />
    {% render 'faq-item', q: t('faq_1_q'), a: t('faq_1_a') %}
    {% render 'faq-item', q: t('faq_2_q'), a: t('faq_2_a') %}
    {% render 'faq-item', q: t('faq_3_q'), a: t('faq_3_a') %}
    {% render 'faq-item', q: t('faq_4_q'), a: t('faq_4_a') %}
    {% render 'faq-item', q: t('faq_5_q'), a: t('faq_5_a') %}
  </div>
</hk-section>
<hk-schema>
  {
    "name": "FAQ",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty = theme text)",
        "default": "",
        "maxLength": 60
      }
    }
  }
</hk-schema>
```

```html title="snippets/faq-item.sneferu"
{% if q %}
  <details class="arc-faq-item">
    <summary>
      {{ q }}{% render 'icon', name: 'chevron' %}
    </summary>
    <p>{{ a }}</p>
  </details>
{% endif %}
```

```css title="assets/theme.css (products, FAQ, footer)"
/* Products */
.arc-row-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.arc-more { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; color: var(--arc-cyan); }
.arc-grid .sn-product-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 10px 14px; border-radius: 14px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); transition: border-color 0.15s, box-shadow 0.15s; }
.arc-grid .sn-product-card:hover { border-color: var(--arc-cyan); box-shadow: var(--arc-glow); }
.arc-grid .sn-product-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; background: #0A1016; }
.arc-grid .sn-title { font-weight: 500; font-size: 15px; padding-inline: 4px; }
.arc-grid .sn-price { padding-inline: 4px; font-weight: 700; color: var(--arc-lime); }
.sn-was { color: var(--hk-color-muted); font-weight: 400; margin-inline-start: 6px; font-size: 13px; }
.arc-empty { color: var(--hk-color-muted); }

/* FAQ */
.arc-faq-wrap { max-width: 820px; margin-inline: auto; display: grid; gap: 10px; scroll-margin-top: 80px; }
.arc-faq-wrap > h2 { margin-bottom: 8px; text-align: center; }
.arc-faq-item { border-radius: 12px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); }
.arc-faq-item[open] { border-color: rgba(34, 211, 238, 0.45); }
.arc-faq-item summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 12px 18px; cursor: pointer; font-weight: 500; }
.arc-faq-item summary::-webkit-details-marker { display: none; }
.arc-faq-item summary .ic { width: 18px; height: 18px; color: var(--arc-cyan); transition: transform 0.15s; transform: rotate(90deg); }
.arc-faq-item[open] summary .ic { transform: rotate(-90deg); }
.arc-faq-item p { padding: 0 18px 16px; color: var(--hk-color-muted); }

/* Footer */
.arc-footer { margin-top: 32px; padding-block: 40px 28px; border-top: 1px solid var(--hk-color-line); background: rgba(12, 18, 25, 0.6); }
.arc-footer-grid { display: flex; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
.arc-footer-brand { max-width: 420px; display: grid; gap: 8px; }
.arc-footer-brand p { color: var(--hk-color-muted); font-size: 14px; }
.arc-footer-links { display: flex; flex-wrap: wrap; gap: 4px 20px; }
.arc-footer-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; color: var(--hk-color-muted); }
.arc-footer-links a:hover { color: var(--arc-cyan); }
.arc-copy { margin-top: 20px; font-size: 13px; color: var(--hk-color-muted); }
```

## 11. The page and the phone layout

```html title="templates/index.sneferu"
<hk-sections />
<hk-schema>
  {
    "sections": [
      {
        "type": "arcade-hero"
      },
      {
        "type": "arcade-categories"
      },
      {
        "type": "arcade-steps"
      },
      {
        "type": "arcade-products"
      },
      {
        "type": "arcade-faq"
      }
    ]
  }
</hk-schema>
```

```css title="assets/theme.css (tablet and phone)"
@media (max-width: 1023px) {
  .arc-chips { gap: 10px; }
  .arc-tab { padding-inline: 16px; }
}
@media (max-width: 639px) {
  .arc-bar { flex-wrap: wrap; gap: 4px 8px; min-height: 56px; padding-block: 6px 10px; }
  .arc-menu { display: block; }
  .arc-logo { font-size: 17px; margin-inline-end: auto; }
  .arc-search { order: 3; flex-basis: 100%; max-width: none; margin: 0; min-height: 44px; }
  .arc-tabs { display: none; }
  .arc-tab { padding-inline: 14px; min-height: 36px; font-size: 13px; }
  .arc-chips { width: 100%; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
  .arc-chip { min-height: 30px; padding-inline: 4px; gap: 3px; justify-content: center; font-size: 12px; border-radius: 6px; }
  .arc-chip-icon { width: 14px; height: 14px; }
  .arc-chip-icon .ic { width: 11px; height: 11px; }
  .arc-chip-cur { display: none; }
  .arc-chip:nth-child(n + 7) { display: none; }
  .arc-actions { grid-template-columns: 1fr; justify-items: center; gap: 12px; }
  .sn-btn.arc-browse { display: none; }
  .arc-instant { font-size: 14px; }
  .arc-instant-icon { width: 28px; height: 28px; }
  .arc-tile { min-height: 96px; gap: 8px; padding: 14px 8px; }
  .arc-tile-icon .ic { width: 38px; height: 38px; }
  .arc-tile-title { font-size: 14px; }
  .arc-step-list { gap: 8px; }
  .arc-step { padding: 14px 6px; background: transparent; border: 0; }
  .arc-step-icon { width: 40px; height: 40px; }
  .arc-step-n { display: none; }
  .arc-step-title { font-size: 13px; }
  .arc-step-text { font-size: 12px; }
  .arc-grid .sn-title { font-size: 13px; }
}
```

On phones the tab bar and the "Browse cards" button are hidden, as in the
mockup; the tiles and the menu carry the same links.

## 12. Check, preview and push

1. `npx @hekana/sneferu format` indents every file.
2. `npx @hekana/sneferu validate` prints `✔ theme arcade@1.0.1 is valid`.
3. `npx @hekana/sneferu dev` and open `http://127.0.0.1:4100`, then
   `?locale=en`. Narrow the window below 640 px.
4. Change `id` in `theme.json` to a slug of your own, then
   `npx @hekana/sneferu push . --package <your-slug> --dev-store`.
5. On a real store, create the categories with the handles from "Data it needs".

Only the home page is rendered by the theme in this release; product, category
and cart pages use the store's regular theme.
