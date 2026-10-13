# Publishing the Sneferu extension

The extension is ready to publish as `hekana.sneferu` (publisher `hekana`, name
`sneferu`). Publishing needs two accounts that only the owner can create. Nothing
below has been done yet.

## Build the .vsix

```bash
pnpm install
pnpm --filter sneferu package        # → packages/vscode-sneferu/sneferu-<version>.vsix
```

`package` regenerates the language data from `docs/reference/tags.json` and the
docs, bundles the extension, the language server and the CLI with esbuild, and
runs `vsce package --no-dependencies` (everything is bundled, so no
`node_modules` ships).

Before a release:

```bash
pnpm test                                                        # unit tests, includes the LSP providers
xvfb-run -a node packages/vscode-sneferu/test/run-e2e.mjs        # in a real VS Code (Linux; drop xvfb-run elsewhere)
```

## 1. VS Code Marketplace (owner)

1. Sign in at <https://marketplace.visualstudio.com/manage> with the Microsoft
   account that should own the listing, and **create a publisher** with
   - ID: `hekana` (must match `publisher` in package.json; it cannot be changed later)
   - Name: `Hekana`
   - optionally the website `https://hekana.dev` and a support email.
2. Create an **Azure DevOps organization** for the same account at
   <https://dev.azure.com> (any name; it only issues the token).
3. In Azure DevOps: User settings → **Personal access tokens** → New token:
   - Organization: **All accessible organizations**
   - Scopes: **Custom defined** → **Marketplace** → **Manage**
   - Expiry: up to one year. Store it as a secret (`VSCE_PAT`); never commit it.
4. Publish:

   ```bash
   cd packages/vscode-sneferu
   npx @vscode/vsce login hekana                     # paste the token once
   npx @vscode/vsce publish --packagePath sneferu-0.2.1.vsix
   # or, in CI: VSCE_PAT=… npx @vscode/vsce publish --packagePath sneferu-0.2.1.vsix
   ```

5. Optional: verify the publisher's domain (`hekana.com` or `hekana.dev`) in the
   publisher settings for the verified badge (a DNS TXT record).

## 2. Open VSX (owner): VSCodium, Cursor, Windsurf, Gitpod

1. Create an Eclipse account at <https://accounts.eclipse.org/user/register>.
2. Sign in at <https://open-vsx.org> with GitHub, open your profile settings
   and **link the Eclipse account**, then **sign the Publisher Agreement** there.
3. Create an **access token** at <https://open-vsx.org/user-settings/tokens>.
   Store it as a secret (`OVSX_PAT`).
4. Create the namespace once, then publish:

   ```bash
   npx ovsx create-namespace hekana -p "$OVSX_PAT"
   npx ovsx publish packages/vscode-sneferu/sneferu-0.2.1.vsix -p "$OVSX_PAT"
   ```

5. Optional: claim the `hekana` namespace (verified owner) with an issue at
   <https://github.com/EclipseFdn/open-vsx.org/issues> using the "Claim
   namespace ownership" template.

## Decide before the first listing

- **Repository link.** `repository` and `bugs` point at the public SDK repo
  (`github.com/hekanahq/sneferu`), so the listing's links work.
- **README pictures** load from `https://hekana.dev/developers/examples/vscode-*.webp`,
  which exist once the hekana.dev docs with the "Editor setup: VS Code" page are
  deployed. Deploy those first.
- **Licence.** `LICENSE` is MIT, the same as the rest of the SDK.

## Later releases

1. Bump `version` in `packages/vscode-sneferu/package.json` and add a section to
   `CHANGELOG.md`. Rebuild after SDK changes so new tags, filters and
   diagnostics are picked up.
2. `pnpm --filter sneferu package`, run the tests above.
3. `vsce publish --packagePath …` and `ovsx publish …` with the new file.
4. Put the new .vsix on hekana.dev (`apps/developers/public/developers/downloads/`
   in the Hekana repo) and update the link in `docs/guide/13-editor-setup-vscode.mdx`.

Once the Marketplace listing is live, change the "From the Marketplace (soon)"
part of the guide.
