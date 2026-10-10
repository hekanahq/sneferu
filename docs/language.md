# Sneferu language reference

A theme is a folder of `.sneferu` templates (HTML with `hk-*` tags, `{{ }}` output and `{% %}` directives), a `theme.json` manifest, locale files and assets. `sneferu build` compiles it to one JSON artifact; the runtime renders that artifact to HTML. Templates cannot run code: the only way to produce output is the grammar below.

## Grammar

```ebnf
template    = { node } ;
node        = text | comment | interp | directive | element | schema ;
comment     = "<!--" … "-->" ;                      (* dropped at compile time *)
interp      = "{{" expr "}}" ;
directive   = "{%" ( if | elsif | else | endif | for | endfor | render ) "%}" ;
if          = "if" expr ;
elsif       = "elsif" expr ;
else        = "else" ;
endif       = "endif" ;
for         = "for" ident "in" expr [ "limit:" integer ] ;
endfor      = "endfor" ;
render      = "render" string [ "," ident ":" expr { "," ident ":" expr } ] ;
element     = "<" name { attr } ( "/>" | ">" { node } "</" name ">" ) ;
attr        = name [ "=" ( quoted | bare ) ] ;      (* quoted values may contain {{ expr }} *)
schema      = "<hk-schema>" json "</hk-schema>" ;

expr        = or { "|" filter } ;
filter      = ident [ ":" primary { "," primary } ] ;
or          = and { "or" and } ;
and         = not { "and" not } ;
not         = [ "not" ] cmp ;
cmp         = primary [ ( "==" | "!=" | ">" | "<" | ">=" | "<=" ) primary ] ;
primary     = string | number | "true" | "false" | "nil"
            | "(" expr ")"
            | lookup { tail }
            | ident { tail } ;
lookup      = lookupname "(" [ literal { "," literal } ] ")" ;   (* literal arguments only *)
tail        = "." ident | "[" integer "]" ;
```

Notes:

- Strings use `'single'` or `"double"` quotes. There is no arithmetic, no assignment and no method calls (`a.b()` is rejected).
- Comparison operators `>`, `<`, `>=`, `<=` are true only when both sides are numbers. `==` and `!=` are strict.
- Missing data never throws: it evaluates to nothing and renders as an empty string. Properties named `__proto__`, `prototype` and `constructor` are always undefined, and only own properties are read.
- `{{ }}` output is escaped for its position: text, attribute, or URL (URLs go through a safe-URL check, so `javascript:` becomes `#`).
- An attribute may mix text and expressions: `class="card {{ section.settings.tone }}"`.
- Tag and attribute names are lower-cased.

## Directives

| Directive | Example |
|---|---|
| `{% if expr %}` / `{% elsif expr %}` / `{% else %}` / `{% endif %}` | `{% if product.compare_at > product.price %}<hk-badge text="{{ 'sale' \| t }}" />{% endif %}` |
| `{% for x in expr [limit:n] %}` / `{% endfor %}` | `{% for p in collection('featured').products limit: 8 %}{{ p.title }}{% endfor %}` |
| `{% render 'snippet', key: expr %}` | `{% render 'price-tag', amount: p.price %}` renders `snippets/price-tag.sneferu` with `amount` in scope |
| `<hk-slot name="content" />` | layout and templates only: where the template (in a layout) or the sections (in a template) go |
| `<hk-sections />` | shorthand for the `sections` slot, used in templates |
| `<hk-schema>{json}</hk-schema>` | declares settings (sections, blocks) or default sections (templates) |

Loops: the default limit is 50 iterations, the maximum is 250. A limit below 1 or above 250 is an error (SN2007). A page may run at most 2,000 loop iterations in total.

Snippets: `{% render %}` may nest up to 8 deep.

### Blocks

A section lists its blocks with a loop over `section.blocks` and renders each with `hk-block`:

```
{% for block in section.blocks %}<hk-block of="{{ block }}" />{% endfor %}
```

Each block is rendered from `blocks/<type>.sneferu` with `block` in scope (`block.id`, `block.type`, `block.settings.*`) and wrapped in `<div data-hk-block="<id>">`.

## Scope

| Name | Contains |
|---|---|
| `store` | the store (e.g. `store.name`) |
| `settings` | the theme-level settings from `theme.json` |
| `section` | in sections: `section.id`, `section.type`, `section.settings.*`, `section.blocks` |
| `block` | in blocks: `block.id`, `block.type`, `block.settings.*` |
| `locale`, `dir` | `ar` / `en`, `rtl` / `ltr` |
| `forloop` | inside `{% for %}`: `forloop.index` (from 1), `forloop.first`, `forloop.last` |
| loop variable, `render` arguments | as named by the template |

`x.size` works on strings and arrays.

## Filters

Apply with `|`, arguments after `:` (`{{ title | truncate: 40 }}`).

| Filter | Input | Args | Example |
|---|---|---|---|
| `money` | price in minor units (piastres) | none | `129000` gives `1,290.00 ج.م` (Arabic) or `EGP 1,290.00` (English) |
| `img` | image reference | optional width | `{{ p.image \| img: 400 }}` gives a sized image URL |
| `date` | ISO date string | none | `2026-10-10` gives `10 October 2026` (English) or the Arabic date with Western numerals |
| `t` | translation key | none | `{{ 'shop_now' \| t }}` gives the text from `locales/<locale>.json`, falling back to the default locale, then the key |
| `escape` | any | none | `{{ x \| escape }}` converts to a string (output is escaped anyway) |
| `upcase` / `downcase` | string | none | `abc` gives `ABC` |
| `truncate` | string | max length (default 50) | `{{ 'abcdefgh' \| truncate: 4 }}` gives `abc…` |
| `default` | any | fallback | `{{ x \| default: 'n/a' }}` when `x` is nil or empty |
| `size` | array or string | none | `{{ items \| size }}` gives `3` |
| `first` / `last` | array | none | `{{ items \| first }}` |
| `join` | array | separator (default `, `) | `{{ tags \| join: ' / ' }}` gives `a / b` |
| `json_attr` | any | none | JSON for a `data-*` attribute |

## Lookups

Called like functions with literal arguments only.

| Lookup | Returns |
|---|---|
| `collection('handle')` | the collection (use `.products`); an empty collection if missing |
| `product('handle')` | the product, or nothing |
| `t('key')` | the translation (same fallback as the `t` filter); the key if missing |
| `settings('key')` | one theme setting |
| `asset_url('file.css')` | URL of a file in `assets/` |

A lookup may be followed by property access: `collection('featured').products`.

## Forbidden in themes

Elements (SN2001): `script`, `style`, `iframe`, `object`, `embed`, `base`, `link`, `meta`, `form`.

Attributes (SN2002): `srcdoc`, `formaction`, and every attribute starting with `on` (`onclick`, ...).

Also rejected:

- `style="..."` containing `{{ }}` (SN2009). Use classes, tokens or component props.
- A static URL that is unsafe (SN2010).

URL attributes are `href`, `src`, `action`, `poster`, `srcset`. Their dynamic values are always passed through the safe-URL filter at render time. Styling lives in `assets/*.css` and in component props.

Because a theme is untrusted input, the runtime re-validates the compiled artifact before rendering and refuses anything that does not pass (SN9xxx).

## Limits

| Limit | Value |
|---|---|
| Loop default / maximum limit | 50 / 250 |
| Loop iterations per page | 2,000 |
| Snippet and block include depth | 8 |
| Render nesting depth | 64 |
| Rendered nodes per page | 20,000 |
| Output size per page | 1,500,000 characters |
| Files per theme | 400 |
| Theme size | 25 MB |
| One asset | 2 MB |
| One template | 300 KB |

When a render budget is exceeded, the offending section degrades to a comment and the rest of the page is kept (SN4001).

## File roles and layout

```
theme.json           manifest
layout/theme.sneferu the page frame (header, <hk-slot name="content" />, footer)
templates/*.sneferu  one per page type; templates/index.sneferu is required
sections/*.sneferu   reusable page parts with settings and blocks
blocks/*.sneferu     items inside a section, rendered with hk-block
snippets/*.sneferu   partials used with {% render %}
assets/              css, js, images, fonts (png jpg webp avif gif svg woff woff2 ttf otf ico)
locales/<xx>.json    flat key to text maps (ar.json, en.json)
migrations/*.json    settings migrations
```

File and folder names are lower-case letters, digits, `.`, `_`, `-`. Symlinks, `..` and absolute paths are rejected (SN3002).

| Role | What it does | Starter example |
|---|---|---|
| Layout | wraps every page; the content slot receives the template | `layout/theme.sneferu` |
| Template | page type; usually just `<hk-sections />` plus a `<hk-schema>` listing default sections | `templates/index.sneferu` |
| Section | rendered inside `<div data-hk-section="<id>">`; has a `<hk-schema>` | `sections/hero.sneferu` |
| Block | a repeatable item inside a section | `blocks/chip.sneferu` |
| Snippet | a partial, no schema (the starter has none) | `snippets/<name>.sneferu` |

Template example (default sections for the page):

```html
<hk-sections />
<hk-schema>{"sections":[{"type":"hero","settings":{"title":"أهلًا بيك"}},{"type":"featured"}]}</hk-schema>
```

Section example:

```html
<hk-section background="theme:secondary" padding-y="96" mobile-padding-y="48">
  <hk-heading text="{{ section.settings.title }}" level="h1" size="56" mobile-size="32" />
  <hk-button label="{{ t('shop_now') }}" href="/products" />
</hk-section>
<hk-schema>{"name":{"ar":"واجهة","en":"Hero"},"version":1,"settings":{
  "title":{"type":"text","label":{"ar":"العنوان","en":"Title"},"default":"Hello","maxLength":80}}}</hk-schema>
```

A section or block schema needs `name` with both `ar` and `en` (SN3030). A section schema may also carry `blocks` (`{ "allowed": [...], "max": n }`) and `presets`. A rendered page wraps the whole output in `<div data-hk-theme="<id>" dir="rtl|ltr" lang="ar|en">`.

## theme.json

Required: `id` (3-41 chars: lowercase letters, digits, dashes, starting with a letter), `name` and `description` (`{ar,en}`), `version` (x.y.z), `author`, `category`, `engine: "hk2"`, `engineCompatibility` (`^2.0.0` or exact; the current engine is 2.0.0), `defaultLocale`, `locales` (must include the default), `settings` (a field schema), and `tokens.colors` with `primary`, `secondary`, `accent`, `background`, `text` as `#RRGGBB`.

## Field types (`<hk-schema>` settings)

Each field is `{ "type", "label": {"ar","en"}, "default"?, "required"?, "min"?, "max"?, "step"?, "options"?, "responsive"?, "visible_if"?, "maxLength"? }`.

| Type | Value | Coercion of stored setting values |
|---|---|---|
| `text` | short string | string, cut to `maxLength` |
| `textarea` | long string | as `text` |
| `rich_text` | string | as `text` |
| `number` | number | parsed, clamped to `min`/`max`; default if not numeric |
| `range` | number (slider) | as `number` |
| `boolean` | true/false | `true`/`"true"`/`"yes"`/`1` and the opposites; else default |
| `select` | one of `options` | default if not in `options` |
| `color` | `#hex` or a `theme:<token>` | default if neither |
| `image`, `video`, `link`, `icon` | string reference | string, else default |
| `product`, `collection` | handle string | string, else default |
| `spacing`, `typography` | string | string, else default |

Coercion (clamping, defaults, select fallback, colour checks, `maxLength`) applies only to section and block settings declared in `<hk-schema>`: a bad stored value falls back to the default instead of breaking the page. Props on `hk-*` tags are not coerced by the schema; they receive the evaluated value as-is and each tag validates its own props (for example `hk-product-grid` accepts an array or `{products}`).

## Responsive attributes

A prop declared `responsive` accepts `tablet-` and `mobile-` prefixed variants; the unprefixed attribute is the base. `mobile-columns="2"` sets `columns` on mobile. Using a prefix on a prop that is not responsive is SN2004.

```html
<hk-product-grid products="{{ collection('featured').products }}" limit="8" columns="4" tablet-columns="2" mobile-columns="2" />
```

## Built-in tags

Layout: `hk-section`, `hk-container`, `hk-stack`, `hk-grid`. Typography: `hk-heading`, `hk-text`, `hk-badge`. Media: `hk-image`. UI: `hk-button`, `hk-card`. Commerce: `hk-price`, `hk-product-card`, `hk-product-grid`. Passthrough attributes on tags: `class`, `id`, `role`, `title`, `data-*`, `aria-*`. Unknown tags and props get a "did you mean" hint (SN2003, SN2004); required props are checked (SN2005) and child rules enforced (SN2006).
