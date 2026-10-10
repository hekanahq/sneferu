# Diagnostics reference

Every problem Sneferu reports has a stable code. The format is `file:line:col severity CODE message`. Errors fail `validate` and `build`.

| Series | Stage |
|---|---|
| SN1xxx | lexing and parsing templates |
| SN2xxx | template validation (tags, attributes, safety) |
| SN3xxx | package, manifest and compile |
| SN4xxx | rendering |
| SN9xxx | artifact (IR) integrity check at load time |

## SN1xxx Syntax

| Code | Meaning | Fix |
|---|---|---|
| SN1001 | `{{` has no closing `}}` | Close the output expression. |
| SN1002 | `{%` has no closing `%}` | Close the directive. |
| SN1003 | Unterminated tag or attribute value | Close the quote or the `>`. |
| SN1004 | `<hk-schema>` has no closing `</hk-schema>` | Add the closing tag. |
| SN1101 | An element, `{% if %}` or `{% for %}` is never closed | Add the matching closing tag or `{% endif %}` / `{% endfor %}`. |
| SN1102 | `{% elsif %}` / `{% else %}` outside `{% if %}`, or `{% endif %}` / `{% endfor %}` without a matching opener | Check nesting of directives. |
| SN1103 | A closing tag closes a different element than the innermost open one | Close inner elements first. |
| SN1104 | A closing tag has no matching opening tag | Remove it or add the opener. |
| SN1105 | Invalid expression, `for` header or `render` argument | Check the grammar in language.md; `for` is `x in expr [limit:n]`, `render` is `'name', key: expr`. |
| SN1106 | Unknown directive | Use `if`, `elsif`, `else`, `endif`, `for`, `endfor`, `render`. |
| SN1107 | `<hk-schema>` is not valid JSON | Fix the JSON (double quotes, no trailing commas). |

## SN2xxx Template validation

| Code | Meaning | Fix |
|---|---|---|
| SN2001 | Forbidden element (`script`, `style`, `iframe`, `object`, `embed`, `base`, `link`, `meta`, `form`) | Remove it; put styles in `assets/*.css`. |
| SN2002 | Forbidden attribute (`on*` handlers, `srcdoc`, `formaction`) | Remove it. |
| SN2003 | Unknown `hk-*` tag | Check the spelling; the message suggests the closest tag. |
| SN2004 | Unknown property on a tag, or `tablet-` / `mobile-` on a prop that is not responsive | Use a declared prop; only responsive props take prefixes. |
| SN2005 | A required property is missing | Add the property. |
| SN2006 | The tag does not accept this child | Use an allowed child element. |
| SN2007 | Loop limit outside 1..250 | Use a limit between 1 and 250. |
| SN2008 | `{% render %}` names a snippet that does not exist | Create `snippets/<name>.sneferu` or fix the name. |
| SN2009 | `style` attribute contains `{{ }}` | Use a class, a token or a component prop. |
| SN2010 | Unsafe static URL (for example `javascript:`) | Use an http(s), mailto, tel or relative URL. |
| SN2011 | `<hk-slot>` used outside a layout or template | Move it into the layout or a template. |

## SN3xxx Package, manifest and compile

| Code | Meaning | Fix |
|---|---|---|
| SN3001 | `theme.json` is missing | Add it at the theme root. |
| SN3002 | Invalid file path (absolute, `..`, bad characters, backslash, symlink) | Use lower-case names with letters, digits, `.`, `_`, `-`. |
| SN3003 | File type or location not allowed | Put files in the allowed folders with the allowed extensions. |
| SN3004 | Duplicate file | Remove the duplicate. |
| SN3005 | Too many files (max 400) | Remove unused files. |
| SN3006 | Package larger than 25 MB | Compress or remove assets. |
| SN3007 | An asset is larger than 2 MB | Compress or split it. |
| SN3008 | A template is larger than 300 KB | Split it into sections or snippets. |
| SN3009 | `theme.json` is not an object or not valid JSON | Fix the JSON. |
| SN3010 | `engine` is not `"hk2"` | Set `"engine": "hk2"`. |
| SN3011 | `engineCompatibility` does not include the current engine | Use a range that includes 2.0.0, such as `^2.0.0`. |
| SN3012 | Invalid `id` | 3-41 characters: lower-case letters, digits, dashes, starting with a letter. |
| SN3013 | `name` lacks `ar` or `en` | Provide both. |
| SN3014 | `version` is not `x.y.z` | Use semantic versioning. |
| SN3015 | `author` is missing | Add it. |
| SN3016 | `description` lacks `ar` or `en` | Provide both. |
| SN3017 | `category` is missing | Add it. |
| SN3018 | `defaultLocale` is not `ar`/`en`, or `locales` omits it | Fix `defaultLocale` and `locales`. |
| SN3019 | A required colour token is missing or not `#RRGGBB` | Set `primary`, `secondary`, `accent`, `background`, `text`. |
| SN3020 | A template references a section that does not exist | Create the section or fix the type. |
| SN3021 | `settings` in `theme.json` is not an object | Use an object of fields. |
| SN3022 | File is not valid UTF-8 | Re-save as UTF-8. |
| SN3023 | `layout/theme.sneferu` is missing | Add the layout. |
| SN3024 | `templates/index.sneferu` is missing | Add the index template. |
| SN3025 | A locale file is not valid JSON | Fix the JSON. |
| SN3026 | A template's schema `sections` is malformed | Use an array of `{ "type": "...", "settings": {...} }`. |
| SN3030 | A section or block `<hk-schema>` lacks `name` `{ar,en}` or has bad `settings` | Add both names; `settings` must be an object. |

## SN4xxx Rendering

These are reported by the runtime while rendering a page. The page still renders; the affected part is dropped.

| Code | Meaning | Fix |
|---|---|---|
| SN4001 | Render budget exceeded (nodes, loop iterations or output size); the section degrades | Lower loop limits or simplify the section. |
| SN4002 | Snippet or block include depth exceeded (8) | Remove recursive or deeply nested includes. |
| SN4003 | Maximum nesting depth (64) reached | Flatten the markup. |
| SN4004 | Snippet not found at render time | Create the snippet. |
| SN4005 | Component not available in the registry | Use a tag the platform provides. |
| SN4006 | A component failed while rendering | Check the props passed to it. |
| SN4010 | Template not found | Create `templates/<name>.sneferu`. |
| SN4011 | A page section's type does not exist in the theme | Add the section or remove it from the page. |

## SN9xxx Artifact integrity

The runtime re-checks a compiled artifact before rendering. These indicate a corrupt or tampered artifact; rebuild it with `sneferu build`.

| Code | Meaning | Fix |
|---|---|---|
| SN9001 | Unknown IR node kind | Rebuild with the current SDK. |
| SN9002 | Unknown component in the IR | Rebuild; check the tag exists. |
| SN9003 | Unknown filter in the IR | Rebuild. |
| SN9004 | Loop limit outside 1..250 in the IR | Rebuild. |
| SN9005 | Invalid expression in the IR | Rebuild. |
| SN9006 | Unknown lookup in the IR | Rebuild. |
| SN9007 | Invalid property value in the IR | Rebuild. |
| SN9008 | Malformed IR structure (expected array or object) | Rebuild. |
| SN9009 | IR nested too deeply | Flatten the templates and rebuild. |
| SN9010 | An `html` node is not a string | Rebuild. |
| SN9011 | Element not allowed in the IR | Rebuild; the element is forbidden. |
| SN9012 | Attribute not allowed in the IR (`on*`, `srcdoc`, `formaction`, dynamic `style`) | Rebuild. |
| SN9013 | Invalid attribute sink, or a URL attribute without the url sink | Rebuild. |
