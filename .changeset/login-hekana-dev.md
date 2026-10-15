---
"@hekana/sneferu": patch
---

`sneferu login` now sends you to hekana.dev/device to approve (the address comes from the API). The developer portal moved to hekana.dev: `login`, `logout` and `whoami` point at hekana.dev/account for keys and the dev store, and the docs (Get an API key, Push and publish, README) say so. Older CLIs keep working: the old partners.hekana.com/developers/device link redirects to hekana.dev/device with the code.
