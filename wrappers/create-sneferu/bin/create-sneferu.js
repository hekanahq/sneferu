#!/usr/bin/env node
// `npm create sneferu [dir] [options]` runs `sneferu init [dir] [options]` (dir defaults to my-theme).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const dir = args.length > 0 && !args[0].startsWith('-') ? args.shift() : 'my-theme';
process.argv = [process.argv[0], process.argv[1], 'init', dir, ...args];

const require = createRequire(import.meta.url);
const pkgJson = require.resolve('@hekana/sneferu/package.json');
const { bin } = JSON.parse(readFileSync(pkgJson, 'utf8'));
await import(pathToFileURL(join(dirname(pkgJson), bin.sneferu)).href);
