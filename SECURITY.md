# Security policy

Please do not report security problems in public GitHub issues.

Email **support@hekana.com** with "Sneferu security" in the subject. Include
what you found, the affected package and version, and the steps or a theme that
reproduces it. We reply within a few working days and tell you when a fix ships.

In scope: the packages in this repository (the CLI, compiler, runtime,
components, controllers, the Prettier plugin and the VS Code extension), in
particular anything that lets a theme run script, read data it should not, or
escape the element, attribute and URL allow-lists described in
[Security and limits](https://hekana.dev/guide/security-and-limits).

Problems in the Hekana platform itself (stores, dashboard, API) go to the same
address.

Supported versions: the latest published release.
