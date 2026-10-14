# Tabkha (طبخة)

A fresh home-kitchen food store theme for Sneferu: tomato red and cream with olive accents, a bold red hero, a row of picks overlapping the hero edge, today's menu as rounded dish cards with quick add buttons, and a calm trust strip. Phones turn the cards into list rows.

| Page | Desktop ar | Desktop en | Phone ar |
| - | - | - | - |
| Home | ![](docs/live-home-desktop-ar.webp) | ![](docs/live-home-desktop-en.webp) | ![](docs/live-home-phone-ar.webp) |
| Product | ![](docs/live-product-desktop-ar.webp) | ![](docs/live-product-desktop-en.webp) | ![](docs/live-product-phone-ar.webp) |
| Cart | ![](docs/live-cart-desktop-ar.webp) | ![](docs/live-cart-desktop-en.webp) | ![](docs/live-cart-phone-ar.webp) |

Mockup: `docs/mockup-desktop.webp`, `docs/mockup-phone.webp`.

## What is in the folder

- `theme.json`: tokens (tomato primary, olive secondary, cream background, Baloo Bhaijaan 2 headings, Cairo body), `money.format: whole`.
- `sections/hero.snf`, `tk-picks.snf`, `tk-menu.snf`, `tk-trust.snf`: the home page. `blocks/day-tab.snf` is an editable chip row (no time slots are promised).
- `snippets/product-card.snf`: dish card with option chips (guarded by `product.options`) and a quick add button; products with variants link to the product page instead.
- Cart, collection, search, product, page and 404 sections, plus the header, footer and announcement groups.

## Excerpt

```
{% if product.has_variants %}
  <hk-button label="{{ t('choose_option') }}" href="{{ product.url }}" variant="outline" size="sm" />
{% else %}
  <hk-add-to-cart product="{{ product }}" label="{{ t('quick_add') }}" quantity="false" />
{% endif %}
```
