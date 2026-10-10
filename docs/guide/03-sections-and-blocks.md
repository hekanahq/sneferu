# 3. Sections and blocks

A **section** is a page part a merchant adds, removes, reorders and configures:
a hero, a product grid, testimonials. A **block** is an item inside a section
that the merchant can add several of: one testimonial, one slide. Both are a
template plus a `<hk-schema>` that declares their settings.

## A section

`sections/hero.sneferu`:

```html
<hk-section background="theme:secondary" padding-y="96" mobile-padding-y="48">
  <hk-stack gap="16" align="start">
    <hk-heading text="{{ section.settings.title }}" level="h1" size="56" mobile-size="32" color="#FFFFFF" />
    <hk-text text="{{ section.settings.subtitle }}" size="20" color="#E5E7EB" />
    <hk-button label="{{ t('shop_now') }}" href="/products" />
  </hk-stack>
</hk-section>
<hk-schema>{
  "name": { "ar": "واجهة", "en": "Hero" },
  "version": 1,
  "settings": {
    "title":    { "type": "text",     "label": { "ar": "العنوان", "en": "Title" }, "default": "Hello", "maxLength": 80 },
    "subtitle": { "type": "textarea", "label": { "ar": "الوصف", "en": "Subtitle" }, "default": "", "maxLength": 200 }
  }
}</hk-schema>
```

- The file name is the section type: `hero`.
- `<hk-schema>` is JSON (double quotes, no trailing commas; SN1107). Put it at the
  end of the file.
- `name` needs both `ar` and `en` (SN3030). It is what merchants see in the builder.
- `version` is the schema version (a number, default 1).
- `settings` is an object of fields. Read them as `section.settings.<key>`.
- Inside a section you also have `section.id`, `section.type` and `section.blocks`.

## Field types

Every field is:

```json
{ "type": "…", "label": { "ar": "…", "en": "…" }, "default": …, "min": …, "max": …, "step": …,
  "options": […], "maxLength": …, "required": …, "responsive": …, "visible_if": { "setting": "…", "equals": … } }
```

Only `type` and `label` are needed. One example of each type:

| Type | Value in templates | Example field |
|---|---|---|
| `text` | short string | `"title": { "type": "text", "label": { "ar": "العنوان", "en": "Title" }, "default": "عروض الصيف", "maxLength": 80 }` |
| `textarea` | longer string | `"body": { "type": "textarea", "label": { "ar": "النص", "en": "Body" }, "default": "" }` |
| `rich_text` | string | `"story": { "type": "rich_text", "label": { "ar": "قصة", "en": "Story" }, "default": "" }` |
| `number` | number | `"padding": { "type": "number", "label": { "ar": "المسافة", "en": "Padding" }, "default": 64, "min": 0, "max": 240 }` |
| `range` | number (slider) | `"count": { "type": "range", "label": { "ar": "العدد", "en": "Count" }, "default": 8, "min": 2, "max": 24, "step": 1 }` |
| `boolean` | `true` / `false` | `"show_title": { "type": "boolean", "label": { "ar": "إظهار العنوان", "en": "Show title" }, "default": true }` |
| `select` | one of `options` | `"align": { "type": "select", "label": { "ar": "المحاذاة", "en": "Align" }, "options": ["start", "center", "end"], "default": "start" }` |
| `color` | `#hex` or `theme:<token>` | `"background": { "type": "color", "label": { "ar": "الخلفية", "en": "Background" }, "default": "theme:background" }` |
| `image` | image reference (URL string) | `"image": { "type": "image", "label": { "ar": "صورة", "en": "Image" } }` |
| `video` | video reference | `"video": { "type": "video", "label": { "ar": "فيديو", "en": "Video" } }` |
| `link` | URL string | `"link": { "type": "link", "label": { "ar": "رابط", "en": "Link" }, "default": "/products" }` |
| `icon` | icon name | `"icon": { "type": "icon", "label": { "ar": "أيقونة", "en": "Icon" }, "default": "truck" }` |
| `product` | product handle | `"product": { "type": "product", "label": { "ar": "منتج", "en": "Product" } }` |
| `collection` | collection handle | `"collection": { "type": "collection", "label": { "ar": "مجموعة", "en": "Collection" }, "default": "featured" }` |
| `spacing` | string | `"gap": { "type": "spacing", "label": { "ar": "المسافات", "en": "Spacing" }, "default": "md" }` |
| `typography` | string | `"font": { "type": "typography", "label": { "ar": "الخط", "en": "Typography" }, "default": "body" }` |

Notes:

- `product` and `collection` store a handle string. `product('…')` and
  `collection('…')` take **literal** arguments only, so
  `collection(section.settings.collection)` is a compile error (SN1105). Use a
  fixed handle in the template (see the cookbook's product grid).
- `required`, `visible_if` (show this field only when another setting equals a
  value) and `responsive` are hints for the editor. Rendering does not enforce
  `required`; always set a sensible `default`.
- Labels are shown to Egyptian merchants: write the Arabic one first and in plain
  Egyptian Arabic.

## How settings reach the page (coercion)

The merchant's stored values are never trusted as-is. Before a section renders,
each declared setting is filled and coerced:

| Situation | Result |
|---|---|
| No stored value | `default` (or nothing, if there is no default) |
| `text`, `textarea`, `rich_text`, `image`, `video`, `link`, `icon`, `product`, `collection`, `spacing`, `typography` | must be a string, else `default`; cut to `maxLength` if set |
| `number`, `range` | numbers and numeric strings are parsed and clamped to `min`/`max`; anything else gives `default` |
| `boolean` | `true`, `"true"`, `"yes"`, `1` → `true`; `false`, `"false"`, `"no"`, `0` → `false`; else `default` |
| `select` | must be one of `options`, else `default` |
| `color` | must be `#` + 3-8 hex digits or `theme:<token>`, else `default` |
| Setting not declared in the schema | dropped; templates never see it |

So a stored `padding` of `"999"` with `max: 240` renders as `240`, and an `align`
of `"diagonal"` renders as the default `"start"`. A bad value never breaks the
page.

Values written directly on `hk-*` tags are not coerced by your schema; each tag
checks its own props (a `size` outside its range is clamped, an unknown `variant`
falls back to the tag default). See the [tag reference](../reference/tags.md).

## Template default sections

A template's `<hk-schema>` lists the sections a new page starts with, in order:

```html
<hk-sections />
<hk-schema>{"sections":[
  {"type":"hero","settings":{"title":"أهلًا بيك","subtitle":"قالب مبني بسنفرو"}},
  {"type":"featured","settings":{"title":"منتجات مختارة"}}
]}</hk-schema>
```

- `type` must be a file in `sections/` (SN3020); each entry is `{ "type", "settings"? }` (SN3026).
- `settings` here go through the same coercion as stored values.
- Default sections cannot list blocks. They are what `sneferu dev` shows.
- Once a merchant edits the page, their saved list of sections replaces the
  defaults.

## Blocks

`blocks/quote.sneferu`:

```html
<hk-card border="true" padding="20">
  <blockquote class="quote">{{ block.settings.text }}</blockquote>
  <hk-text text="— {{ block.settings.author }}" size="14" />
</hk-card>
<hk-schema>{
  "name": { "ar": "رأي", "en": "Quote" },
  "version": 1,
  "settings": {
    "text":   { "type": "textarea", "label": { "ar": "الرأي", "en": "Quote" }, "default": "التوصيل كان سريع جدًا", "maxLength": 280 },
    "author": { "type": "text",     "label": { "ar": "الاسم", "en": "Name" }, "default": "منى من الإسكندرية", "maxLength": 60 }
  }
}</hk-schema>
```

`sections/testimonials.sneferu` renders whatever blocks the merchant added:

```html
<hk-section>
  <hk-heading text="{{ section.settings.heading }}" level="h2" size="32" />
  <hk-grid columns="3" mobile-columns="1" gap="16">
    {% for block in section.blocks %}<hk-block of="{{ block }}" />{% endfor %}
  </hk-grid>
</hk-section>
<hk-schema>{
  "name": { "ar": "آراء العملاء", "en": "Testimonials" },
  "version": 1,
  "settings": {
    "heading": { "type": "text", "label": { "ar": "العنوان", "en": "Heading" }, "default": "عملاؤنا بيقولوا إيه" }
  },
  "blocks": { "allowed": ["quote"], "max": 6 },
  "presets": [
    { "name": { "ar": "ثلاث آراء", "en": "Three quotes" },
      "blocks": [ { "type": "quote" }, { "type": "quote" }, { "type": "quote" } ] }
  ]
}</hk-schema>
```

How it works:

- `section.blocks` is the list of the merchant's blocks in order, hidden ones
  removed. Each has `id`, `type` and coerced `settings`.
- `<hk-block of="{{ block }}" />` renders `blocks/<type>.sneferu` with `block` in
  scope, wrapped in `<div data-hk-block="<id>">`. The section's scope (`section`,
  `store`, …) stays visible.
- A block whose type is not in the theme is skipped with SN4012; the rest of the
  section renders.
- `blocks.allowed` (which block types the editor offers) and `blocks.max` are
  read by the editor. The platform also caps a section at 50 blocks and a page at
  60 sections.
- `presets` are starting configurations the editor offers when the section is
  added. They are stored with the theme and used by the builder; the CLI does not
  render them.
- Because default sections cannot carry blocks, `sneferu dev` shows a block
  section with no blocks. Design that state: it is also what a merchant sees right
  after adding the section.

```html
{% if section.blocks %}
  {% for block in section.blocks %}<hk-block of="{{ block }}" />{% endfor %}
{% else %}
  <hk-text text="{{ t('no_quotes_yet') }}" align="center" />
{% endif %}
```

## Snippets vs blocks

| Use | When |
|---|---|
| Block | The merchant decides how many there are and edits each one |
| Snippet (`{% render %}`) | You repeat markup in code, with values you pass in |

`{% render 'price-tag', amount: p.price %}` renders `snippets/price-tag.sneferu`
with `amount` in scope, on top of the caller's scope. Snippets nest up to 8 deep
and may not render each other in a cycle (SN3027).
