---
"@hekana/sneferu-components": minor
"@hekana/sneferu-compiler": minor
---

Add `hk-custom-html`: merchant-written HTML and CSS. The HTML goes through a second, wider sanitiser profile (no script, no event handlers, no inline style, https images, YouTube/Vimeo embeds only); the CSS is parsed, allow-listed and rooted at the block so it cannot style the rest of the page. Every theme gets a `custom-html` editor section through `withDefaults`, on every page type except cart.
