# Sukoon

A soft minimal home store theme for Sneferu: warm off-white and sand ground, a muted olive accent, rounded photo tiles, a quiet hero, category tiles, a calm product row and story blocks that alternate photo and text. Arabic first (RTL) with English.

| Page | Arabic | English |
| - | - | - |
| Home | ![home](docs/live-home-desktop-ar.webp) | |
| Product | ![product](docs/live-product-desktop-ar.webp) | ![product](docs/live-product-desktop-en.webp) |
| Cart | ![cart](docs/live-cart-desktop-ar.webp) | ![cart](docs/live-cart-desktop-en.webp) |
| Phone | ![phone](docs/live-home-phone-ar.webp) | |

## What is in the folder

- `theme.json`: tokens (olive primary, sage and sand extras), Readex Pro and Almarai, whole-pound money.
- `layout/`, `groups/`: announcement, header (logo image or store name, menu, search, cart drawer) and footer (store name, link columns, payment line).
- `sections/`: `hero`, `sk-tiles` (category tiles), `featured-products`, `sk-story`, `sk-trust`, plus the page sections.
- `blocks/`, `snippets/`, `templates/` for all seven page types, `locales/` ar and en.

## Excerpt: a block that renders only when it has a link

```
{% if block.settings.url %}
  <a class="sk-social" href="{{ url(block.settings.url) }}" aria-label="{{ block.settings.label }}">…</a>
{% endif %}
```

Empty footer social and contact blocks therefore leave no dead line.
