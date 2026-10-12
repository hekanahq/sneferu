import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const json = (p: string) => JSON.parse(readFileSync(file(p), 'utf8'));
const main = json('packages/sneferu/package.json');

describe('short names `sneferu` and `create-sneferu` wrap @hekana/sneferu at the same version', () => {
  it.each([['wrappers/sneferu', 'sneferu'], ['wrappers/create-sneferu', 'create-sneferu']])('%s is published as %s', (dir, name) => {
    const p = json(`${dir}/package.json`);
    expect(p.name).toBe(name);
    expect(p.version).toBe(main.version);
    expect(p.dependencies).toEqual({ '@hekana/sneferu': main.version });
    expect(p.publishConfig.access).toBe('public');
    expect(p.license).toBe(main.license);
    expect(readFileSync(file(`${dir}/LICENSE`), 'utf8')).toBe(readFileSync(file('LICENSE'), 'utf8'));
    expect(readFileSync(file(`${dir}/README.md`), 'utf8')).toContain('https://hekana.dev');
    for (const bin of Object.values(p.bin as Record<string, string>)) expect(existsSync(file(`${dir}/${bin}`))).toBe(true);
  });

  it('`sneferu` exposes the same commands as @hekana/sneferu', () => {
    expect(json('wrappers/sneferu/package.json').bin).toEqual({ sneferu: 'bin/sneferu.js', snf: 'bin/sneferu.js' });
    expect(Object.keys(main.bin).sort()).toEqual(['sneferu', 'snf']);
  });

  it('the CLI version string matches the package version', () => {
    expect(readFileSync(file('packages/sneferu/src/cli.ts'), 'utf8')).toContain(`.version('${main.version}')`);
  });

  it('the sync script agrees', () => {
    expect(() => execFileSync('node', [file('scripts/sync-short-names.mjs'), '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('both wrappers run the @hekana/sneferu CLI; create-sneferu calls init with my-theme by default', () => {
    // a stand-in @hekana/sneferu whose CLI prints its argv, so the wrappers are tested without a build
    const tmp = mkdtempSync(join(tmpdir(), 'snf-wrap-'));
    try {
      const fake = join(tmp, 'node_modules', '@hekana', 'sneferu');
      mkdirSync(fake, { recursive: true });
      execFileSync('node', ['-e', `const fs=require('fs');fs.writeFileSync(${JSON.stringify(join(fake, 'package.json'))}, JSON.stringify({name:'@hekana/sneferu',type:'module',bin:{sneferu:'./cli.js'}}));fs.writeFileSync(${JSON.stringify(join(fake, 'cli.js'))}, 'console.log(JSON.stringify(process.argv.slice(2)))')`]);
      for (const w of ['sneferu', 'create-sneferu']) {
        mkdirSync(join(tmp, w));
        symlinkSync(file(`wrappers/${w}/bin`), join(tmp, w, 'bin'));
      }
      const run = (bin: string, args: string[]) => JSON.parse(execFileSync('node', ['--preserve-symlinks', '--preserve-symlinks-main', join(tmp, bin), ...args], { encoding: 'utf8' }));
      expect(run('sneferu/bin/sneferu.js', ['validate', 't1'])).toEqual(['validate', 't1']);
      expect(run('create-sneferu/bin/create-sneferu.js', [])).toEqual(['init', 'my-theme']);
      expect(run('create-sneferu/bin/create-sneferu.js', ['t2', '--force'])).toEqual(['init', 't2', '--force']);
      expect(run('create-sneferu/bin/create-sneferu.js', ['--force'])).toEqual(['init', 'my-theme', '--force']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
