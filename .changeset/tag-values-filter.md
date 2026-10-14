---
"@hekana/sneferu-core": minor
"@hekana/sneferu-runtime": minor
---

New `tag_values` filter: `{{ product.tags | tag_values: 'top' }}` returns the values of the tags written `top:Bergamot`, so a template can build structured content (fragrance notes, materials) from plain product tags.
