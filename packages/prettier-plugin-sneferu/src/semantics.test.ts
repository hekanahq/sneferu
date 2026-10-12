import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, fmt, formatTheme, meaning, readTheme } from './test-utils';

const repo = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));

describe('formatting never changes what a theme compiles to', () => {
  const examples = readdirSync(repo('examples/themes')).map((d) => `examples/themes/${d}`);
  for (const dir of ['packages/templates-default/theme', 'docs/examples/example-store', ...examples]) {
    it(`${dir}: identical artifact, idempotent`, async () => {
      const files = readTheme(repo(dir));
      const before = compile(files);
      expect(before.artifact, before.diagnostics.map((d) => d.message).join('\n')).toBeDefined();
      const once = await formatTheme(files);
      const after = compile(once);
      expect(after.artifact).toEqual(before.artifact);
      expect(after.artifact!.hash).toBe(before.artifact!.hash);
      const twice = await formatTheme(once);
      expect(twice.map((f) => Buffer.from(f.bytes).toString())).toEqual(once.map((f) => Buffer.from(f.bytes).toString()));
    });
  }

  // every .sneferu example in the guide (the cookbook sections and the chapter examples)
  const blocks: [string, string][] = [];
  for (const dir of ['docs/guide', 'docs']) {
    for (const f of readdirSync(repo(dir)).filter((x) => x.endsWith('.mdx'))) {
      const text = readFileSync(repo(`${dir}/${f}`), 'utf8');
      for (const m of text.matchAll(/```html title="([^"]+\.sneferu)"\n([\s\S]*?)```/g)) blocks.push([`${f} ${m[1]}`, m[2]!]);
    }
  }
  it('finds the guide examples', () => { expect(blocks.length).toBeGreaterThan(10); });
  for (const [name, src] of blocks) {
    it(`guide: ${name}`, async () => {
      const out = await fmt(src);
      expect(meaning(out)).toBe(meaning(src));
      expect(await fmt(out)).toBe(out);
    });
  }
});

describe('the shipped themes and the guide are formatted', () => {
  const examples = readdirSync(repo('examples/themes')).map((d) => `examples/themes/${d}`);
  for (const dir of ['packages/templates-default/theme', 'docs/examples/example-store', ...examples]) {
    it(dir, async () => {
      const files = readTheme(repo(dir));
      const formatted = await formatTheme(files);
      formatted.forEach((f, i) => expect(Buffer.from(f.bytes).toString(), f.path).toBe(Buffer.from(files[i]!.bytes).toString()));
    });
  }
  it('every .sneferu example in the guide is formatted, and matches its file in the example store or examples/ when it has one', async () => {
    for (const dir of ['docs/guide', 'docs']) {
      for (const f of readdirSync(repo(dir)).filter((x) => x.endsWith('.mdx'))) {
        const text = readFileSync(repo(`${dir}/${f}`), 'utf8');
        for (const m of text.matchAll(/```html title="([^"]+\.sneferu)"\n([\s\S]*?)```/g)) {
          expect(await fmt(m[2]!), `${f} ${m[1]}`).toBe(m[2]);
          const file = m[1]!.startsWith('examples/') ? repo(m[1]!) : repo(`docs/examples/example-store/${m[1]}`);
          if (existsSync(file)) expect(m[2], `${f} ${m[1]}`).toBe(readFileSync(file, 'utf8'));
        }
      }
    }
  });
});

// Random templates with random whitespace: the strongest check that the printer only
// moves whitespace where the compiler ignores it.
function rng(seed: number) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
function gen(r: () => number, depth: number): string {
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
  const ws = () => pick(['', '', ' ', '\n', '\n  ', '  \n\n ']);
  const leaf = () => pick(['hello', 'two words', '{{ p.title|upcase }}', '{{x}}', '<br>', '<img src="/a.png">', '<hk-text text="{{ a }}" size="14" />',
    '<hk-button label="Go" href="/x" />', "{% render 'card', p: p %}", '<!-- note -->', 'a&amp;b', '<hk-badge text="New" />', '<hk-block of="{{ block }}" />', 'أهلاً',
    '<a href="{{p.url}}" class="link {{ cls|downcase }}">x</a>', '<hk-heading text="{{ section.settings.title }}" level="h1" size="56" mobile-size="32" color="#FFFFFF" />',
    "<span title='{{ t(\"k\") }}'>t</span>", '<hk-schema>{"name":"X","settings":{}}</hk-schema>', '<!-- prettier-ignore -->']);
  if (depth === 0) return leaf();
  const kids = () => Array.from({ length: Math.floor(r() * 4) }, () => ws() + gen(r, depth - 1)).join('') + ws();
  const k = r();
  if (k < 0.3) return leaf();
  const tag = pick(['div', 'p', 'span', 'a', 'li', 'strong', 'hk-stack', 'hk-grid', 'hk-section', 'hk-container', 'hk-card', 'pre', 'h2', 'button', 'td']);
  if (k < 0.75) return `<${tag}${r() < 0.3 ? ' class="x"' : ''}>${kids()}</${tag}>`;
  if (k < 0.88) return `{% if a %}${kids()}${r() < 0.5 ? `{% else %}${kids()}` : ''}{% endif %}`;
  return `{% for p in products limit:3 %}${kids()}{% endfor %}`;
}

describe('random templates', () => {
  const r = rng(Number(process.env.SEED ?? 20261011));
  for (let i = 0; i < Number(process.env.FUZZ ?? 400); i++) {
    const src = Array.from({ length: 1 + Math.floor(r() * 3) }, () => gen(r, 3)).join(r() < 0.5 ? '\n' : '');
    it(`#${i}`, async () => {
      const out = await fmt(src, { printWidth: 40 + (i % 3) * 40 });
      expect(meaning(out), `${src}\n---\n${out}`).toBe(meaning(src));
      expect(await fmt(out, { printWidth: 40 + (i % 3) * 40 }), src).toBe(out);
    });
  }
});
