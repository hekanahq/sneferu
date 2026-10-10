# 7. Publishing

> **Status (phase 1b): internal, admin only.** Pushing, installing and publishing
> Sneferu themes is limited to Hekana platform admins while theme engine 2 is
> dogfooded on dev and preview stores. A store only uses a Sneferu theme when the
> platform switch (`HK2_ENABLED`) and the store's own `hk2Themes` feature flag are
> both on. Merchants will install and publish themes from the builder later; third-
> party developer accounts come after that.

## Push a version

```bash
export HEKANA_API_URL=https://api.hekana.com/api/v1   # the default; set it for staging or local
export HEKANA_TOKEN=<platform admin access token>
npx @hekana/sneferu push ./my-theme --package my-theme
```

```
✔ pushed my-theme@1.0.0 → version 6f1c…e2 (approved, hash 9a41…)
```

| Input | Rule |
|---|---|
| `--package <slug>` | required; 2-63 lower-case letters, digits, `-`; must equal `theme.json` `id` |
| `HEKANA_TOKEN` | required; sent as `Authorization: Bearer …`. Never commit it |
| `HEKANA_API_URL` | optional, default `https://api.hekana.com/api/v1`. Must be `https://`; plain `http://` only for `localhost` / `127.0.0.1` |

What `push` does, in order:

1. Checks the slug, the token and the URL. Nothing is sent if any is wrong.
2. Compiles the theme locally as a pre-flight. A theme with errors is **not
   pushed**: you get the same diagnostics as `validate` and `✖ not pushed`.
3. Uploads the **source files** (`theme.json`, templates, locales, assets) as
   `POST {HEKANA_API_URL}/admin/hk2/packages/<slug>/versions`. `dist/`,
   `node_modules/`, `.git/` and any `*.sneferu.json` artifact are never uploaded.
   Keep build output in `dist/`; another `--out` folder inside the theme would be
   uploaded and rejected as an unknown file location.

## What the server does

- **Compiles the source itself.** Hekana never trusts a compiled artifact from a
  laptop; it runs its own compiler on the files you sent. A compile failure comes
  back as `422 HK2_COMPILE_FAILED` with the diagnostics, printed in the same
  `file:line:col severity CODE message` format.
- **Stores an immutable version.** `<slug>@<version>` can be pushed once. Pushing
  the same `version` again is `409 HK2_VERSION_EXISTS`: bump `version` in
  `theme.json` and push again.
- **Approves Hekana-owned packages automatically** (status `approved`). Packages
  owned by outside developers will wait for review (`in_review`) once developer
  accounts exist.
- Checks the theme CSS: all `assets/*.css` together at most 512 KB, valid UTF-8.

| Response | Meaning |
|---|---|
| `201` | created; the CLI prints the version id, status and content hash |
| `400 HK2_PUSH_INVALID` | malformed upload or bad slug |
| `401` / `403` | missing, expired or non-admin token |
| `409 HK2_VERSION_EXISTS` | this version number already exists |
| `422 HK2_COMPILE_FAILED` | the theme does not compile on the server (diagnostics included) |
| `422 HK2_PACKAGE_MISMATCH` | `theme.json` `id` differs from the package slug |

## Versioning

- Use semantic versions: patch (`1.0.1`) for fixes, minor (`1.1.0`) for new
  sections or settings, major (`2.0.0`) when you remove or rename sections or
  settings that stores may be using.
- Bump `version` in `theme.json` before every push. There is no overwrite and no
  delete; a version, once pushed, stays exactly as it was.
- A store stays on the version it installed until it installs a newer one.
- Keep setting keys stable across versions. Merchants' saved values are keyed by
  setting name; a renamed key starts again from its default.

## Install and publish on a store (admin endpoints for now)

All under `{HEKANA_API_URL}`, with a platform admin bearer token:

| Step | Endpoint | Effect |
|---|---|---|
| List packages | `GET /admin/hk2/packages` | every theme package |
| List versions | `GET /admin/hk2/packages/<slug>/versions` | versions with status and hash |
| Install | `POST /admin/hk2/merchants/<merchantId>/install/<versionId>` | pins the version on the store as a **draft**; shoppers see no change |
| Publish | `POST /admin/hk2/merchants/<merchantId>/publish` | makes the draft live; each publish is kept as a rollback point |
| Deactivate | `POST /admin/hk2/merchants/<merchantId>/deactivate` | the store goes back to its legacy theme |

Install and publish need the store's `hk2Themes` flag on (set in the admin
console). During phase 1b only the home page (`/`) is rendered by a Sneferu
theme; other pages stay on the legacy theme.

The merchant-side endpoints (`/hk2/install/<versionId>`, `/hk2/installation/draft`,
`/hk2/installation/publish`, `/hk2/publications/<id>/rollback`,
`/hk2/deactivate`) exist for the builder, which will give merchants the same
flow with settings editing, preview and rollback.

## Checklist before a push

1. `npx @hekana/sneferu validate` is clean.
2. Checked in `dev` in Arabic and in English (`?locale=en`), on a narrow window.
3. Empty states checked (empty collection, a block section with no blocks).
4. `version` bumped in `theme.json`.
5. `theme.json` `id` equals the `--package` slug.
