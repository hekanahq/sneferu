# Tutorial: Bento, a pastel bento-grid store

Bento is a home page for a shop that sells printables, templates and e-books
as digital files. Rounded pastel tiles hold two "shelves", one per product
category; each shelf has a header tile with a row of round product thumbnails,
and a panel with three product covers. A teal band closes the page. It is
right-to-left in Arabic and left-to-right in English from the same files.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief; its Arabic is placeholder text,
and its lavender and pink tiles were replaced with sky blue and peach. Live:
[demo-bento.hekana.com](https://demo-bento.hekana.com) and
[/en](https://demo-bento.hekana.com/en).

What the theme uses: plain HTML for structure, `hk-product-card` for every
product, `hk-button` for the band's button, one snippet called twice with a
collection passed in, `data-*` attributes for colour, and one stylesheet.

## Files

```
theme.json
assets/fonts.css
assets/theme.css
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/band.sneferu
sections/bento.sneferu
sections/tabs.sneferu
snippets/icon.sneferu
snippets/shelf.sneferu
templates/index.sneferu
```

Next to the theme: `README.md` and `docs/` (this tutorial and its pictures),
and `.sneferu-dev/data.json` (sample data for `dev`). The CLI skips all three:
they are never checked and never pushed.

## Data it needs

Two product categories with these handles, each with at least three products
that have an image:

| Handle | Used by |
| - | - |
| `printables` | the first shelf |
| `templates` | the second shelf |

Prices are in piastres in the data and printed by `hk-price`, for example
`EGP 69.00` in English and `69.00 ج.م` in Arabic.

## 1. Manifest and tokens

```json title="theme.json"
{
  "id": "bento",
  "name": "Bento",
  "version": "1.0.0",
  "author": "Hekana",
  "description": "A soft pastel bento-grid theme for printables, templates and e-books",
  "category": "digital",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#1F2433",
      "secondary": "#74B8AE",
      "accent": "#E9946C",
      "background": "#FFFFFF",
      "text": "#1F2433",
      "muted": "#6E7383",
      "sage": "#CFE3D7",
      "peach": "#F7C9AF",
      "warm": "#FCF1EA",
      "sky": "#E8F1FA",
      "teal": "#74B8AE",
      "line": "#E8E6E1"
    },
    "layout": { "contentWidth": "1040px" }
  }
}
```

- `defaultLocale` is `ar` and `locales` lists both languages, so `/` renders
  Arabic (right to left) and `/en` English.
- Every colour the stylesheet uses is a token. Besides the five required keys
  there are named pastels (`sage`, `peach`, `warm`, `sky`, `teal`); each becomes
  a CSS variable such as `--hk-color-peach`.
- `contentWidth` sets `--hk-content-width`, which `.bt-wrap` uses as its
  maximum width.

## 2. Layout: header and footer

```html title="layout/theme.sneferu"
<div class="bt">
  <header class="bt-header">
    <div class="bt-wrap bt-header-row">
      <div class="bt-start">
        <a
          class="bt-icon bt-user"
          href="{{ t('href_account') }}"
          aria-label="{{ t('account') }}"
        >{% render 'icon', name: 'user' %}</a>
        <a
          class="bt-icon bt-hide-phone"
          href="{{ t('href_wishlist') }}"
          aria-label="{{ t('wishlist') }}"
        >{% render 'icon', name: 'heart' %}</a>
        <a
          class="bt-icon bt-hide-phone"
          href="{{ t('href_cart') }}"
          aria-label="{{ t('cart') }}"
        >{% render 'icon', name: 'bag' %}</a>
        <a class="bt-logo" href="{{ store.url }}">{{ store.name }}</a>
      </div>
      <div class="bt-end">
        <a
          class="bt-icon bt-hide-phone"
          href="{{ t('href_cart') }}"
          aria-label="{{ t('cart') }}"
        >{% render 'icon', name: 'bag' %}</a>
        <a
          class="bt-icon bt-hide-phone"
          href="{{ t('href_search') }}"
          aria-label="{{ t('search') }}"
        >{% render 'icon', name: 'search' %}</a>
        <a class="bt-pill" href="{{ t('href_products') }}">{{ t('all_products') }}</a>
        <details class="bt-menu">
          <summary class="bt-icon" aria-label="{{ t('menu') }}">
            {% render 'icon', name: 'menu' %}
          </summary>
          <div class="bt-menu-panel">
            <a href="{{ t('href_search') }}">{{ t('search') }}</a>
            <a href="{{ t('href_cart') }}">{{ t('cart') }}</a>
            <a href="{{ t('href_wishlist') }}">{{ t('wishlist') }}</a>
            <a href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
          </div>
        </details>
      </div>
    </div>
  </header>
  <main><hk-slot name="content" /></main>
  <footer class="bt-footer">
    <div class="bt-wrap bt-footer-row">
      <p class="bt-footer-name">{{ store.name }}</p>
      <p class="bt-footer-note">{{ t('footer_note') }}</p>
      <a href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
    </div>
  </footer>
</div>
```

- `<hk-slot name="content" />` is where the template's sections go.
- `{{ store.name }}` and `{{ store.url }}` come from the store. Every other
  word is `t('…')`, read from `locales/ar.json` or `locales/en.json`.
- Links that must stay in the current language read their URL from the locale
  files too: `href="{{ t('href_cart') }}"` is `/cart` in Arabic and `/en/cart`
  in English.
- The phone menu is a `<details>` element: it opens and closes without script
  (themes cannot run JavaScript).
- Icons are inline SVG in one snippet, chosen by name:

```html title="snippets/icon.sneferu (excerpt)"
{% if name == 'search' %}
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle
      cx="11"
      cy="11"
      r="7"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    /><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
{% elsif name == 'bag' %}
```

## 3. The template

```html title="templates/index.sneferu"
<hk-sections />
<hk-schema>
  {
    "sections": [
      {
        "type": "tabs"
      },
      {
        "type": "bento"
      },
      {
        "type": "band"
      }
    ]
  }
</hk-schema>
```

The home page is three sections, in this order. A merchant can reorder them or
add more in the builder.

## 4. Category tabs

```html title="sections/tabs.sneferu"
<nav class="bt-tabs" aria-label="{{ t('tabs_label') }}">
  <div class="bt-wrap bt-tabs-row">
    <a href="#shop" aria-current="page">{{ t('tab_all') }}</a>
    <a href="#printables">{{ t('tab_printables') }}</a>
    <a href="#templates">{{ t('tab_templates') }}</a>
    <a href="{{ t('href_products') }}">{{ t('tab_everything') }}</a>
  </div>
</nav>
<hk-schema>
  {
    "name": "Category tabs",
    "version": 1,
    "settings": {}
  }
</hk-schema>
```

A row of links. The first is marked `aria-current="page"`, and the stylesheet
gives that one the accent colour and underline. The two category tabs jump to
the shelves below (`#printables`, `#templates`), the last opens the store's
product list.

## 5. The bento shelves

The section renders the same snippet twice, passing a different collection and
a different pair of colours each time:

```html title="sections/bento.sneferu"
<section class="bt-bento" id="shop">
  <div class="bt-wrap bt-bento-grid">
    {% render 'shelf', c: collection('printables'), key: 'printables', title: t('printables_title'), note: t('printables_note'), href: t('href_printables'), head: 'peach', panel: 'sky' %}
    {% render 'shelf', c: collection('templates'), key: 'templates', title: t('templates_title'), note: t('templates_note'), href: t('href_templates'), head: 'sage', panel: 'warm' %}
  </div>
</section>
<hk-schema>
  {
    "name": "Bento shelves",
    "version": 1,
    "settings": {}
  }
</hk-schema>
```

`collection('printables')` is a lookup: it returns the category with that
handle (or an empty list). Passing it as `c:` gives the snippet the whole
collection, so the snippet does not need to know which category it shows.

```html title="snippets/shelf.sneferu"
<div class="bt-shelf" id="{{ key }}">
  <a class="bt-head" data-tone="{{ head }}" href="{{ href }}">
    <h2>{{ title }}</h2>
    <span class="bt-thumbs" aria-hidden="true">
      {% for p in c.products limit: 5 %}
        {% if p.image %}<img src="{{ p.image.url }}" alt="" width="28" height="28" loading="lazy" />{% endif %}
      {% endfor %}
    </span>
  </a>
  <div class="bt-panel" data-tone="{{ panel }}">
    <div class="bt-chips">
      <span class="bt-chip bt-chip-on">{{ t('chip_instant') }}</span>
      <span class="bt-chip">{{ t('chip_pdf') }}</span>
      <span class="bt-chip">{{ note }}</span>
    </div>
    {% if c.products %}
      <div class="bt-covers">
        {% for p in c.products limit: 3 %}
          <div class="bt-cover">
            <hk-product-card product="{{ p }}" class="bt-card" />
            {% if forloop.first %}<span class="bt-new">{{ t('badge_new') }}</span>{% endif %}
          </div>
        {% endfor %}
      </div>
    {% else %}
      <p class="bt-empty">{{ t('empty') }}</p>
    {% endif %}
    <a
      class="bt-more"
      href="{{ href }}"
      aria-label="{{ t('see_all') }}: {{ title }}"
    >{% render 'icon', name: 'plus' %}</a>
  </div>
</div>
```

How it works:

- `data-tone="{{ head }}"` writes `peach`, `sage`, `sky` or `warm`, and one CSS
  rule per tone sets the background. Dynamic `style="…"` is not allowed in
  templates; `data-*` plus CSS is the way to vary a colour per item.
- `{% for p in c.products limit: 5 %}` draws up to five round thumbnails from
  `p.image.url`.
- `{% if c.products %}` is false for an empty collection, so an empty category
  shows a line of text instead of an empty panel.
- `<hk-product-card product="{{ p }}" class="bt-card" />` renders a link with
  the image, `.sn-title` and the price. The extra class is how the stylesheet
  reaches it.
- `{% if forloop.first %}` puts the "New" badge on the first cover only. The
  badge is a sibling of the card, positioned over it by CSS, because the card's
  own markup has no slot for a badge.

The CSS for the grid, the tiles and the covers:

```css title="assets/theme.css (excerpt)"
/* Bento shelves: a header tile over a panel, two side by side */
.bt-bento { padding-block: 0 24px; }
.bt-bento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bt-shelf { display: flex; flex-direction: column; gap: 10px; }
.bt-head {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 18px 24px 16px;
  border-radius: 28px; min-height: 84px;
}
.bt-head h2 { margin: 0; font-size: 21px; font-weight: 600; line-height: 1.3; }
.bt-thumbs { display: flex; }
.bt-thumbs img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid #FFFFFF; margin-inline-end: -6px; }
.bt-panel { position: relative; padding: 18px 22px 60px; border-radius: 28px; }
.bt-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.bt-chip { font-size: 12.5px; padding: 3px 12px; border-radius: 999px; color: var(--hk-color-muted); }
.bt-chip-on { background: var(--hk-color-peach); color: var(--hk-color-text); }
.bt-covers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.bt-cover { position: relative; }
.bt-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; }
.bt-card img { width: 100%; aspect-ratio: 5 / 6; object-fit: cover; border-radius: 16px; display: block; margin-bottom: 6px; }
.bt-card .sn-title { font-size: 13px; font-weight: 600; line-height: 1.35; }
.bt-card .sn-price { font-size: 12px; color: var(--hk-color-muted); }
.bt-card:hover img { transform: translateY(-2px); }
.bt-card img { transition: transform .15s ease; }
.bt-new {
  position: absolute; top: -8px; inset-inline-start: -6px; padding: 2px 10px; border-radius: 999px;
  background: var(--hk-color-primary); color: #FFFFFF; font-size: 11px; font-weight: 600;
}
.bt-more {
  position: absolute; bottom: 14px; inset-inline-end: 14px; width: 40px; height: 40px; border-radius: 50%;
  display: grid; place-items: center; background: var(--hk-color-teal); color: #FFFFFF !important;
}
.bt-more:hover { filter: brightness(.95); }
```

## 6. The teal band

```html title="sections/band.sneferu"
<section class="bt-band-wrap">
  <div class="bt-wrap">
    <div class="bt-band">
      <div>
        <h2>{{ section.settings.heading | default: t('band_heading') }}</h2>
        <p>{{ section.settings.text | default: t('band_text') }}</p>
      </div>
      <hk-button
        label="{{ section.settings.button | default: t('band_button') }}"
        href="{{ t('href_products') }}"
        class="bt-band-button"
      />
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "Call to action band",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty: the theme's own words)",
        "default": "",
        "maxLength": 80
      },
      "text": {
        "type": "textarea",
        "label": "Text",
        "default": "",
        "maxLength": 200
      },
      "button": {
        "type": "text",
        "label": "Button",
        "default": "",
        "maxLength": 30
      }
    }
  }
</hk-schema>
```

Each setting defaults to an empty string, and the template prints
`{{ section.settings.heading | default: t('band_heading') }}`. Until the
merchant types a heading, the page shows the locale text in the page's
language; after that, the merchant's words.

`hk-button` renders `<a class="sn-btn sn-btn-solid">`. It brings no visual
style of its own, so the theme styles it through its class:

```css title="assets/theme.css (excerpt)"
.bt-band-button.sn-btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding-inline: 34px; border-radius: 999px;
  background: var(--hk-color-primary); color: #FFFFFF; border: 0; font-size: 16px; font-weight: 600;
}
```

## 7. Phones

One media query at 639 px (the same width the `mobile-` props use) stacks the
shelves and rearranges the header. `display: contents` dissolves the two header
groups so `order` can put the menu first and the "All products" pill last:

```css title="assets/theme.css (excerpt)"
@media (max-width: 639px) {
  .bt-wrap { padding-inline: 12px; }
  .bt-hide-phone { display: none; }
  .bt-menu { display: block; }
  .bt-header-row { justify-content: flex-start; gap: 6px; }
  .bt-start, .bt-end { display: contents; }
  .bt-menu { order: -1; }
  .bt-logo { margin: 0; }
  .bt-pill { margin-inline: auto 0; min-height: 40px; padding-inline: 18px; font-size: 13px; }
```

## 8. Words

All interface text is in the two locale files, with the same keys:

```json title="locales/en.json (excerpt)"
{
  "menu": "Menu",
  "account": "My account",
  "wishlist": "Wishlist",
  "cart": "Cart",
  "search": "Search",
  "all_products": "All products",
  "href_account": "/en/account",
  "href_wishlist": "/en/wishlist",
  "href_cart": "/en/cart",
  "href_search": "/en/search",
  "href_products": "/en/products",
  "href_printables": "/en/category/printables",
  "href_templates": "/en/category/templates",
  "href_other_locale": "/",
  "other_locale": "العربية",
  "tabs_label": "Categories",
  "tab_all": "All",
  "tab_printables": "Printables",
  "tab_templates": "Templates and e-books",
  "tab_everything": "All products",
  "printables_title": "Printables for home and school",
  "printables_note": "For kids",
  "templates_title": "Templates and e-books for work",
  "templates_note": "For projects",
  "chip_instant": "Instant download",
```

The Arabic file has the same keys in Egyptian Arabic. Prices and dates are
printed with Western digits in both languages.

```json title=".sneferu-dev/data.json (excerpt)"
{
 "ar": {
  "store": {
   "name": "دفتر"
  },
  "collections": {
   "printables": {
    "title": "مطبوعات",
    "products": [
```

That is the start of `.sneferu-dev/data.json`, the sample data `sneferu dev`
uses for this theme (split by locale).
## Reproduce it

```bash
npx @hekana/sneferu init bento          # start from the starter theme
cd bento
# replace the starter files with the ones above, then:
npx @hekana/sneferu format              # indent .sneferu, theme.json and locales
npx @hekana/sneferu validate            # must print: theme bento@1.0.0 is valid
npx @hekana/sneferu dev                 # http://127.0.0.1:4100, add ?locale=en for English
```

`dev` reads `.sneferu-dev/data.json` (in this folder) as sample data, so the
preview shows this store's products and the collections the sections use
(`sneferu dev --data <file>` points at another file). That needs the CLI from
Sneferu main after #16; on 0.2.0 the preview shows the built-in sample
products and the category collections are empty.

To put it on a store, sign in once and push to your dev store:

```bash
npx @hekana/sneferu login
npx @hekana/sneferu push . --package <your-slug> --dev-store
```

The `--package` slug must equal `id` in `theme.json`, so change both to a
slug of your own; `bento` here is the slug Hekana uses for its own copy. Bump
`version` in `theme.json` before every push: a pushed version cannot be
replaced. The live store must have product categories with the handles the
theme reads (see "Data it needs" above). During this release only the home
page (`/`, and `/en`) is rendered by the theme; product, category and cart
pages use the store's regular theme.

## Notes and limits met on the way

These came up while building the theme and are tracked as SDK gaps:

- Bundled images: `asset_url()` is empty on the live storefront for now, so the
  theme ships no images of its own; art comes from products, inline SVG, or an
  `image` setting with an `https://` default.
- Fonts: there is no font loader yet. `assets/fonts.css` holds `@font-face`
  rules that point at `https://fonts.gstatic.com` (the storefront allows
  `https:` fonts), Arabic and Latin subsets only.
- Collections: `collection('…')` takes a literal handle, so the handles are
  fixed in the templates and the store's categories must use them.
- One value per setting for every language: the sections print
  `{{ section.settings.x | default: t('x') }}`, so an empty setting shows the
  locale text, and list sections fall back to locale keys when the merchant
  has added no blocks.
- Links: there is no localized link helper, so URLs that must keep `/en` live
  in the locale files (`"href_products": "/en/products"` in `en.json`).
