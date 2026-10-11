# Tutorial: License, a dark store for software licences

License is a home page for a shop that sells software licences and
subscriptions. Deep navy, blue plan cards and one lime accent. The hero puts a
two-line heading next to three plan cards; under it come a feature checklist,
the apps (a large "All apps" tile and three app cards) and a FAQ accordion.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief; its Arabic is placeholder text,
and its violet plan cards were replaced with blue. The Arabic page mirrors the
mockup so it reads right to left. Live:
[demo-license.hekana.com](https://demo-license.hekana.com) and
[/en](https://demo-license.hekana.com/en).

What the theme uses: plan cards built from real products with `hk-price`, a
`data-*` attribute set from an expression, `hk-product-card` with a sibling
button, `<details>` for the FAQ, and blocks with a locale fallback.

## Files

```
theme.json
assets/fonts.css
assets/theme.css
blocks/faq-item.sneferu
blocks/feature.sneferu
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/apps.sneferu
sections/faq.sneferu
sections/features.sneferu
sections/plans-hero.sneferu
snippets/faq-item.sneferu
snippets/feature.sneferu
snippets/icon.sneferu
templates/index.sneferu
```

Next to the theme: `README.md` and `docs/` (this tutorial and its pictures),
and `.sneferu-dev/data.json` (sample data for `dev`). The CLI skips all three:
they are never checked and never pushed.

## Data it needs

| Handle | Used by |
| - | - |
| `bundles` | the three plan cards (first three products, in store order) |
| `apps` | the three app cards |

## 1. Manifest and tokens

```json title="theme.json"
{
  "id": "license",
  "name": "License",
  "version": "1.0.1",
  "author": "Hekana",
  "description": "A dark theme for software licences, subscriptions and digital tools",
  "category": "digital",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#0A1122",
      "secondary": "#121C33",
      "accent": "#C8F04D",
      "background": "#0A1122",
      "text": "#EEF2F8",
      "muted": "#97A3B9",
      "tier": "#1D4A84",
      "tier-deep": "#15365F",
      "line": "#26324B"
    },
    "layout": { "contentWidth": "1040px" }
  }
}
```

`tier` and `tier-deep` are the two blues of the plan cards. Keeping them as
tokens makes the "no violet" rule a one-line check.

## 2. Layout

```html title="layout/theme.sneferu"
<div class="ls">
  <header class="ls-header">
    <div class="ls-wrap ls-header-row">
      <details class="ls-menu">
        <summary class="ls-icon-link" aria-label="{{ t('menu') }}">
          {% render 'icon', name: 'menu' %}
        </summary>
        <div class="ls-menu-panel">
          <a href="#plans">{{ t('nav_plans') }}</a>
          <a href="#apps">{{ t('nav_apps') }}</a>
          <a href="#faq">{{ t('nav_faq') }}</a>
          <a href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
        </div>
      </details>
      <a class="ls-logo" href="{{ store.url }}">{{ store.name }}</a>
      <nav class="ls-nav" aria-label="{{ t('nav_label') }}">
        <a href="#plans">{{ t('nav_plans') }}</a>
        <a href="#features">{{ t('nav_features') }}</a>
        <a href="#apps">{{ t('nav_apps') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
      <div class="ls-tools">
        <a class="ls-search" href="{{ t('href_search') }}">
          <span>{{ t('search') }}</span>
          {% render 'icon', name: 'search' %}
        </a>
        <a
          class="ls-icon-link"
          href="{{ t('href_account') }}"
          aria-label="{{ t('account') }}"
        >{% render 'icon', name: 'user' %}</a>
        <a
          class="ls-icon-link"
          href="{{ t('href_cart') }}"
          aria-label="{{ t('cart') }}"
        >{% render 'icon', name: 'bag' %}</a>
      </div>
    </div>
  </header>
  <main><hk-slot name="content" /></main>
  <footer class="ls-footer">
    <div class="ls-wrap ls-footer-row">
      <p class="ls-footer-name">{{ store.name }}</p>
      <p class="ls-footer-note">{{ t('footer_note') }}</p>
      <a href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
    </div>
  </footer>
</div>
```

There are no form inputs in a theme, so the search box is a link to the
store's search page, styled like a field. Account and cart are icon links.

## 3. Hero and plan cards

```html title="sections/plans-hero.sneferu"
<section class="ls-hero" id="plans">
  <div class="ls-wrap ls-hero-row">
    <div class="ls-hero-copy">
      <h1 class="ls-h1">
        <span class="ls-accent">{{ section.settings.line1 | default: t('hero_line1') }}</span>
        <span>{{ section.settings.line2 | default: t('hero_line2') }}</span>
      </h1>
      <p class="ls-lead">{{ section.settings.text | default: t('hero_text') }}</p>
      <a class="ls-btn ls-btn-sm" href="#apps">
        <span>{{ section.settings.button | default: t('hero_button') }}</span>
        {% render 'icon', name: 'download' %}
      </a>
    </div>
    <div class="ls-tiers">
      {% for p in collection('bundles').products limit: 3 %}
        <a class="ls-tier" href="{{ p.url }}" data-best="{{ forloop.index == 2 }}">
          <span class="ls-tier-name">{{ p.title }}</span>
          <hk-price amount="{{ p.price }}" compare-at="{{ p.compare_at }}" class="ls-tier-price" />
          <span class="ls-tier-note">{{ t('tier_note') }}</span>
          <span class="ls-tier-buy">{{ t('buy') }}</span>
        </a>
      {% endfor %}
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "Plans hero",
    "version": 1,
    "settings": {
      "line1": {
        "type": "text",
        "label": "Heading, first line (empty: the theme's own words)",
        "default": "",
        "maxLength": 60
      },
      "line2": {
        "type": "text",
        "label": "Heading, second line",
        "default": "",
        "maxLength": 60
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

- The plans are products in the `bundles` collection, so their names, prices
  and links come from the store, not from settings.
- `data-best="{{ forloop.index == 2 }}"` prints `true` on the middle card. A
  comparison inside `{{ }}` prints `true` or `false`, and the CSS outlines the
  card whose attribute is `true`:

```css title="assets/theme.css (excerpt)"
.ls-tier {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 16px 10px 12px;
  border-radius: 12px; background: linear-gradient(180deg, var(--hk-color-tier), var(--hk-color-tier-deep));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .08);
}
.ls-tier[data-best="true"] { outline: 2px solid color-mix(in srgb, var(--hk-color-accent) 70%, transparent); outline-offset: -2px; }
.ls-tier-name { font-size: 12px; font-weight: 600; }
.ls-tier-price { display: flex; flex-direction: column; align-items: center; margin-block: 8px 2px; }
.ls-tier-price .sn-now { font-size: 22px; font-weight: 700; line-height: 1.2; }
```

- `hk-price` prints the amount with the currency and two decimals
  (`EGP 120.00`, `120.00 ج.م`).

The button and card links need their text colour set with enough weight to
beat the general link rule, or the text inherits the light page colour:

```css title="assets/theme.css (excerpt)"
.ls a { color: inherit; text-decoration: none; }
/* Text on lime is always the dark background colour (beats the link rule above). */
.ls a.ls-btn, .ls a.ls-all, .ls a.ls-app-buy { color: var(--hk-color-background); }
```

## 4. Features

```html title="sections/features.sneferu"
<section class="ls-features" id="features">
  <div class="ls-wrap">
    <div class="ls-head">
      <h2 class="ls-h2">{{ section.settings.heading | default: t('features_heading') }}</h2>
      <p class="ls-side">{{ t('features_side') }}</p>
    </div>
    <div class="ls-feature-grid">
      {% if section.blocks %}
        {% for block in section.blocks %}
          <hk-block of="{{ block }}" />
        {% endfor %}
      {% else %}
        {% render 'feature', text: t('feature_1') %}
        {% render 'feature', text: t('feature_2') %}
        {% render 'feature', text: t('feature_3') %}
        {% render 'feature', text: t('feature_4') %}
        {% render 'feature', text: t('feature_5') %}
        {% render 'feature', text: t('feature_6') %}
        {% render 'feature', text: t('feature_7') %}
        {% render 'feature', text: t('feature_8') %}
      {% endif %}
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "Features",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty: the theme's own words)",
        "default": "",
        "maxLength": 60
      }
    },
    "blocks": {
      "allowed": ["feature"],
      "max": 12
    }
  }
</hk-schema>
```

```html title="snippets/feature.sneferu"
<p class="ls-feature">
  {% render 'icon', name: 'check' %}<span>{{ text }}</span>
</p>
```

Up to twelve feature blocks; with none, eight items from the locale files.

## 5. Apps

```html title="sections/apps.sneferu"
<section class="ls-apps" id="apps">
  <div class="ls-wrap">
    <div class="ls-head">
      <h2 class="ls-h2">{{ section.settings.heading | default: t('apps_heading') }}</h2>
      <p class="ls-side">{{ t('apps_side') }}</p>
    </div>
    <div class="ls-apps-grid">
      <a class="ls-all" href="{{ t('href_products') }}">
        <span>{{ t('all_apps') }}</span>
        {% render 'icon', name: 'download' %}
      </a>
      {% for p in collection('apps').products limit: 3 %}
        <div class="ls-app">
          <hk-product-card product="{{ p }}" class="ls-app-card" />
          <a class="ls-app-buy" href="{{ p.url }}" aria-hidden="true" tabindex="-1">{{ t('buy') }}</a>
        </div>
      {% endfor %}
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "Apps",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty: the theme's own words)",
        "default": "",
        "maxLength": 60
      }
    }
  }
</hk-schema>
```

`hk-product-card` gives the icon, name and price as one link. The "Buy" chip
under it is a second link to the same product, hidden from screen readers so
the product is announced once.

## 6. FAQ

```html title="sections/faq.sneferu"
<section class="ls-faq" id="faq">
  <div class="ls-wrap">
    <h2 class="ls-h2">{{ section.settings.heading | default: t('faq_heading') }}</h2>
    <div class="ls-faq-list">
      {% if section.blocks %}
        {% for block in section.blocks %}
          <hk-block of="{{ block }}" />
        {% endfor %}
      {% else %}
        {% render 'faq-item', q: t('faq_1_q'), a: t('faq_1_a') %}
        {% render 'faq-item', q: t('faq_2_q'), a: t('faq_2_a') %}
        {% render 'faq-item', q: t('faq_3_q'), a: t('faq_3_a') %}
        {% render 'faq-item', q: t('faq_4_q'), a: t('faq_4_a') %}
      {% endif %}
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "FAQ",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty: the theme's own words)",
        "default": "",
        "maxLength": 60
      }
    },
    "blocks": {
      "allowed": ["faq-item"],
      "max": 12
    }
  }
</hk-schema>
```

```html title="snippets/faq-item.sneferu"
<details class="ls-faq-item">
  <summary>
    <span>{{ q }}</span>
    <svg class="ls-chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      /></svg>
  </summary>
  <p>{{ a }}</p>
</details>
```

Each question is a `<details>` element, so it opens and closes without script.
The chevron turns with `.ls-faq-item[open] .ls-chevron { transform: rotate(180deg); }`.
The answers state only what is true for digital products on Hekana: the key
and the download link arrive by email after online payment, and there is no
cash on delivery.

## 7. Phones

```css title="assets/theme.css (excerpt)"
/* Phones: centred hero, three small plan cards in a row, three small app cards */
@media (max-width: 639px) {
  .ls-wrap { padding-inline: 14px; }
  .ls-header { padding-block: 10px; }
  .ls-header-row { gap: 8px; }
  .ls-search { width: 40px; padding: 0; justify-content: center; border: 0; }
  .ls-search span { display: none; }
  .ls-hero { padding-block: 24px 28px; }
  .ls-hero-row { grid-template-columns: 1fr; gap: 26px; }
  .ls-hero-copy { text-align: center; display: flex; flex-direction: column; align-items: center; }
  .ls-h1 { font-size: 27px; }
  .ls-lead { margin: 10px 0 0; font-size: 12px; }
  .ls-hero-copy .ls-btn { display: none; }
  .ls-tiers { gap: 7px; }
  .ls-tier { padding: 12px 6px 10px; }
```

## 8. Words

```json title="locales/en.json (excerpt)"
{
  "nav_label": "Main menu",
  "nav_plans": "Plans",
  "nav_features": "Features",
  "nav_apps": "Apps",
  "nav_faq": "FAQ",
  "menu": "Menu",
  "search": "Search for an app",
  "account": "My account",
  "cart": "Cart",
  "href_search": "/en/search",
  "href_account": "/en/account",
  "href_cart": "/en/cart",
  "href_products": "/en/products",
  "href_other_locale": "/",
  "other_locale": "العربية",
  "hero_line1": "Every app you need",
  "hero_line2": "on one licence",
  "hero_text": "Pick the plan that suits you. Your licence key is emailed after online payment.",
  "hero_button": "See the apps",
```

The Arabic file has the same keys in Egyptian Arabic.
## Reproduce it

```bash
npx @hekana/sneferu init license          # start from the starter theme
cd license
# replace the starter files with the ones above, then:
npx @hekana/sneferu format              # indent .sneferu, theme.json and locales
npx @hekana/sneferu validate            # must print: theme license@1.0.1 is valid
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
slug of your own; `license` here is the slug Hekana uses for its own copy. Bump
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
