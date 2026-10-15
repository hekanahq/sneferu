# Tutorial: Henna, a warm glow makeup store

Henna is a makeup and hair care store: terracotta, sand and bronze on a cream
ground, round shade swatches under every product, shop-by-concern tiles and a
look-ideas strip. It writes **every page type itself**: home, product,
collection, search, cart, 404 and content page, with an editable announcement
bar, header and footer.

| Mockup | Home, Arabic | Home, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Home, Arabic](docs/live-home-desktop-ar.webp) | ![Home, English](docs/live-home-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Home, Arabic, phone](docs/live-home-phone-ar.webp) | |

| Product, Arabic | Product, English | Cart, Arabic | Cart, English |
| - | - | - | - |
| ![Product, Arabic](docs/live-product-desktop-ar.webp) | ![Product, English](docs/live-product-desktop-en.webp) | ![Cart, Arabic](docs/live-cart-desktop-ar.webp) | ![Cart, English](docs/live-cart-desktop-en.webp) |

The mockup was a design brief: its Arabic is placeholder text and its photo is
a face close-up. The theme keeps the look and uses real Arabic copy, Egyptian
pounds and product photos. The hero takes an optional photo setting; without
one it shows up to three product arches over a terracotta gradient.

## What you will learn

- how a hero can switch between a photo and block-driven product arches
- how shade swatches are drawn in CSS from a product's first option (no photos)
- how concern tiles and a look strip are blocks with a colour select
- how tokens in `theme.json` colour the whole store

## Run it

```bash
sneferu dev . --port 4208   # Arabic; add ?locale=en for English
sneferu format .
sneferu validate .
```

Sample data lives in `.sneferu-dev/data.json` and is never part of the theme.

## What is in the folder

```
henna/
  theme.json            tokens: primary/accent terracotta, sand, clay, tan, bronze, gold
  layout/theme.snf      skip link, the three groups, <main>
  groups/               announcement, header, footer defaults
  templates/            index product collection search cart page 404
  sections/             hero concerns shelf trust-strip look-strip + page sections
  blocks/               hero-shot concern trust-item look-item + product blocks
  snippets/card.snf     product card with swatches
  locales/              ar.json en.json (same keys)
  assets/theme.css
```

## Swatches from options

```
{% for o in p.options limit: 1 %}
  <p class="hn-swatches" role="list" aria-label="{{ t('shades') }}">
    {% for v in o.values limit: 6 %}<span class="hn-sw" role="listitem" title="{{ v }}"></span>{% endfor %}
  </p>
{% endfor %}
```

Each dot is tinted by its position (`.hn-sw:nth-child(n)`) from the sand-to-bronze
tokens, so any product with a first option gets a light-to-deep row.
