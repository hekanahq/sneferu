import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The guide shows short excerpts of the example themes; the whole files live on GitHub.
// Every excerpt is followed by a link to its file at a pinned commit, so the lines it
// shows never drift: these tests check that each excerpt is exactly those lines of the
// file at that commit. The example READMEs do the same with relative links, checked
// against the files next to them.

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = (p: string) => `${root}${p}`;
const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });

const FENCE = /^```([a-z]*) title="([^"]+)"\n([\s\S]*?)^```\n(?:\n(\[View [^\]]+\]\(([^)]+)\)))?/gm;
const GITHUB = /^https:\/\/github\.com\/hekanahq\/sneferu\/blob\/([0-9a-f]{40})\/([^#]+)(?:#L(\d+)-L(\d+))?$/;

/** Lines a..b (1-based, inclusive) of a file's text. */
const slice = (text: string, a: number, b: number) => text.split('\n').slice(a - 1, b).join('\n');

interface Excerpt { doc: string; title: string; code: string; link?: string; href?: string }

function excerpts(doc: string): Excerpt[] {
  const text = readFileSync(repo(doc), 'utf8');
  return [...text.matchAll(FENCE)].map((m) => ({ doc, title: m[2]!, code: m[3]!.replace(/\n$/, ''), link: m[4], href: m[5] }));
}

const pinnedFiles = new Map<string, string>();
function pinned(sha: string, path: string): string {
  const key = `${sha}:${path}`;
  if (!pinnedFiles.has(key)) pinnedFiles.set(key, git('show', key));
  return pinnedFiles.get(key)!;
}

const guideDocs = readdirSync(repo('docs/guide')).filter((f) => f.endsWith('.mdx')).map((f) => `docs/guide/${f}`);
const guideExcerpts = guideDocs.flatMap(excerpts).filter((e) => e.title.startsWith('examples/'));

describe('guide excerpts of the example themes', () => {
  it('finds them', () => { expect(guideExcerpts.length).toBeGreaterThan(30); });

  for (const e of guideExcerpts) {
    it(`${e.doc}: ${e.title}`, () => {
      const path = e.title.replace(/ \(excerpt\)$/, '');
      expect(e.link, 'needs a "View full file on GitHub" link right after the block').toMatch(/^\[View full file on GitHub\]/);
      const m = GITHUB.exec(e.href ?? '');
      expect(m, `link must be a pinned blob URL: ${e.href}`).not.toBeNull();
      const [, sha, linked, a, b] = m!;
      expect(linked, 'the link points at the file in the title').toBe(path);
      // The pin must be on this branch's history, so the link resolves once it is pushed.
      expect(() => git('merge-base', '--is-ancestor', sha!, 'HEAD'), `${sha} is not an ancestor of HEAD (CI needs fetch-depth: 0)`).not.toThrow();
      const file = pinned(sha!, path);
      const lines = e.code.split('\n').length;
      expect(lines, 'an excerpt is 5 to 25 lines').toBeGreaterThanOrEqual(5);
      expect(lines, 'an excerpt is 5 to 25 lines').toBeLessThanOrEqual(25);
      expect(file, 'the excerpt is an exact substring of the pinned file').toContain(e.code);
      if (a) {
        expect(e.title, 'a line range is an excerpt').toMatch(/ \(excerpt\)$/);
        expect(e.code, `lines ${a}-${b} of the pinned file`).toBe(slice(file, Number(a), Number(b)));
      } else {
        expect(e.title, 'a whole file has no "(excerpt)"').not.toMatch(/ \(excerpt\)$/);
        expect(`${e.code}\n`).toBe(file);
      }
    });
  }

  for (const doc of ['docs/guide/11-tutorial-digital-store.mdx', 'docs/guide/12-tutorial-gaming-store.mdx']) {
    it(`${doc} links the full theme and says how to run it`, () => {
      const text = readFileSync(repo(doc), 'utf8');
      expect(text).toMatch(/\*\*Full theme on GitHub:\*\*\n\[examples\/themes\/\w+\]\(https:\/\/github\.com\/hekanahq\/sneferu\/tree\/[0-9a-f]{40}\/examples\/themes\/\w+\)/);
      expect(text).toContain('git clone --depth 1 https://github.com/hekanahq/sneferu');
    });
  }
});

const themes = readdirSync(repo('examples/themes'));

describe('example README excerpts', () => {
  for (const t of themes) {
    const doc = `examples/themes/${t}/README.md`;
    if (!existsSync(repo(doc))) continue;
    for (const e of excerpts(doc)) {
      const path = e.title.replace(/ \(excerpt\)$/, '');
      if (!existsSync(repo(`examples/themes/${t}/${path}`))) continue;
      it(`${t}: ${e.title}`, () => {
        const file = readFileSync(repo(`examples/themes/${t}/${path}`), 'utf8');
        const lines = e.code.split('\n').length;
        expect(lines, 'at most 25 lines; the whole file is one click away').toBeLessThanOrEqual(25);
        expect(e.link, 'needs a "View the full file" link right after the block').toMatch(/^\[View the full file\]/);
        const m = /^([^#]+)(?:#L(\d+)-L(\d+))?$/.exec(e.href ?? '');
        expect(m?.[1], 'the link points at the file in the title').toBe(path);
        if (m?.[2]) expect(e.code).toBe(slice(file, Number(m[2]), Number(m[3])));
        else expect(`${e.code}\n`).toBe(file);
      });
    }
  }
});
