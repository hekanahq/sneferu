---
"@hekana/sneferu-core": minor
"@hekana/sneferu-runtime": minor
"@hekana/sneferu-components": minor
"@hekana/sneferu-compiler": minor
"@hekana/sneferu": minor
---

Full-width themes. `tokens.layout.contentWidth` now also accepts `"full"` (a `"<3-4 digits>px"` value works as before, and the default stays 1280px). Full emits `--hk-content-width:none` and `--hk-gutter:clamp(16px,3vw,56px)`; `hk-section` now pads its inner box with `var(--hk-gutter,16px)`, so themes can also set `--hk-gutter` themselves. The theme editor gets a new `token_container_fit` setting (`contained` or `full`, with Arabic and English labels) next to `token_container_width`; a width setting of `full` is also read as full. A `contentWidth` that is neither `full` nor a px width is now reported as warning SN3059 (it is still ignored). The VS Code theme schema allows `full`.
