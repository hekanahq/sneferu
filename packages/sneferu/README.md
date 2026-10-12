# @hekana/sneferu

The Sneferu CLI: build themes for Hekana stores.

Sneferu is HTML with `hk-*` tags and a small template syntax. The CLI checks a
theme, previews it with sample data and compiles it into one artifact a store can
run safely.

## Quick start

```bash
npx sneferu init my-theme     # copy the starter theme
npx sneferu dev ./my-theme    # preview on http://127.0.0.1:4100
npx sneferu validate ./my-theme
npx sneferu build ./my-theme
```

Requires Node.js 20 or newer. Install it globally with `npm i -g sneferu` for the
`sneferu` and `snf` commands. `sneferu` is a short name for this package
(`@hekana/sneferu`); both install the same tool.

## Commands

| Command | What it does |
|---|---|
| `init <dir>` | Create a theme from the starter |
| `dev <dir>` | Preview with sample data, reload on save |
| `validate <dir>` | Check the theme and report diagnostics |
| `build <dir>` | Compile to `dist/<id>-<version>.sneferu.json` |
| `push <dir>` | Upload the theme source to Hekana |

## Docs

Full guide, tag reference and examples: https://hekana.dev
