# Tutorial: Esports, a bold gaming top-up store

Esports is a home page for a shop that sells game currency, gift cards and
top-up packs as codes. It is black and deep green with a lime accent and
diagonal cuts: a header with a mark, search and navigation, a slanted hero
band with hooded figures drawn in SVG and an offer box, platform tabs, top-up
cards with a ribbon and a Buy button, three steps and a FAQ. It is
right-to-left in Arabic and left-to-right in English from the same files.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief. Its Arabic is placeholder text, and
its purple ground became black and deep green; the lime accent stayed. The
hero's characters are redrawn as flat SVG silhouettes, and the social icons are
left out. Live: [demo-esports.hekana.com](https://demo-esports.hekana.com) and
[/en](https://demo-esports.hekana.com/en).

What the theme uses: plain HTML, `hk-section`, `hk-stack`, `hk-heading`,
`hk-text`, `hk-button` and `hk-product-card` (wrapped to add a ribbon and a
button), inline SVG for the art, CSS `clip-path` for the cuts, and one
stylesheet. There is no JavaScript.

## Files

```
assets/fonts.css
assets/theme.css
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/esports-faq.sneferu
sections/esports-hero.sneferu
sections/esports-products.sneferu
sections/esports-steps.sneferu
snippets/faq-item.sneferu
snippets/hero-art.sneferu
snippets/icon.sneferu
snippets/mark.sneferu
snippets/step.sneferu
snippets/tc.sneferu
templates/index.sneferu
theme.json
```

Next to the theme: `README.md` and `docs/`, which the CLI skips.

## Data it needs

| What | Used by |
| - | - |
| Products marked featured (or the newest products), with an image; some with a compare-at price | the top-up cards, via `collection('featured')`; a compare-at price turns the ribbon into "Sale" |
| Categories `gift-cards`, `game-currency`, `top-ups` | the tabs and the navigation |

## 1. Start from the starter

```bash
npx @hekana/sneferu init esports
cd esports
```

Delete the starter's sections and `blocks/`.

## 2. Manifest and tokens

```json title="theme.json"
{
  "id": "esports",
  "name": "Esports",
  "version": "1.0.1",
  "author": "Hekana",
  "description": "A bold gaming top-up store: black and deep green, a lime accent, diagonal cuts, a wide hero and top-up cards with ribbons.",
  "category": "gaming",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#C6F25A",
      "secondary": "#0E2A1F",
      "accent": "#C6F25A",
      "background": "#070A09",
      "text": "#F1F5F2",
      "muted": "#93A39A",
      "surface": "#101713",
      "line": "#1D2A23",
      "ribbon": "#F5B83D"
    },
    "layout": { "contentWidth": "1200px" }
  }
}
```

- `accent` is the lime of every button and the active tab. `secondary` is the
  deep green of the hero band. `ribbon` is the warm yellow of the card
  ribbons.

## 3. Fonts, icons and the mark

`assets/fonts.css` loads Cairo (500, 700 and 900) from Google Fonts:

```css title="assets/fonts.css"
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscQyyS4J0.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 500; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscRiyS.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscQyyS4J0.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 700; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscRiyS.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 900; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscQyyS4J0.woff2) format('woff2'); unicode-range: U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1; }
@font-face { font-family: 'Cairo'; font-style: normal; font-weight: 900; font-display: swap; src: url(https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscRiyS.woff2) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
```

```html title="snippets/mark.sneferu"
<svg class="es-mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
  <path d="M3 5h7l6 8 6-8h7l-9.5 11L29 27h-7l-6-8-6 8H3l9.5-11z" fill="currentColor" />
  <path d="M10 5l6 8 6-8" fill="none" stroke="#070A09" stroke-width="1.4" />
</svg>
```

The mark is a plain SVG `X` drawn in `currentColor`. `snippets/icon.sneferu`
is the same icon set as the Console example.

## 4. Layout: header and footer

```html title="layout/theme.sneferu"
<header class="es-header">
  <hk-container>
    <div class="es-bar">
      <details class="es-menu">
        <summary aria-label="{{ t('menu') }}">
          {% render 'icon', name: 'menu' %}
        </summary>
        <nav class="es-menu-panel">
          <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
          <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
          <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
          <a href="{{ t('url_prefix') }}/category/top-ups">{{ t('cat_topups') }}</a>
          <a href="#faq">{{ t('nav_faq') }}</a>
        </nav>
      </details>
      <a class="es-logo" href="{{ t('url_home') }}" aria-label="{{ store.name }}">
        {% render 'mark' %}
        <span>{{ store.name }}</span>
      </a>
      <a class="es-search" href="{{ t('url_search') }}">
        {% render 'icon', name: 'search' %}
        <span>{{ t('search_placeholder') }}</span>
      </a>
      <nav class="es-nav" aria-label="{{ t('nav_label') }}">
        <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
        <a class="is-hot" href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
        <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
        <a href="{{ t('url_prefix') }}/category/top-ups">{{ t('cat_topups') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
      <a
        class="es-icon"
        href="{{ t('url_account') }}"
        aria-label="{{ t('account') }}"
      >{% render 'icon', name: 'user' %}</a>
      <a class="es-icon" href="{{ t('url_cart') }}" aria-label="{{ t('cart') }}">{% render 'icon', name: 'cart' %}</a>
    </div>
  </hk-container>
</header>
<main><hk-slot name="content" /></main>
<footer class="es-footer">
  <hk-container>
    <div class="es-footer-row">
      <div class="es-footer-brand">
        <span class="es-logo">{% render 'mark' %}<span>{{ store.name }}</span></span>
        <p>{{ t('footer_about') }}</p>
      </div>
      <nav class="es-footer-links" aria-label="{{ t('footer_links') }}">
        <a href="{{ t('url_products') }}">{{ t('nav_all') }}</a>
        <a href="{{ t('url_prefix') }}/category/game-currency">{{ t('cat_currency') }}</a>
        <a href="{{ t('url_prefix') }}/category/gift-cards">{{ t('cat_gift_cards') }}</a>
        <a href="#faq">{{ t('nav_faq') }}</a>
      </nav>
    </div>
    <p class="es-copy">© {{ store.name }}</p>
  </hk-container>
</footer>
```

```css title="assets/theme.css (root and header)"
/* Esports: black and deep green, lime accent, diagonal cuts. */
[data-hk-theme='esports'] {
  --es-lime: var(--hk-color-accent);
  --es-cut: 28px;
  font-family: 'Cairo', system-ui, sans-serif;
  line-height: 1.6;
  background: radial-gradient(1000px 500px at 50% 0, rgba(31, 122, 85, 0.16), transparent 70%), var(--hk-color-background);
}
:where([data-hk-theme='esports'] a) { color: inherit; text-decoration: none; }
:where([data-hk-theme='esports'] h1, [data-hk-theme='esports'] h2, [data-hk-theme='esports'] p) { margin: 0; }
.ic { width: 22px; height: 22px; flex: none; }
.es-h2 { font-weight: 900; }

/* Header */
.es-header { border-bottom: 1px solid var(--hk-color-line); background: rgba(7, 10, 9, 0.9); }
.es-bar { display: flex; align-items: center; gap: 20px; min-height: 76px; }
.es-logo { display: inline-flex; align-items: center; gap: 10px; color: var(--es-lime); font-weight: 900; font-size: 18px; }
.es-logo span { color: var(--hk-color-text); }
.es-mark { width: 38px; height: 38px; }
.es-search { display: flex; align-items: center; gap: 10px; flex: 0 1 300px; min-height: 44px; padding-inline: 14px; border-radius: 10px; border: 1px solid #2A3A31; background: #0D1411; color: var(--hk-color-muted); font-size: 14px; }
.es-search .ic { width: 18px; height: 18px; }
.es-search:hover { border-color: var(--es-lime); }
.es-nav { display: flex; gap: 26px; margin-inline-start: auto; font-weight: 700; font-size: 15px; }
.es-nav a { display: inline-flex; align-items: center; min-height: 44px; }
.es-nav a.is-hot, .es-nav a:hover { color: var(--es-lime); }
.es-icon { display: none; align-items: center; justify-content: center; width: 44px; height: 44px; }
.es-icon:last-child { display: inline-flex; }
.es-menu { position: relative; display: none; }
.es-menu summary { list-style: none; display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; cursor: pointer; }
.es-menu summary::-webkit-details-marker { display: none; }
.es-menu-panel { position: absolute; z-index: 20; top: 52px; inset-inline-start: 0; min-width: 220px; display: grid; padding: 8px; border-radius: 12px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); }
.es-menu-panel a { display: flex; align-items: center; min-height: 44px; padding-inline: 12px; border-radius: 8px; font-weight: 700; }
.es-menu-panel a:hover { background: rgba(198, 242, 90, 0.08); color: var(--es-lime); }
```

- The account and cart icons are both in the markup; CSS shows the cart on
  desktop and the account icon on phones, as in the two mockup frames.
- `.es-nav a.is-hot` is the one highlighted link, in lime.

## 5. Hero: a slanted band and SVG art

```html title="sections/esports-hero.sneferu"
<hk-section padding-y="24" mobile-padding-y="12" class="es-hero-wrap">
  <div class="es-hero">
    <div class="es-hero-copy">
      <hk-heading
        text="{{ section.settings.title | default: t('hero_title') }}"
        level="h1"
        size="56"
        tablet-size="44"
        mobile-size="28"
        class="es-hero-title"
      />
      <hk-text
        text="{{ section.settings.subtitle | default: t('hero_subtitle') }}"
        size="20"
        mobile-size="14"
        class="es-hero-sub"
      />
      <hk-button
        label="{{ section.settings.button | default: t('hero_button') }}"
        href="{{ t('url_products') }}"
        class="es-cta"
      />
    </div>
    <div class="es-hero-art">
      {% render 'hero-art' %}
    </div>
    {% if section.settings.show_offer %}
      <div class="es-offer">
        <span class="es-offer-top">{{ t('offer_top') }}</span>
        <strong class="es-offer-num">{{ section.settings.offer_percent }}%</strong>
        <span class="es-offer-bottom">{{ t('offer_bottom') }}</span>
      </div>
    {% endif %}
  </div>
</hk-section>
<hk-schema>
  {
    "name": "Esports hero",
    "version": 1,
    "settings": {
      "title": {
        "type": "text",
        "label": "Title (empty = theme text)",
        "default": "",
        "maxLength": 40
      },
      "subtitle": {
        "type": "text",
        "label": "Subtitle (empty = theme text)",
        "default": "",
        "maxLength": 80
      },
      "button": {
        "type": "text",
        "label": "Button (empty = theme text)",
        "default": "",
        "maxLength": 24
      },
      "show_offer": {
        "type": "boolean",
        "label": "Show the offer box",
        "default": true
      },
      "offer_percent": {
        "type": "number",
        "label": "Offer percent",
        "default": 20,
        "min": 1,
        "max": 90
      }
    }
  }
</hk-schema>
```

```html title="snippets/hero-art.sneferu"
<svg class="es-art" viewBox="0 0 520 340" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs>
    <linearGradient id="es-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C6F25A" />
      <stop offset="1" stop-color="#2DD4A3" />
    </linearGradient>
    <radialGradient id="es-glow" cx="0.5" cy="0.55" r="0.5">
      <stop offset="0" stop-color="#1F7A55" stop-opacity="0.55" />
      <stop offset="1" stop-color="#1F7A55" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="es-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1A2A22" />
      <stop offset="1" stop-color="#0A110D" />
    </linearGradient>
  </defs>
  <ellipse cx="260" cy="200" rx="250" ry="160" fill="url(#es-glow)" />
  <polygon points="40,340 92,250 104,340" fill="#C6F25A" opacity="0.9" />
  <polygon points="446,340 498,214 512,214 462,340" fill="#C6F25A" opacity="0.85" />
  <polygon points="380,120 404,40 418,40 394,120" fill="#C6F25A" opacity="0.7" />
  <g class="es-fig es-fig-left">
    <path d="M70 340 L84 238 Q96 196 132 186 Q168 196 180 238 L196 340 Z" fill="url(#es-body)" />
    <path d="M100 236 Q104 200 132 194 Q160 200 164 236 Q148 250 132 252 Q116 250 100 236 Z" fill="#050806" />
    <path d="M84 238 Q96 196 132 186" fill="none" stroke="url(#es-rim)" stroke-width="2" opacity="0.8" />
  </g>
  <g class="es-fig es-fig-right">
    <path d="M330 340 L346 252 Q358 214 392 206 Q426 214 438 252 L452 340 Z" fill="url(#es-body)" />
    <path
      d="M364 248 L378 224 L406 224 L420 248 L404 266 L380 266 Z"
      fill="#0B1310"
      stroke="#2DD4A3"
      stroke-width="1.6"
    />
    <path d="M378 244 h28" stroke="#C6F25A" stroke-width="3" stroke-linecap="round" />
    <path d="M438 252 Q426 214 392 206" fill="none" stroke="#2DD4A3" stroke-width="2" opacity="0.9" />
  </g>
  <g class="es-fig es-fig-main">
    <path d="M150 340 L178 200 Q196 86 262 56 Q328 86 346 200 L374 340 Z" fill="url(#es-body)" />
    <path d="M206 186 Q210 112 262 92 Q314 112 318 186 Q296 214 262 218 Q228 214 206 186 Z" fill="#030504" />
    <path d="M178 200 Q196 86 262 56 Q328 86 346 200" fill="none" stroke="url(#es-rim)" stroke-width="2.4" />
    <path d="M232 260 L262 300 L292 260" fill="none" stroke="#C6F25A" stroke-width="2" opacity="0.6" />
  </g>
</svg>
```

```css title="assets/theme.css (hero)"
/* Hero: a slanted band, copy on the start side, art and offer box on the end side */
.es-hero { position: relative; display: grid; grid-template-columns: 1fr 1.15fr; align-items: center; min-height: 400px; overflow: hidden; border-radius: 16px; isolation: isolate; }
.es-hero::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(105deg, #135C3F 0%, #0E3A29 38%, #0A1712 70%, #070A09 100%); clip-path: polygon(0 0, 66% 0, 54% 100%, 0 100%); }
[dir='rtl'] .es-hero::before { background: linear-gradient(255deg, #135C3F 0%, #0E3A29 38%, #0A1712 70%, #070A09 100%); clip-path: polygon(100% 0, 34% 0, 46% 100%, 100% 100%); }
.es-hero::after { content: ''; position: absolute; inset: 0; z-index: -2; background: #0A100D; }
.es-hero-copy { display: grid; gap: 18px; justify-items: start; padding: 48px 64px; }
.es-hero-title { font-weight: 900; line-height: 1.15; }
.es-hero-sub { color: #DDE7E0; font-weight: 700; }
.sn-btn.es-cta { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding-inline: 34px; margin-top: 8px; border: 0; border-radius: 999px; background: var(--es-lime); color: #0A120C; font-weight: 900; font-size: 18px; text-decoration: none; }
.sn-btn.es-cta:hover { filter: brightness(1.06); }
.es-hero-art { align-self: end; height: 100%; display: flex; align-items: flex-end; justify-content: center; }
.es-art { width: 100%; max-width: 640px; height: auto; display: block; }
.es-offer { position: absolute; top: 24px; inset-inline-end: 24px; display: grid; justify-items: center; gap: 0; padding: 16px 24px; border-radius: 12px; background: rgba(13, 22, 18, 0.88); border: 1px solid #22332A; text-align: center; }
.es-offer-top, .es-offer-bottom { font-size: 12px; color: var(--hk-color-muted); font-weight: 700; }
.es-offer-num { font-size: 40px; font-weight: 900; line-height: 1.2; color: var(--hk-color-text); }
```

- The band is a `::before` layer cut with `clip-path: polygon(…)`. The
  polygon and the gradient are mirrored for `[dir='rtl']`, so the green side
  is always behind the text.
- The figures are three paths each, filled with a dark gradient and edged with
  a lime-to-teal "rim light" stroke; the lime slashes are polygons.
- The offer box is shown only when `show_offer` is on, and its number is the
  `offer_percent` setting. The words around it come from the locale files.

## 6. Tabs and top-up cards

```html title="sections/esports-products.sneferu"
<hk-section padding-y="24" mobile-padding-y="16" class="es-products">
  <nav class="es-tabs" aria-label="{{ t('platforms') }}">
    <a class="es-tab is-active" href="{{ t('url_products') }}">{{ t('tab_1') }}</a>
    <a class="es-tab" href="{{ t('url_prefix') }}/category/gift-cards">{{ t('tab_2') }}</a>
    <a class="es-tab" href="{{ t('url_prefix') }}/category/top-ups">{{ t('tab_3') }}</a>
  </nav>
  {% if collection('featured').products %}
    <div class="es-grid">
      {% for p in collection('featured').products limit: 10 %}
        {% render 'tc', p: p %}
      {% endfor %}
    </div>
  {% else %}
    <p class="es-empty">{{ t('empty_products') }}</p>
  {% endif %}
</hk-section>
<hk-schema>
  {
    "name": "Top-up cards",
    "version": 1,
    "settings": {}
  }
</hk-schema>
```

```html title="snippets/tc.sneferu"
<div class="es-card">
  <span
    class="es-ribbon"
  >{% if p.compare_at > p.price %}{{ t('ribbon_sale') }}{% else %}{{ t('ribbon_pick') }}{% endif %}</span>
  <hk-product-card product="{{ p }}" class="es-pc" />
  <a class="es-buy" href="{{ p.url }}">{{ t('buy') }}</a>
</div>
```

```css title="assets/theme.css (tabs and cards)"
/* Platform tabs */
.es-tabs { display: flex; justify-content: center; gap: 10px; margin-bottom: 28px; }
.es-tab { display: inline-flex; align-items: center; justify-content: center; min-width: 120px; min-height: 46px; padding-inline: 24px; border-radius: 8px; background: #121A16; border: 1px solid #1F2C25; font-weight: 800; font-size: 14px; }
.es-tab:hover { border-color: var(--es-lime); }
.es-tab.is-active { background: var(--es-lime); border-color: var(--es-lime); color: #0A120C; }

/* Top-up cards */
.es-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.es-card { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 26px 12px 12px; border-radius: 10px; background: linear-gradient(180deg, #121B16, #0D1310); border: 1px solid var(--hk-color-line); }
.es-card:hover { border-color: rgba(198, 242, 90, 0.5); }
.es-ribbon { position: absolute; top: 8px; inset-inline-start: -6px; z-index: 1; padding: 2px 14px 2px 10px; font-size: 12px; font-weight: 900; color: #1A1305; background: var(--hk-color-ribbon); clip-path: polygon(0 0, 100% 0, 88% 50%, 100% 100%, 0 100%); }
[dir='rtl'] .es-ribbon { padding: 2px 10px 2px 14px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 12% 50%); }
.es-pc.sn-product-card { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.es-pc img { width: 78%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; }
.es-pc .sn-title { font-size: 14px; font-weight: 700; line-height: 1.4; color: #DDE7E0; }
.es-pc .sn-price { font-size: 20px; font-weight: 900; }
.es-pc .sn-was { display: block; font-size: 12px; font-weight: 600; color: var(--hk-color-muted); }
.es-buy { margin-top: auto; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 6px; background: var(--es-lime); color: #0A120C; font-weight: 900; }
.es-buy:hover { filter: brightness(1.06); }
.es-empty { color: var(--hk-color-muted); text-align: center; }
```

- `hk-product-card` has no slot for a badge or a button, so the snippet wraps
  it in a `div` with a ribbon before it and a Buy link after it.
- The ribbon says "Sale" when `p.compare_at > p.price`, otherwise "Pick".
- The loop has `limit: 10`: a `for` limit is fixed text, not a setting.
- The ribbon notch is a `clip-path`, mirrored for right-to-left.

## 7. Steps and FAQ

```html title="sections/esports-steps.sneferu"
<hk-section padding-y="48" mobile-padding-y="32" class="es-steps">
  <hk-stack gap="24">
    <hk-heading
      text="{{ section.settings.heading | default: t('steps_heading') }}"
      level="h2"
      size="32"
      mobile-size="22"
      class="es-h2"
    />
    <ol class="es-step-list">
      {% render 'step', n: '01', icon: 'pay', title: t('step_1_title'), text: t('step_1_text') %}
      {% render 'step', n: '02', icon: 'mail', title: t('step_2_title'), text: t('step_2_text') %}
      {% render 'step', n: '03', icon: 'gamepad', title: t('step_3_title'), text: t('step_3_text') %}
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
<li class="es-step">
  <span class="es-step-icon">{% render 'icon', name: icon %}</span>
  <span class="es-step-n">{{ n }}</span>
  <strong class="es-step-title">{{ title }}</strong>
  <span class="es-step-text">{{ text }}</span>
</li>
```

```html title="sections/esports-faq.sneferu"
<hk-section padding-y="48" mobile-padding-y="32" class="es-faq">
  <div id="faq" class="es-faq-wrap">
    <hk-heading
      text="{{ section.settings.heading | default: t('faq_heading') }}"
      level="h2"
      size="28"
      mobile-size="20"
      class="es-h2"
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
  <details class="es-faq-item">
    <summary>
      {{ q }}{% render 'icon', name: 'chevron' %}
    </summary>
    <p>{{ a }}</p>
  </details>
{% endif %}
```

```css title="assets/theme.css (steps, FAQ, footer)"
/* Steps */
.es-step-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.es-step { position: relative; display: grid; gap: 6px; padding: 24px; background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); clip-path: polygon(0 0, calc(100% - var(--es-cut)) 0, 100% var(--es-cut), 100% 100%, 0 100%); }
.es-step-icon { display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 8px; background: rgba(198, 242, 90, 0.1); color: var(--es-lime); }
.es-step-n { position: absolute; top: 16px; inset-inline-end: 36px; font-size: 32px; font-weight: 900; color: rgba(198, 242, 90, 0.18); }
.es-step-title { font-size: 18px; font-weight: 900; }
.es-step-text { color: var(--hk-color-muted); font-size: 15px; }

/* FAQ */
.es-faq-wrap { max-width: 860px; margin-inline: auto; display: grid; gap: 10px; scroll-margin-top: 24px; }
.es-faq-wrap > h2 { margin-bottom: 8px; }
.es-faq-item { background: var(--hk-color-surface); border: 1px solid var(--hk-color-line); border-radius: 8px; }
.es-faq-item[open] { border-color: rgba(198, 242, 90, 0.4); }
.es-faq-item summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 52px; padding: 12px 18px; cursor: pointer; font-weight: 800; }
.es-faq-item summary::-webkit-details-marker { display: none; }
.es-faq-item summary .ic { width: 18px; height: 18px; color: var(--es-lime); transform: rotate(90deg); transition: transform 0.15s; }
.es-faq-item[open] summary .ic { transform: rotate(-90deg); }
.es-faq-item p { padding: 0 18px 16px; color: var(--hk-color-muted); }

/* Footer */
.es-footer { margin-top: 24px; padding-block: 36px 24px; border-top: 1px solid var(--hk-color-line); }
.es-footer-row { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.es-footer-brand { display: grid; gap: 10px; max-width: 420px; }
.es-footer-brand p { color: var(--hk-color-muted); font-size: 14px; }
.es-footer-links { display: flex; flex-wrap: wrap; gap: 4px 22px; }
.es-footer-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; font-weight: 700; color: var(--hk-color-muted); }
.es-footer-links a:hover { color: var(--es-lime); }
.es-copy { margin-top: 16px; font-size: 13px; color: var(--hk-color-muted); }

@media (max-width: 1023px) {
  .es-nav { display: none; }
  .es-search { flex: 1; margin-inline-start: auto; }
  .es-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .es-hero-copy { padding: 32px; }
}
@media (max-width: 639px) {
  .es-bar { gap: 8px; min-height: 64px; }
  .es-menu { display: block; }
  .es-logo span { display: none; }
  .es-mark { width: 30px; height: 30px; }
  .es-search { min-height: 40px; font-size: 13px; padding-inline: 10px; }
  .es-icon:last-child { display: none; }
  .es-icon:nth-last-child(2) { display: inline-flex; }
  .es-hero { min-height: 230px; grid-template-columns: 1.15fr 1fr; border-radius: 12px; }
  .es-hero-copy { padding: 22px 14px; gap: 8px; }
  .sn-btn.es-cta { min-height: 40px; padding-inline: 18px; font-size: 14px; }
  .es-offer { top: 10px; inset-inline-end: 10px; padding: 6px 10px; }
  .es-offer-num { font-size: 20px; }
  .es-offer-top, .es-offer-bottom { font-size: 10px; }
  .es-tabs { gap: 8px; }
  .es-tab { flex: 1; min-width: 0; padding-inline: 8px; }
  .es-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .es-step-list { grid-template-columns: 1fr; }
}
```

The step cards have one corner cut off with `clip-path`, the same diagonal as
the hero.

## 8. Locale files

```json title="locales/en.json"
{
  "url_prefix": "/en",
  "url_home": "/en",
  "url_products": "/en/products",
  "url_search": "/en/search",
  "url_cart": "/en/cart",
  "menu": "Menu",
  "cart": "Cart",
  "nav_all": "All products",
  "nav_faq": "Questions",
  "platforms": "Platforms",
  "egp": "EGP",
  "cat_gift_cards": "Gift cards",
  "cat_currency": "In-game currency",
  "cat_topups": "Top-up packs",
  "steps_heading": "How you get your code",
  "step_1_title": "Pick and pay online",
  "step_1_text": "Choose the card and the amount, then pay online.",
  "step_2_title": "The code arrives by email",
  "step_2_text": "Once payment is confirmed, the code is sent automatically.",
  "step_3_title": "Redeem it",
  "step_3_text": "Enter the code on the platform or in the game.",
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
  "faq_5_q": "Which currency are prices in?",
  "faq_5_a": "All prices are in Egyptian pounds (EGP).",
  "footer_about": "Gift cards and game top-ups in Egyptian pounds. Your code arrives by email after online payment.",
  "footer_links": "Store links",
  "url_account": "/en/account",
  "account": "My account",
  "nav_label": "Store sections",
  "search_placeholder": "Search for a game or pack",
  "hero_title": "Top up now",
  "hero_subtitle": "Discounts on selected packs for your games",
  "hero_button": "Top up now",
  "offer_top": "Up to",
  "offer_bottom": "off selected packs",
  "tab_1": "All",
  "tab_2": "Console",
  "tab_3": "Mobile",
  "ribbon_sale": "Sale",
  "ribbon_pick": "Pick",
  "buy": "Buy"
}
```

`locales/ar.json` has the same keys, with the words in Egyptian Arabic,
`url_prefix` empty and the paths without `/en`.

## 9. The page and the phone layout

```html title="templates/index.sneferu"
<hk-sections />
<hk-schema>
  {
    "sections": [
      {
        "type": "esports-hero"
      },
      {
        "type": "esports-products"
      },
      {
        "type": "esports-steps"
      },
      {
        "type": "esports-faq"
      }
    ]
  }
</hk-schema>
```

```css title="assets/theme.css (tablet and phone)"
@media (max-width: 1023px) {
  .es-nav { display: none; }
  .es-search { flex: 1; margin-inline-start: auto; }
  .es-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .es-hero-copy { padding: 32px; }
}
@media (max-width: 639px) {
  .es-bar { gap: 8px; min-height: 64px; }
  .es-menu { display: block; }
  .es-logo span { display: none; }
  .es-mark { width: 30px; height: 30px; }
  .es-search { min-height: 40px; font-size: 13px; padding-inline: 10px; }
  .es-icon:last-child { display: none; }
  .es-icon:nth-last-child(2) { display: inline-flex; }
  .es-hero { min-height: 230px; grid-template-columns: 1.15fr 1fr; border-radius: 12px; }
  .es-hero-copy { padding: 22px 14px; gap: 8px; }
  .sn-btn.es-cta { min-height: 40px; padding-inline: 18px; font-size: 14px; }
  .es-offer { top: 10px; inset-inline-end: 10px; padding: 6px 10px; }
  .es-offer-num { font-size: 20px; }
  .es-offer-top, .es-offer-bottom { font-size: 10px; }
  .es-tabs { gap: 8px; }
  .es-tab { flex: 1; min-width: 0; padding-inline: 8px; }
  .es-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .es-step-list { grid-template-columns: 1fr; }
}
```

## 10. Check, preview and push

1. `npx @hekana/sneferu format`
2. `npx @hekana/sneferu validate` prints `✔ theme esports@1.0.1 is valid`.
3. `npx @hekana/sneferu dev`, then `?locale=en`, then a window under 640 px.
4. Change `id` in `theme.json` to a slug of your own, then
   `npx @hekana/sneferu push . --package <your-slug> --dev-store`.
