# Sneferu

Build themes for Hekana stores. Sneferu is Hekana's theme language and SDK —
HTML with `hk-*` tags, `{{ }}` and `{% if/for/render %}`, compiled to a safe
artifact and previewed locally.

    npx @hekana/sneferu init my-theme
    cd my-theme
    npx @hekana/sneferu dev        # http://127.0.0.1:4100 (Arabic, ?locale=en)
    npx @hekana/sneferu validate
    npx @hekana/sneferu build      # dist/<id>-<version>.sneferu.json

Commands: `init`, `dev`, `validate`, `build`. `push` arrives with the platform release.

Docs: docs/language.md · docs/diagnostics.md
