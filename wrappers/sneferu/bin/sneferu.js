#!/usr/bin/env node
// `sneferu` is the short name for @hekana/sneferu: run its CLI as is.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const pkgJson = require.resolve('@hekana/sneferu/package.json');
const { bin } = JSON.parse(readFileSync(pkgJson, 'utf8'));
await import(pathToFileURL(join(dirname(pkgJson), bin.sneferu)).href);
