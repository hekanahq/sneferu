# 8. Cookbook

Four complete sections. Each one was dropped into a fresh copy of the starter
theme and checked with `validate` (zero errors, zero warnings); the output is in
[_verified.txt](_verified.txt). Copy the files, add the section type to
`templates/index.sneferu`, and run `dev`.

```html
<hk-sections />
<hk-schema>{"sections":[
  {"type":"promo-hero"},
  {"type":"product-grid"},
  {"type":"pricing"},
  {"type":"bento"}
]}</hk-schema>
```

All four use the base component styles from
[chapter 5](05-styling-and-responsive.md#your-css-assetscss). Save them as
`assets/base.css`:

```css
.sn-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
  padding-inline: 20px; border-radius: 10px; font-weight: 600; text-decoration: none;
  border: 2px solid var(--hk-color-accent); }
.sn-btn-solid { background: var(--hk-color-accent); color: var(--hk-color-background); }
.sn-btn-outline { background: transparent; color: var(--hk-color-accent); }
.sn-btn-ghost { background: transparent; border-color: transparent; color: inherit; }
.sn-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.sn-badge-accent { background: var(--hk-color-accent); color: var(--hk-color-background); }
.sn-badge-neutral { background: color-mix(in srgb, var(--hk-color-text) 10%, transparent); }
.sn-product-card { display: flex; flex-direction: column; gap: 8px; color: inherit; text-decoration: none; }
.sn-product-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 12px; }
.sn-was { opacity: .6; margin-inline-start: 6px; }
```

## (a) Hero with a token background and a call to action

A full-width hero whose background is a colour setting defaulting to the
`primary` token, an optional eyebrow badge, a title that scales down on tablet
and mobile, and two buttons that stack on mobile.

`sections/promo-hero.sneferu`:

```html
<hk-section background="{{ section.settings.background }}" padding-y="120" tablet-padding-y="88" mobile-padding-y="56" class="promo-hero">
  <hk-stack gap="20" mobile-gap="12" align="start">
    {% if section.settings.eyebrow %}<hk-badge text="{{ section.settings.eyebrow }}" tone="neutral" />{% endif %}
    <hk-heading text="{{ section.settings.title }}" level="h1" size="60" tablet-size="44" mobile-size="32" color="theme:background" />
    <hk-text text="{{ section.settings.subtitle }}" size="20" mobile-size="16" color="theme:background" />
    <hk-stack direction="row" mobile-direction="column" gap="12">
      <hk-button label="{{ section.settings.cta_label }}" href="{{ section.settings.cta_link }}" size="lg" />
      <hk-button label="{{ t('browse_all') }}" href="/collections/all" variant="outline" size="lg" />
    </hk-stack>
  </hk-stack>
</hk-section>
<hk-schema>{
  "name": { "ar": "واجهة ترويجية", "en": "Promo hero" },
  "version": 1,
  "settings": {
    "eyebrow":    { "type": "text",     "label": { "ar": "سطر صغير فوق العنوان", "en": "Eyebrow" }, "default": "عرض الأسبوع", "maxLength": 40 },
    "title":      { "type": "text",     "label": { "ar": "العنوان", "en": "Title" }, "default": "كل اللي محتاجه في مكان واحد", "maxLength": 80 },
    "subtitle":   { "type": "textarea", "label": { "ar": "الوصف", "en": "Subtitle" }, "default": "توصيل لكل مصر والدفع عند الاستلام", "maxLength": 200 },
    "cta_label":  { "type": "text",     "label": { "ar": "نص الزر", "en": "Button label" }, "default": "اطلب دلوقتي", "maxLength": 30 },
    "cta_link":   { "type": "link",     "label": { "ar": "رابط الزر", "en": "Button link" }, "default": "/products" },
    "background": { "type": "color",    "label": { "ar": "الخلفية", "en": "Background" }, "default": "theme:primary" }
  }
}</hk-schema>
```

Add to `locales/ar.json` and `locales/en.json`:

```json
{
  "browse_all": "تصفح كل المنتجات"
}
```

```json
{
  "browse_all": "Browse all products"
}
```

Things to notice:

- `"default": "theme:primary"` on a `color` setting: the merchant can keep the
  token or pick any hex colour; `background="{{ section.settings.background }}"`
  takes both.
- `color="theme:background"` keeps the text readable whatever the token values are.
- `{% if section.settings.eyebrow %}`: an empty eyebrow is falsy, so the badge
  disappears instead of rendering empty.
- `cta_link` is a `link` setting; an unsafe value (`javascript:…`) renders as `#`.

## (b) Pricing tiers: three cards, a "best value" badge, 3 → 1 columns

Three cards side by side on desktop, one per row on tablet and mobile. The
merchant picks which tier is the best value; that card gets a badge and an
accent outline. Prices are numbers in piastres and printed with `money`, so
`29900` shows as `299.00 ج.م` / `EGP 299.00`.

`sections/pricing.sneferu`:

```html
<hk-section>
  <hk-stack gap="32">
    <hk-heading text="{{ section.settings.heading }}" level="h2" size="36" mobile-size="28" align="center" />
    <hk-grid columns="3" tablet-columns="1" gap="24" class="tiers">
      {% render 'tier-card', name: section.settings.tier1_name, price: section.settings.tier1_price, features: section.settings.tier1_features, link: '/pages/plans', best: section.settings.best == '1', variant: 'outline' %}
      {% render 'tier-card', name: section.settings.tier2_name, price: section.settings.tier2_price, features: section.settings.tier2_features, link: '/pages/plans', best: section.settings.best == '2', variant: 'solid' %}
      {% render 'tier-card', name: section.settings.tier3_name, price: section.settings.tier3_price, features: section.settings.tier3_features, link: '/pages/plans', best: section.settings.best == '3', variant: 'outline' %}
    </hk-grid>
  </hk-stack>
</hk-section>
<hk-schema>{
  "name": { "ar": "باقات الأسعار", "en": "Pricing tiers" },
  "version": 1,
  "settings": {
    "heading":        { "type": "text",     "label": { "ar": "العنوان", "en": "Heading" }, "default": "اختار الباقة المناسبة" },
    "tier1_name":     { "type": "text",     "label": { "ar": "اسم الباقة ١", "en": "Tier 1 name" }, "default": "أساسي" },
    "tier1_price":    { "type": "number",   "label": { "ar": "سعر الباقة ١ (قرش)", "en": "Tier 1 price (piastres)" }, "default": 9900, "min": 0 },
    "tier1_features": { "type": "textarea", "label": { "ar": "مميزات الباقة ١", "en": "Tier 1 features" }, "default": "متجر واحد · ١٠٠ منتج" },
    "tier2_name":     { "type": "text",     "label": { "ar": "اسم الباقة ٢", "en": "Tier 2 name" }, "default": "بيزنس" },
    "tier2_price":    { "type": "number",   "label": { "ar": "سعر الباقة ٢ (قرش)", "en": "Tier 2 price (piastres)" }, "default": 29900, "min": 0 },
    "tier2_features": { "type": "textarea", "label": { "ar": "مميزات الباقة ٢", "en": "Tier 2 features" }, "default": "منتجات بلا حدود · دومين خاص" },
    "tier3_name":     { "type": "text",     "label": { "ar": "اسم الباقة ٣", "en": "Tier 3 name" }, "default": "متقدم" },
    "tier3_price":    { "type": "number",   "label": { "ar": "سعر الباقة ٣ (قرش)", "en": "Tier 3 price (piastres)" }, "default": 59900, "min": 0 },
    "tier3_features": { "type": "textarea", "label": { "ar": "مميزات الباقة ٣", "en": "Tier 3 features" }, "default": "كل حاجة في بيزنس · دعم أولوية" },
    "best":           { "type": "select",   "label": { "ar": "الباقة الأفضل قيمة", "en": "Best value tier" }, "options": ["1", "2", "3"], "default": "2" }
  }
}</hk-schema>
```

`snippets/tier-card.sneferu`:

```html
<hk-card class="tier" data-best="{{ best }}" padding="28" mobile-padding="20" radius="16" border="true" shadow="sm">
  <hk-stack gap="12">
    {% if best %}<hk-badge text="{{ t('best_value') }}" tone="accent" />{% endif %}
    <hk-heading text="{{ name }}" level="h3" size="24" />
    <p class="tier-price"><strong>{{ price | money }}</strong> <small>{{ t('per_month') }}</small></p>
    <hk-text text="{{ features }}" size="15" />
    <hk-button label="{{ t('choose_plan') }}" href="{{ link }}" variant="{{ variant }}" />
  </hk-stack>
</hk-card>
```

`assets/pricing.css`:

```css
.tier[data-best="true"] { outline: 2px solid var(--hk-color-accent); outline-offset: -2px; }
.tier-price { margin: 0; font-size: 28px; }
.tier-price small { font-size: 14px; opacity: .7; }
```

Add to `locales/ar.json` and `locales/en.json`:

```json
{
  "best_value": "أفضل قيمة",
  "per_month": "/ شهريًا",
  "choose_plan": "اختار الباقة"
}
```

```json
{
  "best_value": "Best value",
  "per_month": "/ month",
  "choose_plan": "Choose plan"
}
```

Things to notice:

- The card markup lives once in a snippet; the section renders it three times
  with different arguments.
- `best: section.settings.best == '1'` passes a boolean. The snippet uses it in
  `{% if best %}` and as `data-best="{{ best }}"` (`"true"` / `"false"`), and the
  CSS styles `[data-best="true"]`. A dynamic `style` attribute is not allowed, so
  `data-*` + CSS is the way to style by state.
- `columns="3" tablet-columns="1"` on `hk-grid` is the whole responsive layout.
- A version where the merchant adds and removes tiers would make each tier a
  block (see [chapter 3](03-sections-and-blocks.md#blocks)).

## (c) Product grid from `collection('featured')` with a heading

A heading with a "view all" link on the same row, then up to N products from the
`featured` collection, with an empty state.

`sections/product-grid.sneferu`:

```html
<hk-section padding-y="72" mobile-padding-y="40">
  <hk-stack gap="24">
    <hk-stack direction="row" justify="between" align="center">
      <hk-heading text="{{ section.settings.heading }}" level="h2" size="32" mobile-size="24" />
      {% if section.settings.show_link %}<hk-button label="{{ t('view_all') }}" href="/collections/featured" variant="ghost" size="sm" />{% endif %}
    </hk-stack>
    {% if collection('featured').products %}
      <hk-product-grid products="{{ collection('featured').products }}" limit="{{ section.settings.count }}" columns="4" tablet-columns="3" mobile-columns="2" />
    {% else %}
      <hk-text text="{{ t('collection_empty') }}" align="center" />
    {% endif %}
  </hk-stack>
</hk-section>
<hk-schema>{
  "name": { "ar": "شبكة منتجات", "en": "Product grid" },
  "version": 1,
  "settings": {
    "heading":   { "type": "text",    "label": { "ar": "العنوان", "en": "Heading" }, "default": "الأكثر مبيعًا" },
    "count":     { "type": "range",   "label": { "ar": "عدد المنتجات", "en": "Products to show" }, "default": 8, "min": 2, "max": 24, "step": 1 },
    "show_link": { "type": "boolean", "label": { "ar": "إظهار «عرض الكل»", "en": "Show “View all”" }, "default": true }
  }
}</hk-schema>
```

Add to `locales/ar.json` and `locales/en.json`:

```json
{
  "view_all": "عرض الكل",
  "collection_empty": "مفيش منتجات هنا لسه"
}
```

```json
{
  "view_all": "View all",
  "collection_empty": "No products here yet"
}
```

Things to notice:

- `products="{{ collection('featured').products }}"` passes the product array
  itself, not text: an attribute that is exactly one `{{ }}` keeps the value's type.
- `limit="{{ section.settings.count }}"` comes from a `range` setting clamped to
  2-24; `hk-product-grid` itself caps `limit` at 48.
- `{% if collection('featured').products %}` is false for an empty or missing
  collection (empty arrays are falsy), so the empty state shows.
- The handle `featured` is written in the template: lookups take literal
  arguments only. Use one section per collection, or ask the store to fill the
  `featured` collection.

## (d) Bento grid with mixed spans

A four-column bento: one large tile spanning 2 × 2, a wide tile, two small
tiles, then four product tiles where the first is wide. Two columns on tablet,
one on mobile.

`sections/bento.sneferu`:

```html
<hk-section>
  <hk-grid columns="4" tablet-columns="2" mobile-columns="1" gap="16" class="bento">
    <hk-card class="bento-wide bento-tall" background="theme:primary" padding="32" mobile-padding="20" radius="20">
      <hk-stack gap="12">
        <hk-heading text="{{ section.settings.lead_title }}" level="h2" size="40" mobile-size="28" color="theme:background" />
        <hk-text text="{{ section.settings.lead_text }}" color="theme:background" />
        <hk-button label="{{ t('shop_now') }}" href="/products" />
      </hk-stack>
    </hk-card>
    <hk-card class="bento-wide" background="theme:accent" radius="20">
      <hk-heading text="{{ t('bento_delivery') }}" level="h3" size="22" color="theme:background" />
    </hk-card>
    <hk-card border="true" radius="20">
      <hk-heading text="{{ t('bento_cod') }}" level="h3" size="20" />
    </hk-card>
    <hk-card border="true" radius="20">
      <hk-heading text="{{ t('bento_returns') }}" level="h3" size="20" />
    </hk-card>
    {% for p in collection('featured').products limit: 4 %}
      <hk-card class="bento-product" data-first="{{ forloop.first }}" border="true" radius="20" padding="12">
        <hk-product-card product="{{ p }}" />
      </hk-card>
    {% endfor %}
  </hk-grid>
</hk-section>
<hk-schema>{
  "name": { "ar": "شبكة بينتو", "en": "Bento grid" },
  "version": 1,
  "settings": {
    "lead_title": { "type": "text",     "label": { "ar": "العنوان الرئيسي", "en": "Lead title" }, "default": "جديد الموسم وصل" },
    "lead_text":  { "type": "textarea", "label": { "ar": "النص الرئيسي", "en": "Lead text" }, "default": "تشكيلة جديدة كل أسبوع" }
  }
}</hk-schema>
```

`assets/bento.css`:

```css
.bento { grid-auto-rows: minmax(160px, auto); grid-auto-flow: dense; }
.bento-wide { grid-column: span 2; }
.bento-tall { grid-row: span 2; }
@media (max-width: 639px) {
  .bento-wide, .bento-tall { grid-column: auto; grid-row: auto; }
}
.bento-product[data-first="true"] { grid-column: span 2; }
@media (max-width: 639px) { .bento-product[data-first="true"] { grid-column: auto; } }
```

Add to `locales/ar.json` and `locales/en.json`:

```json
{
  "shop_now": "تسوق دلوقتي",
  "bento_delivery": "توصيل لكل المحافظات",
  "bento_cod": "الدفع عند الاستلام",
  "bento_returns": "استرجاع خلال ١٤ يوم"
}
```

```json
{
  "shop_now": "Shop now",
  "bento_delivery": "Delivery to every governorate",
  "bento_cod": "Cash on delivery",
  "bento_returns": "14-day returns"
}
```

Things to notice:

- `hk-grid` sets the columns; spans come from your CSS through the `class`
  passthrough (`bento-wide`, `bento-tall`). `grid-auto-flow: dense` fills the
  gaps the large tiles leave.
- Inside the loop, `data-first="{{ forloop.first }}"` marks the first product so
  CSS can widen it. `{% %}` directives cannot go inside an attribute value; use
  `{{ }}` and `data-*` instead.
- `limit: 4` keeps the loop small and predictable.
- On mobile every span resets to one cell, so the tiles stack in source order.
