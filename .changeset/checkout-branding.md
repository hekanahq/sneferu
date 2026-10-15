---
"@hekana/sneferu-core": minor
"@hekana/sneferu-compiler": minor
"@hekana/sneferu": minor
---

Checkout branding. `theme.json` takes an optional `checkout` block (colours, font, radius, button shape, logo, header and footer, a trust note) that brands Hekana's own checkout; there is no checkout template or tag. The compiler validates it, normalises colours, clamps the radius and drops what is invalid (warnings SN3049-SN3057); `settings.checkout` is reserved (SN3048). Core exports `CHECKOUT_SETTINGS`, `CHECKOUT_SETTING_IDS` and `checkoutDefaults(tokens)`. New guide page: Checkout branding. The unused `checkout` tag category is removed.
