# Tutorial: Velvet, a dark gold jewelry store

Velvet is a full store theme for a fine-jewelry shop: forest-green and black
grounds, thin gold hairlines, a rounded hero card with the photo fading into the
text, three outlined category links, a three-column grid of rounded cards with a
round gold karat chip (the product's first tag) and a boxed three-icon trust strip.
Right-to-left in Arabic and left-to-right in English from the same files.

The theme writes **every page type itself**: home, product, collection, search,
cart, 404 and content page, with announcement, header and footer groups.

| Page | Arabic, desktop | English, desktop | Arabic, phone |
| - | - | - | - |
| Home | ![Home](docs/live-home-desktop-ar.webp) | ![Home](docs/live-home-desktop-en.webp) | ![Home](docs/live-home-phone-ar.webp) |
| Product | ![Product](docs/live-product-desktop-ar.webp) | ![Product](docs/live-product-desktop-en.webp) | ![Product](docs/live-product-phone-ar.webp) |
| Cart | ![Cart](docs/live-cart-desktop-ar.webp) | ![Cart](docs/live-cart-desktop-en.webp) | ![Cart](docs/live-cart-phone-ar.webp) |

The design brief was this mockup (placeholder Arabic and fake logo, replaced by a
plain-text wordmark):

![Mockup](docs/mockup-desktop.webp) ![Mockup, phone](docs/mockup-phone.webp)

## What is in the folder

```
theme.json                 id, version, tokens (forest, black, gold, gold-soft)
layout/theme.snf           announcement, header, <main>, footer
groups/                    announcement.json, header.json, footer.json
templates/                 index, product, collection, search, cart, 404, page
sections/                  announcement-bar, header, footer, hero, collection-chips, trust-strip,
                           featured-products, product-main, related-products,
                           collection-main, search-main, cart-main, not-found, page-main
blocks/                    chip-link, trust, menu-link, footer-*, social-link, product-* blocks
snippets/                  product-card, price, button
locales/                   ar.json, en.json (same keys)
assets/theme.css           the only stylesheet; every colour is a token
docs/                      screenshots
```

## Run it

```bash
sneferu dev .
sneferu format .
sneferu validate .
```

## Annotated excerpts

The karat chip is the product's first tag, so merchants edit it like any tag:

```
{% if product.tags %}{% for tag in product.tags limit: 1 %}<span class="vl-karat">{{ tag }}</span>{% endfor %}{% endif %}
```

Gold hairlines are one token mixed with transparency, never a colour literal:

```css
--vl-gold-line: 1px solid color-mix(in srgb, var(--hk-color-accent) 45%, transparent);
```
