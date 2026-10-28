---
"@hekana/sneferu-core": minor
"@hekana/sneferu-components": minor
"@hekana/sneferu-controllers": minor
"@hekana/sneferu-compiler": minor
"@hekana/sneferu": minor
---

App blocks. A closed registry (`APP_BLOCKS` in core) lists the apps and blocks a store can place, each with its framed path, page types, typed settings and Arabic/English names. New `<hk-app-block app block product settings>` prints a same-origin frame of the registered page and prints nothing for any pair that is not on the list. The `app-block` controller sizes the frame from the height the page reports and removes the block when the page says the app is not installed (both messages must come from the store's own origin and from that frame). `withDefaults` adds one theme-editor section per registry entry to every theme (a theme's own section of the same name wins), so existing themes can offer the block on its page types without being edited. `sneferu dev` serves a placeholder for the framed pages. `createPreviewRegistry()` gives an editor the same tags with a still box in place of the frame. A static `app`/`block` that is not on the list is refused when the theme is checked (SN2021).
