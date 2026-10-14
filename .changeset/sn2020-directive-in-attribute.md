---
"@hekana/sneferu-compiler": minor
---

New error SN2020: a `{% if %}`, `{% for %}` or `{% render %}` inside an attribute value is refused. It used to pass `validate` and render as stray class names. The message says to print a value with `{{ }}` or to put the `{% if %}` around two versions of the element.
