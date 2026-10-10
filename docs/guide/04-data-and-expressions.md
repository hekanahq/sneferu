# 4. Data and expressions

Templates read data with `{{ expression }}` and control output with
`{% if %}`, `{% for %}` and `{% render %}`. There is no arithmetic, no
assignment and no function calls besides the lookups below: a template cannot
run code. The full grammar is in [language.md](../language.md).

## What a template can read

| Name | Where | Contains |
|---|---|---|
| `store` | everywhere | the store, e.g. `store.name` |
| `settings` | everywhere | theme settings from `theme.json` `settings`, defaults filled in and coerced: `settings.accent` |
| `section` | sections, their blocks and snippets | `section.id`, `section.type`, `section.settings.*`, `section.blocks` |
| `block` | blocks | `block.id`, `block.type`, `block.settings.*` |
| `locale` | everywhere | `ar` or `en` |
| `dir` | everywhere | `rtl` (Arabic) or `ltr` |
| `forloop` | inside `{% for %}` | `forloop.index` (from 1), `forloop.first`, `forloop.last` |
| loop variable, `render` arguments | where you name them | e.g. `p` in `{% for p in … %}` |

### Lookups

Lookups take **literal** arguments only (`collection('featured')`, not
`collection(section.settings.handle)`, which is SN1105).

| Lookup | Returns |
|---|---|
| `collection('featured')` | the collection: `.title`, `.products`. A missing collection is `{ products: [] }`, never an error |
| `product('handle')` | the product, or nothing |
| `t('shop_now')` | the text from `locales/<locale>.json`, then the default locale, then the key itself |
| `settings('accent')` | one theme setting (same as `settings.accent`) |
| `asset_url('logo.svg')` | the URL of `assets/logo.svg` |

### Product fields

A product (from `collection(…).products` or `product(…)`) has:

| Field | Example |
|---|---|
| `title` | `كارت بلايستيشن` |
| `url` | `/products/ps-card` |
| `price` | `52000` (minor units: piastres; 52000 = 520.00 EGP) |
| `compare_at` | `60000` or nil (the price before a discount) |
| `image` | `{ url: "https://…" }` |

## Output

```html
<h2>{{ section.settings.title }}</h2>
<p>{{ store.name }} · {{ t('shop_now') }}</p>
<a class="card {{ section.settings.tone }}" href="{{ p.url }}">{{ p.title }}</a>
```

- Output is escaped for where it lands: text, attribute or URL. You cannot inject
  HTML through a setting.
- URL attributes (`href`, `src`, …) go through a safe-URL check: `javascript:`
  and other unsafe values become `#`.
- Dynamic `class` and `id` are reduced to letters, digits, `-`, `_` and spaces.
- Strings, numbers and booleans print as text (`true`); objects and arrays print
  nothing. Missing data prints nothing; it never throws.
- An attribute can mix text and expressions: `class="tier {{ section.settings.size }}"`.
- On `hk-*` tags, an attribute that is exactly one `{{ }}` passes the raw value
  (a number, an array of products, an object). Mixed text makes a string.

## Expressions

| Form | Example |
|---|---|
| Literals | `'text'`, `"text"`, `42`, `true`, `false`, `nil` |
| Property | `section.settings.title`, `p.image.url` |
| Index | `collection('featured').products[0].title` |
| Size | `section.blocks.size`, `p.title.size` |
| Compare | `==`, `!=` (strict), `>`, `<`, `>=`, `<=` (numbers only; false otherwise) |
| Logic | `and`, `or`, `not`, parentheses |
| Filters | `value \| filter`, `value \| filter: arg1, arg2` |

```html
{% if p.compare_at > p.price %}<hk-badge text="{{ t('sale') }}" tone="warning" />{% endif %}
{% if section.settings.layout == 'wide' and not section.settings.compact %}…{% endif %}
```

`>`/`<` compare numbers only: `'10' > 9` is false. Prices are numbers, so price
comparisons work.

## Truthiness

In `{% if %}`, `{% elsif %}`, `and`, `or`, `not`:

| False | True |
|---|---|
| `nil` (missing), `false`, `0`, `''` (empty string), `[]` (empty array) | everything else, including `'0'`, `' '` and `{}` |

So `{% if collection('featured').products %}` is false for an empty or missing
collection, and `{% if section.blocks %}` is false when the merchant added no
blocks. Use that for empty states:

```html
{% if collection('featured').products %}
  <hk-product-grid products="{{ collection('featured').products }}" />
{% else %}
  <hk-text text="{{ t('collection_empty') }}" align="center" />
{% endif %}
```

`{% else %}` comes once, last (SN1109).

## Filters

| Filter | Input → output |
|---|---|
| `money` | price in minor units → formatted price in the store currency. `{{ 129000 \| money }}` → `1,290.00 ج.م` (Arabic) / `EGP 1,290.00` (English). Other currencies use the ISO code: `1,290.00 USD` / `USD 1,290.00`. Always two decimals, Western digits |
| `img` | image (object with `url`, or a URL) → image URL, optionally sized: `{{ p.image \| img: 400 }}` |
| `date` | ISO date → long date: `{{ '2026-10-10' \| date }}` → `10 أكتوبر 2026` / `10 October 2026` |
| `t` | key → translation: `{{ 'shop_now' \| t }}` (same as `t('shop_now')`) |
| `upcase` / `downcase` | `{{ 'egp' \| upcase }}` → `EGP` |
| `truncate` | `{{ p.title \| truncate: 20 }}` → at most 20 characters, ending in `…` (default 50) |
| `default` | `{{ section.settings.eyebrow \| default: 'جديد' }}` → the fallback when the value is nil or `''` |
| `size` | `{{ section.blocks \| size }}` → `3` (arrays and strings; `0` otherwise) |
| `first` / `last` | first / last array item: `{{ tags \| first }}`. A filter result cannot be followed by `.property`; for a field of the first product write `collection('featured').products[0].title` |
| `join` | `{{ tags \| join: ' · ' }}` → `a · b` (default separator `, `). On a missing value it prints its argument, so guard it: `{% if tags %}…{% endif %}` |
| `escape` | converts to a string (output is escaped anyway) |
| `json_attr` | value → JSON for a `data-*` attribute: `data-ids="{{ ids \| json_attr }}"` |

Filters chain left to right: `{{ p.title | truncate: 30 | upcase }}`.

Prices are always integers in minor units. Never divide or format them yourself;
use `money` or `<hk-price amount="{{ p.price }}" compare-at="{{ p.compare_at }}" />`.

Dates use Western digits in Arabic (`10 أكتوبر 2026`), matching the rest of
Hekana.

## Loops

```html
{% for p in collection('featured').products limit: 4 %}
  <hk-card class="item" data-first="{{ forloop.first }}">
    <hk-heading text="{{ forloop.index }}. {{ p.title }}" level="h3" size="18" />
    <hk-price amount="{{ p.price }}" compare-at="{{ p.compare_at }}" />
  </hk-card>
{% endfor %}
```

| Rule | Value |
|---|---|
| Default limit (no `limit:`) | 50 items |
| Largest `limit:` | 250 (a limit below 1 or above 250 is SN2007) |
| Iterations per page, all loops together | 2,000 |
| Looping over something that is not an array | renders nothing |
| `forloop.index` | 1, 2, 3 … |
| `forloop.first` / `forloop.last` | `true` on the first / last item |

There is no `forloop.length`; use `{{ list | size }}` or `list.size`.

## Translations

```html
<hk-button label="{{ t('shop_now') }}" href="/products" />
<span>{{ 'free_delivery' | t }}</span>
```

Use `t()` for interface words and settings for merchant content. Arabic is the
default; the English page uses `locales/en.json` and falls back to the default
locale for any missing key.

## Snippet arguments

```html
{% render 'tier-card', name: section.settings.tier1_name, price: section.settings.tier1_price, best: section.settings.best == '1' %}
```

Arguments are `key: expression`, separated by commas (commas inside quotes are
fine: `label: 'a, b'`). The snippet sees them plus the caller's scope.
