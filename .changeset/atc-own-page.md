---
'@hekana/sneferu-components': patch
---

hk-add-to-cart: on a product's own page, never render the "Choose options" link (it pointed at the page itself and left no way to buy). A product flagged `has_variants` with no variants left now gets the add-to-cart form there, sold as a plain product; list cards keep the link.
