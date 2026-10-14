---
"@hekana/sneferu": minor
---

`sneferu init` writes an `AGENTS.md` (and a `CLAUDE.md` that imports it) into every new theme, so an AI coding agent opened in the folder knows the commands, the files and the rules. `validate`, `build`, `push`, `format` and the VS Code extension skip `AGENTS.md` and `CLAUDE.md` at the top of a theme, like `README.md`: the compiled theme is unchanged.
