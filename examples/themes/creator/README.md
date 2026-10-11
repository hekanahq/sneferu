# Tutorial: Creator, an editorial store for one creator

Creator is a home page for one person selling online courses, e-books and
templates. Warm paper background, black type, one orange accent. Large cover
cards scroll sideways two at a time on a computer and stack on a phone; each
cover carries an "Instant access" badge and a label for its kind. Below: a
"what you get" checklist and an author strip with a photo and a button.

| Mockup | Live, Arabic | Live, English |
| - | - | - |
| ![Mockup](docs/mockup-desktop.webp) | ![Live, Arabic](docs/live-desktop-ar.webp) | ![Live, English](docs/live-desktop-en.webp) |
| ![Mockup, phone](docs/mockup-phone.webp) | ![Live, Arabic, phone](docs/live-phone-ar.webp) | ![Live, English, phone](docs/live-phone-en.webp) |

The mockup was generated as a design brief; its Arabic is placeholder text and
its prices were in dollars. Live:
[demo-creator.hekana.com](https://demo-creator.hekana.com) and
[/en](https://demo-creator.hekana.com/en).

What the theme uses: `hk-product-card` inside a positioned wrapper (for the
badge), a CSS scroll-snap row for the carousel (no script), `{% render %}`
with arguments, blocks with a locale fallback, an `image` setting, and
`hk-button`.

## Files

```
theme.json
assets/fonts.css
assets/theme.css
blocks/get-item.sneferu
layout/theme.sneferu
locales/ar.json
locales/en.json
sections/author.sneferu
sections/covers.sneferu
sections/what-you-get.sneferu
snippets/cover.sneferu
snippets/get-item.sneferu
templates/index.sneferu
```

Next to the theme: `README.md` and `docs/` (this tutorial and its pictures),
and `.sneferu-dev/data.json` (sample data for `dev`). The CLI skips all three:
they are never checked and never pushed.

## Data it needs

| Handle | Label on the cover |
| - | - |
| `courses` | Online course |
| `ebooks` | E-book |
| `templates` | Templates |

A product has no "type" field a theme can read, so the kind label comes from
the collection the product is listed under.

## 1. Manifest and tokens

```json title="theme.json"
{
  "id": "creator",
  "name": "Creator",
  "version": "1.0.0",
  "author": "Hekana",
  "description": "An editorial theme for one creator selling courses, e-books and templates",
  "category": "digital",
  "engine": "hk2",
  "engineCompatibility": "^2.0.0",
  "defaultLocale": "ar",
  "locales": ["ar", "en"],
  "settings": {},
  "tokens": {
    "colors": {
      "primary": "#151515",
      "secondary": "#0F1A24",
      "accent": "#E2622E",
      "background": "#F3F0EA",
      "text": "#151515",
      "muted": "#716B64",
      "line": "#CFC8BE"
    },
    "layout": { "contentWidth": "1040px" }
  }
}
```

`line` and `muted` are extra colour keys; the stylesheet reads them as
`var(--hk-color-line)` and `var(--hk-color-muted)`.

## 2. Layout

```html title="layout/theme.sneferu"
<div class="cr">
  <header class="cr-header">
    <div class="cr-wrap cr-header-row">
      <nav class="cr-nav" aria-label="{{ t('nav_label') }}">
        <a class="cr-brand" href="{{ store.url }}">{{ store.name }}</a>
        <a class="cr-link" href="#shop">{{ t('nav_shop') }}</a>
        <a class="cr-link" href="#what">{{ t('nav_what') }}</a>
        <a class="cr-link" href="#about">{{ t('nav_about') }}</a>
      </nav>
      <details class="cr-menu">
        <summary class="cr-menu-button" aria-label="{{ t('menu') }}">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </summary>
        <div class="cr-menu-panel">
          <a href="#shop">{{ t('nav_shop') }}</a>
          <a href="#what">{{ t('nav_what') }}</a>
          <a href="#about">{{ t('nav_about') }}</a>
          <a href="{{ t('href_products') }}">{{ t('all_products') }}</a>
          <a href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
        </div>
      </details>
    </div>
  </header>
  <main><hk-slot name="content" /></main>
  <footer class="cr-footer">
    <div class="cr-wrap cr-footer-row">
      <p class="cr-footer-name">{{ store.name }}</p>
      <p class="cr-footer-note">{{ t('footer_note') }}</p>
      <a class="cr-footer-locale" href="{{ t('href_other_locale') }}">{{ t('other_locale') }}</a>
    </div>
  </footer>
</div>
```

The menu button is a `<details>`/`<summary>` pair, so it opens without script.
On phones the stylesheet hides all but the store name and the first link.

## 3. The covers row

```html title="sections/covers.sneferu"
<section class="cr-covers" id="shop">
  <div class="cr-wrap">
    <h2 class="cr-hidden">{{ t('shop_heading') }}</h2>
    <div class="cr-track">
      {% for p in collection('courses').products limit: 6 %}
        {% render 'cover', p: p, kind: t('kind_course'), slot: 'course' %}
      {% endfor %}
      {% for p in collection('ebooks').products limit: 6 %}
        {% render 'cover', p: p, kind: t('kind_ebook'), slot: 'ebook' %}
      {% endfor %}
      {% for p in collection('templates').products limit: 6 %}
        {% render 'cover', p: p, kind: t('kind_template'), slot: 'template' %}
      {% endfor %}
    </div>
    <nav class="cr-dots" aria-label="{{ t('shop_heading') }}">
      {% for p in collection('courses').products limit: 6 %}
        <a href="#course-{{ forloop.index }}" aria-label="{{ p.title }}"></a>
      {% endfor %}
      {% for p in collection('ebooks').products limit: 6 %}
        <a href="#ebook-{{ forloop.index }}" aria-label="{{ p.title }}"></a>
      {% endfor %}
      {% for p in collection('templates').products limit: 6 %}
        <a href="#template-{{ forloop.index }}" aria-label="{{ p.title }}"></a>
      {% endfor %}
    </nav>
  </div>
</section>
<hk-schema>
  {
    "name": "Covers",
    "version": 1,
    "settings": {
      "badge": {
        "type": "text",
        "label": "Badge on every cover (empty: the theme's own words)",
        "default": "",
        "maxLength": 30
      }
    }
  }
</hk-schema>
```

Three loops, one per collection, feed one row. Each passes the product, the
label for its kind and a short `slot` name to the `cover` snippet:

```html title="snippets/cover.sneferu"
<article class="cr-cover" id="{{ slot }}-{{ forloop.index }}">
  <hk-product-card product="{{ p }}" class="cr-card" />
  <span class="cr-flag">{{ section.settings.badge | default: t('instant_access') }}</span>
  <span class="cr-kind">{{ kind }}</span>
</article>
```

- `{{ slot }}-{{ forloop.index }}` gives every cover an id (`course-1`,
  `ebook-2`, …). The dots under the row are links to those ids, so a click
  scrolls the row to that cover.
- `forloop` inside a snippet is the loop of the caller: a snippet sees its
  arguments plus the caller's scope.
- The badge reads the section setting `badge` and falls back to the locale
  text: `{{ section.settings.badge | default: t('instant_access') }}`.
- The badge and the label are siblings of `hk-product-card`, placed over the
  image by CSS. The card renders `a > img + .sn-title + .sn-price` and has no
  slot of its own.

The row is CSS grid with `grid-auto-flow: column`: every cover is half the row
wide, the row scrolls sideways and snaps to each cover. On phones it becomes a
normal one-column grid, and the dots are hidden. One dot per product is
rendered and every second one is hidden, which leaves one dot per pair:

```css title="assets/theme.css (excerpt)"
/* Covers: two per view on wide screens, scroll-snapped; one per row on phones */
.cr-covers { padding-block: 36px 8px; }
.cr-track {
  display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 36px) / 2); gap: 36px;
  overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: 4px;
}
.cr-track::-webkit-scrollbar { display: none; }
.cr-cover { position: relative; scroll-snap-align: start; scroll-margin-top: 24px; }
.cr-card { display: flex; flex-direction: column; text-decoration: none; color: inherit; }
.cr-card img {
  width: 100%; aspect-ratio: 2.08 / 1; object-fit: cover; display: block;
  border-radius: 12px; background: var(--hk-color-secondary);
}
.cr-card .sn-title { margin-top: 18px; font-size: 25px; font-weight: 700; line-height: 1.35; }
.cr-card .sn-price { margin-top: 6px; font-size: 18px; font-weight: 700; }
.cr-card .sn-was { font-weight: 400; color: var(--hk-color-muted); }
.cr-card:hover .sn-title { color: var(--hk-color-accent); }
.cr-flag {
  position: absolute; top: 12px; inset-inline-start: 14px;
  background: var(--hk-color-accent); color: #FFFFFF;
  font-size: 12.5px; font-weight: 600; line-height: 1; padding: 8px 14px; border-radius: 999px;
}
.cr-kind {
  position: absolute; top: 18px; inset-inline-end: 18px;
  color: #FFFFFF; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; opacity: .9;
}
.cr-dots { display: flex; justify-content: center; gap: 10px; margin-top: 28px; }
.cr-dots a { width: 9px; height: 9px; border-radius: 50%; background: var(--hk-color-line); }
.cr-dots a:first-child { background: var(--hk-color-text); }
.cr-dots a:nth-child(even) { display: none; }
```

## 4. What you get

```html title="sections/what-you-get.sneferu"
<section class="cr-what" id="what">
  <div class="cr-wrap">
    <h2 class="cr-h2">{{ section.settings.heading | default: t('what_heading') }}</h2>
    <div class="cr-list">
      {% if section.blocks %}
        {% for block in section.blocks %}
          <hk-block of="{{ block }}" />
        {% endfor %}
      {% else %}
        {% render 'get-item', term: t('get_1_term'), text: t('get_1_text') %}
        {% render 'get-item', term: t('get_2_term'), text: t('get_2_text') %}
        {% render 'get-item', term: t('get_3_term'), text: t('get_3_text') %}
        {% render 'get-item', term: t('get_4_term'), text: t('get_4_text') %}
      {% endif %}
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "What you get",
    "version": 1,
    "settings": {
      "heading": {
        "type": "text",
        "label": "Heading (empty: the theme's own words)",
        "default": "",
        "maxLength": 80
      }
    },
    "blocks": {
      "allowed": ["get-item"],
      "max": 8
    }
  }
</hk-schema>
```

```html title="blocks/get-item.sneferu"
{% render 'get-item', term: block.settings.term, text: block.settings.text %}
<hk-schema>
  {
    "name": "What you get: item",
    "version": 1,
    "settings": {
      "term": {
        "type": "text",
        "label": "Item",
        "default": "Lessons",
        "maxLength": 40
      },
      "text": {
        "type": "text",
        "label": "Detail",
        "default": "Recorded videos you keep",
        "maxLength": 120
      }
    }
  }
</hk-schema>
```

```html title="snippets/get-item.sneferu"
<p class="cr-item">
  <span class="cr-tick" aria-hidden="true"></span>
  <strong>{{ term }}</strong>
  <span class="cr-dash" aria-hidden="true">-</span>
  <span>{{ text }}</span>
</p>
```

The merchant can add up to eight items as blocks. Template default sections
cannot carry blocks, so a new store has none; in that case the section renders
four items from the locale files, in the page's language. Both paths draw the
same `get-item` snippet.

## 5. The author strip

```html title="sections/author.sneferu"
<section class="cr-author" id="about">
  <div class="cr-wrap">
    <div class="cr-author-row">
      <div class="cr-person">
        {% if section.settings.photo %}
          <img class="cr-avatar" src="{{ section.settings.photo }}" alt="" width="56" height="56" loading="lazy" />
        {% endif %}
        <div>
          <p class="cr-name">{{ section.settings.name | default: t('author_name') }}</p>
          <p class="cr-role">{{ section.settings.role | default: t('author_role') }}</p>
        </div>
      </div>
      <hk-button
        label="{{ section.settings.button | default: t('author_cta') }}"
        href="{{ section.settings.link | default: t('href_products') }}"
        class="cr-cta"
      />
    </div>
  </div>
</section>
<hk-schema>
  {
    "name": "Author",
    "version": 1,
    "settings": {
      "photo": {
        "type": "image",
        "label": "Photo",
        "default": "https://api.hekana.com/api/v1/uploads/file/demo/digital-themes/v1/author.webp"
      },
      "name": {
        "type": "text",
        "label": "Name (empty: the theme's own words)",
        "default": "",
        "maxLength": 60
      },
      "role": {
        "type": "text",
        "label": "One line about you",
        "default": "",
        "maxLength": 100
      },
      "button": {
        "type": "text",
        "label": "Button",
        "default": "",
        "maxLength": 30
      },
      "link": {
        "type": "link",
        "label": "Button link",
        "default": ""
      }
    }
  }
</hk-schema>
```

- `photo` is an `image` setting whose default is an `https://` URL. The theme
  does not bundle the photo: `asset_url()` is empty on the live storefront in
  this release.
- `{% if section.settings.photo %}` drops the image when the merchant clears it.
- `hk-button` is styled through the class passed to it (`cr-cta`).

## 6. Words

```json title="locales/en.json (excerpt)"
{
  "nav_label": "Main menu",
  "nav_shop": "Products",
  "nav_what": "What you get",
  "nav_about": "About me",
  "menu": "Menu",
  "all_products": "All products",
  "href_products": "/en/products",
  "href_other_locale": "/",
  "other_locale": "العربية",
  "shop_heading": "Courses, e-books and templates",
  "instant_access": "Instant access",
  "kind_course": "Online course",
  "kind_ebook": "E-book",
  "kind_template": "Templates",
```

The Arabic file has the same keys in Egyptian Arabic.
## Reproduce it

```bash
npx @hekana/sneferu init creator          # start from the starter theme
cd creator
# replace the starter files with the ones above, then:
npx @hekana/sneferu format              # indent .sneferu, theme.json and locales
npx @hekana/sneferu validate            # must print: theme creator@1.0.0 is valid
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
slug of your own; `creator` here is the slug Hekana uses for its own copy. Bump
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
