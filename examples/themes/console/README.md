# Tutorial: Console, a clean white gaming store

Console is a home page for a shop that sells game gift cards, currency packs and
subscriptions as codes. It is white with one royal-blue accent and soft
shadows: a centred navigation, a search field, a carousel of large product
cards, a three-way amount selector, a row of platform icons, a trust strip, a
product grid and a FAQ. It is right-to-left in Arabic and left-to-right in
English from the same files.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief. Its Arabic is placeholder text, its
prices were in riyals, its indigo became a true blue (`#1D4ED8`), and its
console and payment brand logos became plain icons with text labels. Live:
[demo-console.hekana.com](https://demo-console.hekana.com) and
[/en](https://demo-console.hekana.com/en).

What the theme uses: plain HTML for structure, `hk-section`, `hk-stack`,
`hk-heading`, `hk-image`, `hk-price` and `hk-product-grid`, a `{% for %}` loop
over a collection, a scroll-snap carousel with anchor-link arrows, and one
stylesheet. There is no JavaScript.

## Files

```
assets/fonts.css
assets/theme.css
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/console-amounts.sneferu
sections/console-faq.sneferu
sections/console-platforms.sneferu
sections/console-products.sneferu
sections/console-showcase.sneferu
sections/console-trust.sneferu
snippets/faq-item.sneferu
snippets/icon.sneferu
snippets/platform.sneferu
snippets/trust.sneferu
templates/index.sneferu
theme.json
```

Next to the theme: `README.md` and `docs/` (this tutorial and its pictures).
The CLI skips both.

## Data it needs

| What | Used by |
| - | - |
| Products marked featured (or the newest products) with an image | the carousel and the product grid, via `collection('featured')` |
| Categories `gift-cards`, `game-currency`, `top-ups`, `subscriptions` | the platform icons and the navigation |

## 1. Start from the starter

```bash
npx @hekana/sneferu init console
cd console
```

Delete the starter's sections and `blocks/`.

## 2. Manifest and tokens

```json title="theme.json"
{
  "id": "console",
  "name": "Console",
  "version": "1.0.1",
  "author": "Hekana",
  "description": "A clean white gaming store for gift cards and top-ups: one royal-blue accent, large product cards, an amount selector and a platform row.",
  "category": "gaming",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#1D4ED8",
      "secondary": "#0F172A",
      "accent": "#1D4ED8",
      "background": "#FFFFFF",
      "text": "#0F172A",
      "muted": "#64748B",
      "line": "#E5E7EB",
      "soft": "#F5F7FB"
    },
    "layout": { "contentWidth": "1120px" }
  }
}
```

- `primary` and `accent` are both the blue: one accent colour is the whole
  look. `soft` is the pale grey of the FAQ rows and hover states.
- `contentWidth` is 1120 px, a little narrower than the default, for the
  amount of white space in the mockup.

## 3. Fonts and icons

`assets/fonts.css` loads IBM Plex Sans Arabic from Google Fonts (Arabic and
Latin subsets):

```css title="assets/fonts.css"
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfQ.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys93PU.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPO_-CRXMR5Kw.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPO_-CUXMQ.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCRXMR5Kw.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'IBM Plex Sans Arabic'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YOG-eCUXMQ.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
```

`snippets/icon.sneferu` is the same inline SVG set as the Arcade example, plus
`user`, `monitor`, `lock`, `gift` and `arrow`:

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
  {% elsif name == 'user' %}<circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  {% elsif name == 'monitor' %}<rect x="2.5" y="4" width="19" height="12.5" rx="2" /><path d="M8.5 20.5h7M12 16.5v4" />
  {% elsif name == 'lock' %}<rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path
      d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"
    />
  {% elsif name == 'gift' %}<rect x="3.5" y="8.5" width="17" height="12" rx="1.5" /><path
      d="M2.5 8.5h19v4h-19zM12 8.5v12M12 8.5c-1.5-3.5-6-4-6-1.2C6 9 9 8.5 12 8.5zM12 8.5c1.5-3.5 6-4 6-1.2 0 1.7-3 1.2-6 1.2z"
    />
  {% elsif name == 'arrow' %}<path d="M15 5l-7 7 7 7" />
  {% elsif name == 'chevron' %}<path d="M9 6l6 6-6 6" />
  {% endif %}
</svg>
```

## 4. Layout: header and footer

```html title="layout/theme.sneferu"
<header class="cc-header">
  <hk-container>
    <div class="cc-bar">
      <a class="cc-logo" href="{{ t('url_home') }}">{{ store.name }}</a>
      <nav class="cc-nav" aria-label="{{ t('nav_label') }}">
        <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
        <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
        <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
        <a href="{{ t('url_prefix') }}/category/subscriptions">{{ t('cat_subscriptions') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
      <div class="cc-icons">
        <a
          class="cc-icon"
          href="{{ t('url_account') }}"
          aria-label="{{ t('account') }}"
        >{% render 'icon', name: 'user' %}</a>
        <a class="cc-icon" href="{{ t('url_cart') }}" aria-label="{{ t('cart') }}">{% render 'icon', name: 'cart' %}</a>
      </div>
    </div>
    <a class="cc-search" href="{{ t('url_search') }}">
      <span>{{ t('search_placeholder') }}</span>
      {% render 'icon', name: 'search' %}
    </a>
  </hk-container>
</header>
<main><hk-slot name="content" /></main>
<footer class="cc-footer">
  <hk-container>
    <div class="cc-footer-row">
      <div class="cc-footer-brand">
        <span class="cc-logo">{{ store.name }}</span>
        <p>{{ t('footer_about') }}</p>
      </div>
      <nav class="cc-footer-links" aria-label="{{ t('footer_links') }}">
        <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
        <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
        <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
    </div>
    <p class="cc-copy">© {{ store.name }}</p>
  </hk-container>
</footer>
```

```css title="assets/theme.css (root and header)"
/* Console: white ground, one royal-blue accent, soft shadows, lots of space. */
[data-hk-theme='console'] {
  --cc-blue: var(--hk-color-accent);
  --cc-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 28px rgba(15, 23, 42, 0.07);
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  line-height: 1.6;
}
:where([data-hk-theme='console'] a) { color: inherit; text-decoration: none; }
:where([data-hk-theme='console'] h1, [data-hk-theme='console'] h2, [data-hk-theme='console'] p) { margin: 0; }
.ic { width: 24px; height: 24px; flex: none; }
.cc-h2 { font-weight: 700; }

/* Header */
.cc-header { padding-block: 16px 8px; }
.cc-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; min-height: 56px; }
.cc-logo { justify-self: start; display: inline-flex; align-items: center; min-height: 40px; padding-inline: 18px; border-radius: 999px; background: #EEF0F4; font-weight: 700; font-size: 16px; }
.cc-nav { display: flex; gap: 32px; font-size: 16px; font-weight: 600; }
.cc-nav a { display: inline-flex; align-items: center; min-height: 44px; }
.cc-nav a:hover, .cc-icon:hover { color: var(--cc-blue); }
.cc-icons { justify-self: end; display: flex; gap: 4px; }
.cc-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; }
.cc-icon .ic { width: 26px; height: 26px; }
.cc-search { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; max-width: 480px; min-height: 52px; margin: 20px auto 0; padding-inline: 20px 16px; border-radius: 999px; border: 1px solid var(--hk-color-line); background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); color: var(--hk-color-muted); font-size: 15px; }
.cc-search .ic { color: var(--cc-blue); width: 22px; height: 22px; }
.cc-search:hover { border-color: var(--cc-blue); }
```

- The header is a three-column grid: logo at the start, navigation in the
  middle, icons at the end. Grid follows `dir`, so it mirrors in English.
- The logo is the store name in a grey pill, like the mockup's logo
  placeholder.
- The search field is a link to the store's search page (themes have no form
  inputs).

## 5. Product carousel

```html title="sections/console-showcase.sneferu"
<hk-section padding-y="32" mobile-padding-y="16" class="cc-showcase">
  {% if collection('featured').products %}
    <div class="cc-carousel">
      <a
        class="cc-arrow cc-arrow-prev"
        href="#cc-start"
        aria-label="{{ t('carousel_start') }}"
      >{% render 'icon', name: 'arrow' %}</a>
      <div class="cc-track">
        <span id="cc-start" class="cc-anchor"></span>
        {% for p in collection('featured').products limit: 6 %}
          <a class="cc-slide" href="{{ p.url }}">
            <span class="cc-slide-art">
              {% if p.image %}
                <hk-image
                  src="{{ p.image.url }}"
                  alt="{{ p.title }}"
                  aspect-ratio="1/1"
                  fit="cover"
                  radius="14"
                  loading="eager"
                />
              {% else %}
                <span class="cc-slide-fallback">{% render 'icon', name: 'gift' %}</span>
              {% endif %}
              <span class="cc-platforms" aria-hidden="true">
                <span>{% render 'icon', name: 'gamepad' %}</span>
                <span>{% render 'icon', name: 'monitor' %}</span>
                <span>{% render 'icon', name: 'phone' %}</span>
              </span>
            </span>
            <span class="cc-slide-body">
              <strong class="cc-slide-title">{{ p.title }}</strong>
              <span class="cc-slide-note">{{ t('slide_note') }}</span>
              <hk-price amount="{{ p.price }}" compare-at="{{ p.compare_at }}" class="cc-slide-price" />
            </span>
          </a>
        {% endfor %}
        <span id="cc-end" class="cc-anchor"></span>
      </div>
      <a
        class="cc-arrow cc-arrow-next"
        href="#cc-end"
        aria-label="{{ t('carousel_end') }}"
      >{% render 'icon', name: 'arrow' %}</a>
    </div>
  {% else %}
    <p class="cc-empty">{{ t('empty_products') }}</p>
  {% endif %}
</hk-section>
<hk-schema>
  {
    "name": "Product showcase",
    "version": 1,
    "settings": {}
  }
</hk-schema>
```

- `{% for p in collection('featured').products limit: 6 %}` draws one large
  card per product: `hk-image` for the picture, `hk-price` for the price and
  the crossed-out old price.
- Product data has no description, so the blue note under the title is a
  locale line about code delivery.
- The track is a horizontal scroll-snap row. With no JavaScript, the arrows
  are links to two empty anchors, `#cc-start` and `#cc-end`, placed at the two
  ends of the track; following one scrolls the track to that end.

```css title="assets/theme.css (carousel)"
/* Showcase carousel: scroll-snap, arrows jump to the start and the end of the track */
.cc-carousel { position: relative; display: flex; align-items: center; gap: 24px; max-width: 1040px; margin-inline: auto; }
.cc-track { flex: 1; display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; padding: 16px 16px 28px; scrollbar-width: none; scroll-padding-inline: 16px; margin-block: -12px; }
.cc-track::-webkit-scrollbar { display: none; }
.cc-anchor { flex: 0 0 1px; }
.cc-slide { flex: 0 0 calc(50% - 10px); scroll-snap-align: start; display: flex; align-items: center; gap: 28px; padding: 32px; border-radius: 16px; background: #fff; box-shadow: var(--cc-shadow); transition: box-shadow 0.15s, transform 0.15s; }
.cc-slide:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05), 0 14px 36px rgba(15, 23, 42, 0.1); }
.cc-slide-art { order: 2; flex: 0 0 150px; display: grid; gap: 12px; justify-items: center; }
.cc-slide-art img { width: 150px; height: 150px; object-fit: cover; border-radius: 14px; }
.cc-slide-fallback { display: inline-flex; width: 150px; height: 150px; align-items: center; justify-content: center; border-radius: 14px; background: var(--cc-blue); color: #fff; }
.cc-slide-fallback .ic { width: 64px; height: 64px; }
.cc-platforms { display: flex; gap: 6px; }
.cc-platforms span { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 50%; background: #0F172A; color: #fff; }
.cc-platforms .ic { width: 18px; height: 18px; }
.cc-slide-body { flex: 1; display: grid; gap: 8px; }
.cc-slide-title { font-size: 24px; line-height: 1.35; }
.cc-slide-note { font-size: 15px; color: var(--cc-blue); line-height: 1.6; }
.cc-slide-price { margin-top: 10px; font-weight: 700; font-size: 20px; }
.cc-arrow { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; color: #94A3B8; }
.cc-arrow:hover { color: var(--cc-blue); background: var(--hk-color-soft); }
[dir='rtl'] .cc-arrow .ic { transform: scaleX(-1); }
.cc-arrow-next .ic { transform: scaleX(-1); }
[dir='rtl'] .cc-arrow-next .ic { transform: none; }
```

- In the card, the picture gets `order: 2`, so the text comes first: on the
  right in Arabic, on the left in English.
- The arrow icons point the right way in both directions with
  `[dir='rtl'] … scaleX(-1)`.

## 6. Amount selector

```html title="sections/console-amounts.sneferu"
<hk-section padding-y="24" mobile-padding-y="16" class="cc-amounts">
  <nav class="cc-seg" aria-label="{{ t('amounts_label') }}">
    <a class="cc-seg-item" href="{{ t('url_search') }}"><span>{{ section.settings.amount_1 }}</span>
      <small>{{ t('egp') }}</small></a>
    <a class="cc-seg-item is-active" href="{{ t('url_search') }}"><span>{{ section.settings.amount_2 }}</span>
      <small>{{ t('egp') }}</small></a>
    <a class="cc-seg-item" href="{{ t('url_search') }}"><span>{{ section.settings.amount_3 }}</span>
      <small>{{ t('egp') }}</small></a>
  </nav>
</hk-section>
<hk-schema>
  {
    "name": "Amount selector",
    "version": 1,
    "settings": {
      "amount_1": {
        "type": "number",
        "label": "Amount 1 (EGP)",
        "default": 200,
        "min": 1,
        "max": 100000
      },
      "amount_2": {
        "type": "number",
        "label": "Amount 2, highlighted (EGP)",
        "default": 500,
        "min": 1,
        "max": 100000
      },
      "amount_3": {
        "type": "number",
        "label": "Amount 3 (EGP)",
        "default": 1000,
        "min": 1,
        "max": 100000
      }
    }
  }
</hk-schema>
```

```css title="assets/theme.css (amount selector)"
/* Amount selector */
.cc-seg { display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; max-width: 560px; margin-inline: auto; padding: 5px; border-radius: 999px; background: #fff; box-shadow: var(--cc-shadow); border: 1px solid #F1F5F9; }
.cc-seg-item { display: inline-flex; align-items: baseline; justify-content: center; gap: 4px; min-height: 64px; padding-top: 15px; border-radius: 999px; font-weight: 600; font-size: 22px; }
.cc-seg-item small { font-size: 12px; font-weight: 500; color: var(--hk-color-muted); }
.cc-seg-item:hover { color: var(--cc-blue); }
.cc-seg-item.is-active { background: var(--cc-blue); color: #fff; }
.cc-seg-item.is-active small { color: rgba(255, 255, 255, 0.8); }
```

The selector is three links in a pill; the middle one is the highlighted
amount. The amounts are whole pounds, so they print with `t('egp')` rather than
`money`.

## 7. Platforms and trust strip

```html title="sections/console-platforms.sneferu"
<hk-section padding-y="32" mobile-padding-y="24" class="cc-platforms-row">
  <hk-stack gap="24" align="center">
    <hk-heading
      text="{{ section.settings.heading | default: t('platforms_heading') }}"
      level="h2"
      size="24"
      mobile-size="20"
      align="center"
      class="cc-h2"
    />
    <div class="cc-plats">
      {% render 'platform', icon: 'monitor', handle: 'gift-cards', label: t('plat_pc') %}
      {% render 'platform', icon: 'gamepad', handle: 'gift-cards', label: t('plat_console') %}
      {% render 'platform', icon: 'gem', handle: 'game-currency', label: t('plat_currency') %}
      {% render 'platform', icon: 'phone', handle: 'top-ups', label: t('plat_mobile') %}
      {% render 'platform', icon: 'calendar', handle: 'subscriptions', label: t('plat_subs') %}
    </div>
  </hk-stack>
</hk-section>
<hk-schema>
  {
    "name": "Platforms",
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

```html title="snippets/platform.sneferu"
<a class="cc-plat" href="{{ t('url_prefix') }}/category/{{ handle }}">
  <span class="cc-plat-icon">{% render 'icon', name: icon %}</span>
  <span class="cc-plat-label">{{ label }}</span>
</a>
```

```html title="sections/console-trust.sneferu"
<hk-section padding-y="20" class="cc-trust">
  <ul class="cc-trust-list">
    {% render 'trust', icon: 'bolt', label: t('trust_instant') %}
    {% render 'trust', icon: 'lock', label: t('trust_secure') %}
    {% render 'trust', icon: 'pay', label: t('trust_egp') %}
  </ul>
</hk-section>
<hk-schema>
  {
    "name": "Trust strip",
    "version": 1,
    "settings": {}
  }
</hk-schema>
```

```html title="snippets/trust.sneferu"
<li class="cc-trust-item">
  <span class="cc-trust-icon">{% render 'icon', name: icon %}</span>
  <span>{{ label }}</span>
</li>
```

```css title="assets/theme.css (platforms, trust strip)"
/* Platforms */
.cc-plats { display: flex; justify-content: center; gap: 64px; flex-wrap: wrap; }
.cc-plat { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 72px; }
.cc-plat-icon { display: inline-flex; width: 72px; height: 72px; align-items: center; justify-content: center; border-radius: 50%; color: #0F172A; transition: color 0.15s, background 0.15s; }
.cc-plat-icon .ic { width: 50px; height: 50px; stroke-width: 1.7; }
.cc-plat:hover .cc-plat-icon { color: var(--cc-blue); background: var(--hk-color-soft); }
.cc-plat-label { font-size: 13px; color: var(--hk-color-muted); }

/* Trust strip */
.cc-trust-list { list-style: none; margin: 0 auto; padding: 0; display: flex; justify-content: center; gap: 12px 36px; flex-wrap: wrap; }
.cc-trust-item { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #334155; }
.cc-trust-icon { display: inline-flex; color: var(--cc-blue); }
.cc-trust-icon .ic { width: 20px; height: 20px; }
```

The mockup's row of console and payment logos is replaced with plain icons and
text labels: a theme should never draw other companies' logos.

## 8. Product grid and FAQ

```html title="sections/console-products.sneferu"
<hk-section padding-y="40" mobile-padding-y="28" class="cc-products">
  <hk-stack gap="20">
    <div class="cc-row-head">
      <hk-heading
        text="{{ section.settings.heading | default: t('products_heading') }}"
        level="h2"
        size="24"
        mobile-size="20"
        class="cc-h2"
      />
      <a class="cc-more" href="{{ t('url_products') }}">{{ t('view_all') }}</a>
    </div>
    {% if collection('featured').products %}
      <hk-product-grid
        products="{{ collection('featured').products }}"
        limit="{{ section.settings.count }}"
        columns="4"
        tablet-columns="3"
        mobile-columns="2"
        class="cc-grid"
      />
    {% else %}
      <p class="cc-empty">{{ t('empty_products') }}</p>
    {% endif %}
  </hk-stack>
</hk-section>
<hk-schema>
  {
    "name": "Product grid",
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

```html title="sections/console-faq.sneferu"
<hk-section padding-y="48" mobile-padding-y="32" class="cc-faq">
  <div id="faq" class="cc-faq-wrap">
    <hk-heading
      text="{{ section.settings.heading | default: t('faq_heading') }}"
      level="h2"
      size="24"
      mobile-size="20"
      class="cc-h2"
    />
    {% render 'faq-item', q: t('faq_1_q'), a: t('faq_1_a') %}
    {% render 'faq-item', q: t('faq_2_q'), a: t('faq_2_a') %}
    {% render 'faq-item', q: t('faq_3_q'), a: t('faq_3_a') %}
    {% render 'faq-item', q: t('faq_4_q'), a: t('faq_4_a') %}
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
<details class="cc-faq-item">
  <summary>
    {{ q }}{% render 'icon', name: 'chevron' %}
  </summary>
  <p>{{ a }}</p>
</details>
```

```css title="assets/theme.css (grid, FAQ, footer)"
/* Product grid */
.cc-row-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.cc-more { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; font-weight: 600; color: var(--cc-blue); }
.cc-grid .sn-product-card { display: flex; flex-direction: column; gap: 6px; padding: 12px 12px 16px; border-radius: 16px; background: #fff; box-shadow: var(--cc-shadow); transition: transform 0.15s; }
.cc-grid .sn-product-card:hover { transform: translateY(-2px); }
.cc-grid .sn-product-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 12px; background: var(--hk-color-soft); }
.cc-grid .sn-title { font-size: 15px; font-weight: 500; padding-inline: 2px; }
.cc-grid .sn-price { font-weight: 700; padding-inline: 2px; }
.cc-grid .sn-price, .cc-slide-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 6px; white-space: nowrap; }
.sn-was { color: var(--hk-color-muted); font-weight: 400; margin-inline-start: 6px; font-size: 13px; }
.cc-empty { color: var(--hk-color-muted); text-align: center; }

/* FAQ */
.cc-faq-wrap { max-width: 760px; margin-inline: auto; display: grid; gap: 10px; scroll-margin-top: 24px; }
.cc-faq-wrap > h2 { text-align: center; margin-bottom: 8px; }
.cc-faq-item { border-radius: 14px; background: var(--hk-color-soft); }
.cc-faq-item summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 12px 20px; cursor: pointer; font-weight: 600; }
.cc-faq-item summary::-webkit-details-marker { display: none; }
.cc-faq-item summary .ic { width: 18px; height: 18px; color: var(--cc-blue); transform: rotate(90deg); transition: transform 0.15s; }
.cc-faq-item[open] summary .ic { transform: rotate(-90deg); }
.cc-faq-item p { padding: 0 20px 16px; color: #475569; }

/* Footer */
.cc-footer { margin-top: 32px; padding-block: 36px 24px; border-top: 1px solid var(--hk-color-line); }
.cc-footer-row { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.cc-footer-brand { display: grid; gap: 10px; max-width: 420px; justify-items: start; }
.cc-footer-brand p { font-size: 14px; color: var(--hk-color-muted); }
.cc-footer-links { display: flex; flex-wrap: wrap; gap: 4px 24px; }
.cc-footer-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; color: #475569; }
.cc-footer-links a:hover { color: var(--cc-blue); }
.cc-copy { margin-top: 16px; font-size: 13px; color: var(--hk-color-muted); }

@media (max-width: 1023px) {
  .cc-nav { display: none; }
  .cc-bar { grid-template-columns: 1fr auto; }
}
@media (max-width: 639px) {
  .cc-header { padding-top: 8px; }
  .cc-logo { min-height: 36px; padding-inline: 14px; font-size: 15px; }
  .cc-search { margin-top: 12px; min-height: 46px; max-width: none; }
  .cc-carousel { gap: 0; }
  .cc-arrow { display: none; }
  .cc-track { gap: 12px; padding-inline: 2px; }
  .cc-slide { flex: 0 0 calc(50% - 6px); flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; text-align: center; }
  .cc-slide-art { order: 0; flex: none; }
  .cc-slide-art img, .cc-slide-fallback { width: 88px; height: 88px; }
  .cc-platforms { display: none; }
  .cc-slide-title { font-size: 15px; }
  .cc-slide { gap: 10px; }
  .cc-slide-note { font-size: 11px; }
  .cc-slide-price { font-size: 14px; margin-top: 2px; }
  .cc-seg-item { min-height: 44px; padding-top: 9px; font-size: 16px; }
  .cc-plat-icon { width: 48px; height: 48px; }
  .cc-plats { width: 100%; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
  .cc-plat { min-width: 0; text-align: center; }
  .cc-plat-icon .ic { width: 32px; height: 32px; }
  .cc-plat-label { font-size: 11px; line-height: 1.4; }
  .sn-was { margin-inline-start: 0; font-size: 12px; }
  .cc-trust-list { flex-direction: column; align-items: center; gap: 10px; }
}
```

## 9. Locale files

```json title="locales/en.json"
{
  "url_prefix": "/en",
  "url_home": "/en",
  "url_products": "/en/products",
  "url_search": "/en/search",
  "url_cart": "/en/cart",
  "cart": "Cart",
  "nav_all": "All products",
  "nav_faq": "Questions",
  "search_placeholder": "Search for a card or game",
  "egp": "EGP",
  "cat_gift_cards": "Gift cards",
  "cat_currency": "In-game currency",
  "cat_subscriptions": "Subscriptions",
  "view_all": "View all",
  "empty_products": "No products here yet.",
  "faq_heading": "Questions",
  "faq_1_q": "When does the code arrive?",
  "faq_1_a": "Once your online payment is confirmed, the code is sent automatically to the email on your order.",
  "faq_2_q": "Can I pay cash on delivery?",
  "faq_2_a": "Instant delivery works with online payment only. If the store accepts cash on delivery, the code is not sent instantly.",
  "faq_3_q": "Will the card work on my account?",
  "faq_3_a": "Each card's page lists the region it works in. Check that your account uses the same region before you buy.",
  "faq_4_q": "The code did not work. What now?",
  "faq_4_a": "Contact us with your order number and we will check the code with you.",
  "footer_about": "Gift cards and game top-ups in Egyptian pounds. Your code arrives by email after online payment.",
  "footer_links": "Store links",
  "products_heading": "All cards",
  "url_account": "/en/account",
  "account": "My account",
  "nav_label": "Store sections",
  "carousel_start": "First cards",
  "carousel_end": "Last cards",
  "slide_note": "Your code arrives by email after online payment.",
  "amounts_label": "Pick an amount",
  "platforms_heading": "Shop by platform",
  "plat_pc": "PC",
  "plat_console": "Console",
  "plat_currency": "Game currency",
  "plat_mobile": "Mobile",
  "plat_subs": "Subscriptions",
  "trust_instant": "Instant code delivery",
  "trust_secure": "Secure online payment",
  "trust_egp": "Prices in Egyptian pounds"
}
```

`locales/ar.json` has the same keys in Egyptian Arabic, for example:

```json title="locales/ar.json (excerpt)"
{
  "slide_note": "الكود بيوصلك على الإيميل بعد الدفع الأونلاين.",
  "platforms_heading": "تسوق حسب المنصة",
  "trust_instant": "تسليم فوري للكود",
  "trust_secure": "دفع أونلاين آمن"
}
```

## 10. The page and the phone layout

```html title="templates/index.sneferu"
<hk-sections />
<hk-schema>
  {
    "sections": [
      {
        "type": "console-showcase"
      },
      {
        "type": "console-amounts"
      },
      {
        "type": "console-platforms"
      },
      {
        "type": "console-trust"
      },
      {
        "type": "console-products"
      },
      {
        "type": "console-faq"
      }
    ]
  }
</hk-schema>
```

```css title="assets/theme.css (tablet and phone)"
@media (max-width: 1023px) {
  .cc-nav { display: none; }
  .cc-bar { grid-template-columns: 1fr auto; }
}
@media (max-width: 639px) {
  .cc-header { padding-top: 8px; }
  .cc-logo { min-height: 36px; padding-inline: 14px; font-size: 15px; }
  .cc-search { margin-top: 12px; min-height: 46px; max-width: none; }
  .cc-carousel { gap: 0; }
  .cc-arrow { display: none; }
  .cc-track { gap: 12px; padding-inline: 2px; }
  .cc-slide { flex: 0 0 calc(50% - 6px); flex-direction: column; align-items: stretch; gap: 10px; padding: 12px; text-align: center; }
  .cc-slide-art { order: 0; flex: none; }
  .cc-slide-art img, .cc-slide-fallback { width: 88px; height: 88px; }
  .cc-platforms { display: none; }
  .cc-slide-title { font-size: 15px; }
  .cc-slide { gap: 10px; }
  .cc-slide-note { font-size: 11px; }
  .cc-slide-price { font-size: 14px; margin-top: 2px; }
  .cc-seg-item { min-height: 44px; padding-top: 9px; font-size: 16px; }
  .cc-plat-icon { width: 48px; height: 48px; }
  .cc-plats { width: 100%; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
  .cc-plat { min-width: 0; text-align: center; }
  .cc-plat-icon .ic { width: 32px; height: 32px; }
  .cc-plat-label { font-size: 11px; line-height: 1.4; }
  .sn-was { margin-inline-start: 0; font-size: 12px; }
  .cc-trust-list { flex-direction: column; align-items: center; gap: 10px; }
}
```

On phones the arrows are hidden (the track is swiped), two cards sit side by
side with the picture on top, and the five platforms share one row.

## 11. Check, preview and push

1. `npx @hekana/sneferu format`
2. `npx @hekana/sneferu validate` prints `✔ theme console@1.0.1 is valid`.
3. `npx @hekana/sneferu dev`, then `?locale=en`, then a window under 640 px.
4. Change `id` in `theme.json` to a slug of your own, then
   `npx @hekana/sneferu push . --package <your-slug> --dev-store`.
