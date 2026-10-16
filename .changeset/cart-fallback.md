---
"@hekana/sneferu-runtime": patch
---

`renderPage` takes a `cartFallback` option. When it is on and the page rendered no `hk-cart-drawer` (the theme's header was removed, hidden or customised without one), the runtime appends the standard cart drawer, and a small cart link in the theme's colours when the page has no cart opener either, so add to cart, the drawer and checkout keep working on every theme. Off by default; Hekana turns it on for store pages.
