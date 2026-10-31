---
"@hekana/sneferu": minor
"@hekana/sneferu-core": minor
"@hekana/sneferu-compiler": minor
"@hekana/sneferu-templates-default": patch
---

Theme authoring gaps:

- `validate` warns (SN3058) when a `tokens.colors` key is not lower-case kebab-case, such as `sageSoft`, which was silently not emitted as a `--hk-color-*` variable. The message suggests the kebab-case name.
- SN3002 now says which path segment failed and why (for example a folder starting with `_`); the rule is unchanged and documented.
- `sneferu dev` shows images from the project: a relative file path in `.sneferu-dev/data.json` (next to the data file, or from the theme folder) is served under `/__dev-images/` in dev only. A sample-data image that `hk-image` would drop (`http://`, a missing file) now prints a warning naming it. `hk-image` and published themes are unchanged.
- Font catalogue: Scheherazade New and Aref Ruqaa, two serif families with Arabic and Latin.
- Default theme: the 404 page no longer overflows at 390 px (`.sf-empty` grid column, `.sf-skip` margin), vertical offsets use logical properties, and the scaffold copy (product note, footer text) is generic.
