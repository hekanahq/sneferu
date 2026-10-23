---
"@hekana/sneferu-core": minor
"@hekana/sneferu-components": minor
"@hekana/sneferu-controllers": minor
"@hekana/sneferu-templates-default": minor
---

New `<hk-combined-listing>` tag: links to the other products in a combined listing (colour or style siblings), read from `product.combined_listing`. `display="auto|swatches|buttons|select"`; auto shows photo tiles, colour dots or buttons depending on what each member has. Every member is a real link, the current one is marked `aria-current`, and unavailable ones are shown marked. Renders nothing when there is no group or fewer than two members. On desktop, hovering a member previews its image in the product gallery. New optional `product-combined-listing` block in the default theme.

`ThemeProduct` gains an optional `combined_listing` field (`ThemeCombinedListing`) in `@hekana/sneferu-core`.
