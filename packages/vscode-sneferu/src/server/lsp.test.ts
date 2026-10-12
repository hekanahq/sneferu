import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILTERS, LOOKUPS } from '@hekana/sneferu-core';
import { buildData } from './gen';
import { complete } from './completion';
import { hover } from './hover';
import { definition, links } from './navigation';
import { checkTheme } from './diagnostics';
import { formatDocument } from './format';
import { indexTheme } from './theme';
import { closingTagFor, contextAt, tagPair } from './context';
import { formatText } from '../../../sneferu/src/commands/format';
import type { Env } from './model';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const data = buildData((p) => readFileSync(join(repo, p), 'utf8'));
const STARTER = join(repo, 'packages/vscode-sneferu/test/fixtures/starter');
const ARCADE = join(repo, 'examples/themes/arcade');

/** `§` marks the cursor. */
function envAt(root: string, rel: string, src: string): Env {
  const offset = src.indexOf('§');
  const text = src.slice(0, offset) + src.slice(offset + 1);
  const theme = indexTheme(root, new Map([[join(root, rel), text]]));
  return { data, theme, rel, text, offset };
}
const labels = (env: Env) => complete(env).map((c) => c.label);

describe('language data (generated from the SDK docs)', () => {
  it('has every tag in tags.json and the language built-ins', () => {
    const json = JSON.parse(readFileSync(join(repo, 'docs/reference/tags.json'), 'utf8')) as { tags: { name: string }[] };
    for (const t of json.tags) expect(data.tags.map((x) => x.name)).toContain(t.name);
    expect(data.tags.map((x) => x.name)).toEqual(expect.arrayContaining(['hk-schema', 'hk-slot', 'hk-sections', 'hk-block']));
  });
  it('has every filter and lookup the compiler knows, each documented', () => {
    expect(data.filters.map((f) => f.name)).toEqual([...FILTERS]);
    expect(data.lookups.map((f) => f.name)).toEqual([...LOOKUPS]);
    for (const f of data.filters) expect(f.doc, f.name).not.toBe('');
  });
  it('has the diagnostics reference', () => {
    expect(data.diagnostics.find((d) => d.code === 'SN2003')?.meaning).toMatch(/Unknown `hk-\*` tag/);
    expect(data.diagnostics.length).toBeGreaterThan(50);
  });
});

describe('completion', () => {
  it('hk tags after <', () => {
    const items = complete(envAt(STARTER, 'sections/hero.sneferu', '<hk-§'));
    expect(items.map((i) => i.label)).toEqual(expect.arrayContaining(['hk-image', 'hk-product-grid', 'hk-stack']));
    const img = items.find((i) => i.label === 'hk-image')!;
    expect(img.insertText).toMatch(/ \/>$/); // no children: self-closing
    expect(items.find((i) => i.label === 'hk-stack')!.insertText).toContain('</hk-stack>');
  });
  it('hk-slot only where it is allowed', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '<§'))).not.toContain('hk-slot');
    expect(labels(envAt(STARTER, 'layout/theme.sneferu', '<§'))).toContain('hk-slot');
  });
  it('props with enum values and responsive variants', () => {
    const env = envAt(STARTER, 'sections/hero.sneferu', '<hk-stack direction="row" §');
    const l = labels(env);
    expect(l).toEqual(expect.arrayContaining(['gap', 'tablet-gap', 'mobile-direction', 'align', 'class']));
    expect(l).not.toContain('direction'); // already written
    expect(l).not.toContain('tablet-align'); // not responsive
    const align = complete(env).find((i) => i.label === 'align')!;
    expect(align.insertText).toBe('align="${1|start,center,end,stretch|}"');
  });
  it('enum values inside an attribute', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '<hk-image aspect-ratio="§'))).toEqual(['1/1', '4/5', '3/4', '16/9', '21/9']);
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '<hk-section background="§'))).toContain('theme:accent');
  });
  it('filters after |', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '{{ p.price | mo§ }}'))).toEqual(expect.arrayContaining(['money', 'truncate', 'json_attr']));
  });
  it("section.settings from the file's own schema", () => {
    const src = readFileSync(join(STARTER, 'sections/hero.sneferu'), 'utf8');
    const l = labels(envAt(STARTER, 'sections/hero.sneferu', `{{ section.settings.§ }}\n${src}`));
    expect(l).toEqual(['title', 'subtitle']);
  });
  it('section, product, collection and loop variables', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '{{ section.§ }}'))).toEqual(['id', 'type', 'settings', 'blocks']);
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', "{% for p in collection('featured').products %}{{ p.§ }}{% endfor %}"))).toEqual(expect.arrayContaining(['title', 'url', 'price', 'compare_at', 'image']));
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', "{{ collection('x').§ }}"))).toEqual(['title', 'products']);
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '{% for b in section.blocks %}{{ b.settings.§ }}{% endfor %}'))).toEqual(['label']); // blocks/chip.sneferu
    const top = labels(envAt(STARTER, 'sections/hero.sneferu', '{% for p in x %}{{ § }}{% endfor %}'));
    expect(top).toEqual(expect.arrayContaining(['store', 'section', 'forloop', 'p', 'collection', 't']));
    expect(labels(envAt(STARTER, 'layout/theme.sneferu', '{{ § }}'))).not.toContain('section');
  });
  it("t('…') keys from the locales, snippet names for render", () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', "{{ t('§') }}"))).toEqual(['shop_now']);
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', "{{ '§' | t }}"))).toEqual(['shop_now']);
    expect(labels(envAt(ARCADE, 'blocks/chip.sneferu', "{% render '§' %}"))).toEqual(['glyph']);
  });
  it('directives after {%', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '{% §'))).toEqual(['if', 'elsif', 'else', 'endif', 'for', 'endfor', 'render']);
  });
  it('field types inside <hk-schema>', () => {
    expect(labels(envAt(STARTER, 'sections/hero.sneferu', '<hk-schema>{ "settings": { "a": { "type": "§" } } }</hk-schema>'))).toEqual(expect.arrayContaining(['text', 'range', 'select', 'color', 'product']));
  });
});

describe('hover', () => {
  const h = (src: string, root = STARTER, rel = 'sections/hero.sneferu') => hover(envAt(root, rel, src))?.markdown ?? '';
  it('tags and props from tags.json', () => {
    expect(h('<hk-im§age src="x" />')).toContain('`<hk-image>` · Image');
    expect(h('<hk-image aspect-r§atio="1/1" />')).toMatch(/aspect-ratio.*Aspect ratio/s);
    expect(h('<hk-grid mobile-col§umns="2" />')).toContain('mobile-columns');
  });
  it('filters, lookups and scope', () => {
    expect(h('{{ x | mon§ey }}')).toContain('minor units');
    expect(h("{{ collec§tion('a') }}")).toContain('lookup');
    expect(h('{{ sto§re.name }}')).toContain('the store');
  });
  it('settings and translations', () => {
    const src = readFileSync(join(STARTER, 'sections/hero.sneferu'), 'utf8').replace('section.settings.title', 'section.settings.ti§tle');
    expect(h(src)).toMatch(/\*\*title\*\* · setting \(`text`\)[\s\S]*Default: `"Hello"`/);
    expect(h("{{ t('shop_n§ow') }}")).toContain('**en**: Shop now');
  });
});

describe('definition and links', () => {
  it("render 'glyph' → snippets/glyph.sneferu, t('key') → every locale", () => {
    expect(definition(envAt(ARCADE, 'blocks/chip.sneferu', "{% render 'gly§ph', name: 'coin' %}"))).toEqual([{ rel: 'snippets/glyph.sneferu', offset: 0, length: 0 }]);
    const t = definition(envAt(ARCADE, 'sections/arcade-products.sneferu', "{{ t('view_a§ll') }}"));
    expect(t.map((x) => x.rel).sort()).toEqual(['locales/ar.json', 'locales/en.json']);
    const en = readFileSync(join(ARCADE, 'locales/en.json'), 'utf8');
    const loc = t.find((x) => x.rel === 'locales/en.json')!;
    expect(en.slice(loc.offset, loc.offset + loc.length)).toBe('"view_all"');
  });
  it('a setting → its schema entry', () => {
    const src = readFileSync(join(STARTER, 'sections/hero.sneferu'), 'utf8');
    const env = envAt(STARTER, 'sections/hero.sneferu', src.replace('section.settings.subtitle', 'section.settings.sub§title'));
    const [d] = definition(env);
    expect(env.text.slice(d!.offset, d!.offset + d!.length)).toBe('"subtitle"');
  });
  it("a template's section type → the section file; document links", () => {
    const src = readFileSync(join(STARTER, 'templates/index.sneferu'), 'utf8');
    expect(definition(envAt(STARTER, 'templates/index.sneferu', src.replace('"hero"', '"he§ro"')))).toEqual([{ rel: 'sections/hero.sneferu', offset: 0, length: 0 }]);
    const l = links(src, 'templates/index.sneferu', indexTheme(STARTER));
    expect(l.map((x) => x.rel)).toEqual(['sections/hero.sneferu', 'sections/featured.sneferu']);
    expect(src.slice(l[0]!.offset, l[0]!.offset + l[0]!.length)).toBe('hero');
  });
});

describe('diagnostics: the compiler, live', () => {
  it('the starter and every example theme compile without errors', () => {
    for (const t of [STARTER, join(repo, 'packages/templates-default/theme'), ...['arcade', 'bento', 'console', 'creator', 'esports', 'license'].map((n) => join(repo, 'examples/themes', n))]) {
      expect(checkTheme(t, new Map()).problems.filter((p) => p.severity === 'error'), t).toEqual([]);
    }
  });
  it('unsaved text is checked, with the SN code and the exact range', () => {
    const file = join(STARTER, 'sections/hero.sneferu');
    const text = readFileSync(file, 'utf8').replace('<hk-heading', '<hk-headin');
    const { problems } = checkTheme(STARTER, new Map([[file, text]]));
    const p = problems.find((x) => x.code === 'SN2003')!;
    expect(p.rel).toBe('sections/hero.sneferu');
    expect(text.slice(p.start, p.end)).toBe('<hk-headin');
    expect(p.message).toContain('Did you mean "hk-heading"');
  });
  it('syntax errors and bad attributes', () => {
    const file = join(STARTER, 'sections/featured.sneferu');
    const text = readFileSync(file, 'utf8') + '\n<hk-text text="{{ x }}" colour="red" />\n{{ broken';
    const { problems } = checkTheme(STARTER, new Map([[file, text]]));
    expect(problems.map((p) => p.code)).toContain('SN1001');
  });
  it('theme.json problems point at the key', () => {
    const file = join(STARTER, 'theme.json');
    const text = readFileSync(file, 'utf8').replace('"engine": "hk2"', '"engine": "hk2", "x": 1').replace('"version": "0.1.0"', '"version": "1"');
    const { problems } = checkTheme(STARTER, new Map([[file, text]]));
    const p = problems.find((x) => x.code === 'SN3014')!;
    expect(text.slice(p.start, p.end)).toBe('"version"');
  });
});

describe('theme checks', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'snf-checks-'));
    cpSync(STARTER, dir, { recursive: true });
    writeFileSync(join(dir, 'locales/en.json'), '{ "shop_now": "Shop now", "only_en": "Only English" }');
    writeFileSync(join(dir, 'locales/ar.json'), '{ "shop_now": "x" }');
    writeFileSync(join(dir, 'snippets.txt'), '');
    rmSync(join(dir, 'snippets.txt'));
    cpSync(join(ARCADE, 'snippets/glyph.sneferu'), join(dir, 'snippets/unused.sneferu'));
    writeFileSync(join(dir, 'assets/big.css'), 'a{}'.repeat(200_000));
    writeFileSync(join(dir, 'sections/extra.sneferu'), [
      '<hk-section>',
      '  <hk-image src="{{ section.settings.pic }}" />',
      '  <img src="/x.png" alt="">',
      "  <hk-text text=\"{{ t('missing_key') }} {{ section.settings.nope }}\" />",
      "  <a href=\"{{ asset_url('nothing.svg') }}\">x</a>",
      '</hk-section>',
      '<hk-schema>',
      '{ "name": "Extra", "settings": {',
      '  "pic": { "type": "image", "label": "Picture" },',
      '  "unused": { "type": "text", "label": "عنوان" }',
      '} }',
      '</hk-schema>',
    ].join('\n'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reports each check where it applies', () => {
    const { problems } = checkTheme(dir, new Map());
    const by = (code: string) => problems.filter((p) => p.code === code).map((p) => `${p.rel}: ${p.message}`);
    expect(by('ImgAltText')).toEqual(['sections/extra.sneferu: <hk-image> has no alt text; describe the image, or write alt="" if it is decorative']);
    expect(by('UnusedSetting')).toEqual(expect.arrayContaining(['sections/extra.sneferu: setting "unused" is never read (section.settings.unused)', 'theme.json: theme setting "accent" is not read by any template (settings.accent)']));
    expect(by('UndefinedSetting')).toEqual(['sections/extra.sneferu: "nope" is not a setting of this section; it is always empty']);
    expect(by('TranslationKeyExists')).toEqual(['sections/extra.sneferu: "missing_key" is not in locales/en.json; the page shows the key itself']);
    expect(by('MatchingTranslations')).toEqual(['locales/en.json: "only_en" has no ar translation (locales/ar.json)']);
    expect(by('SchemaLabelEnglish')).toEqual(['sections/extra.sneferu: label of setting "unused" is Arabic only: write { "en": "…", "ar": "…" }']);
    expect(by('AssetSize')).toEqual(['assets/big.css: assets/big.css is 586 KB (budget 500 KB); compress it or serve a smaller file']);
    expect(by('MissingAsset')).toEqual(['sections/extra.sneferu: assets/nothing.svg does not exist']);
    expect(by('OrphanedSnippet')).toEqual(['snippets/unused.sneferu: snippet "unused" is never rendered']);
    // every check links somewhere and none of them is an error
    expect(problems.filter((p) => p.source === 'sneferu-check' && p.severity === 'error')).toEqual([]);
  });
  it('checks can be turned off', () => {
    const { problems } = checkTheme(dir, new Map(), { disabled: ['OrphanedSnippet', 'AssetSize'] });
    expect(problems.some((p) => p.code === 'OrphanedSnippet' || p.code === 'AssetSize')).toBe(false);
    expect(checkTheme(dir, new Map(), { checks: false }).problems.some((p) => p.source === 'sneferu-check')).toBe(false);
  });
});

describe('formatting', () => {
  it('formats like `sneferu format` and refuses to change meaning', async () => {
    const file = join(ARCADE, 'sections/arcade-products.sneferu');
    const messy = readFileSync(file, 'utf8').replace(/\n {2,}/g, '\n').replace('<hk-stack gap="20">', '<hk-stack    gap="20"   >');
    const ours = await formatDocument(file, messy, { root: ARCADE });
    expect(ours).toBe(await formatText(file, messy));
    expect(ours).toBe(readFileSync(file, 'utf8'));
    expect(await formatDocument(file, '{{ broken', { root: ARCADE })).toBeUndefined();
    const json = join(ARCADE, 'locales/en.json');
    expect(await formatDocument(json, '{"a":"b",\n"c":"d"}')).toBe('{ "a": "b", "c": "d" }\n');
  });
});

describe('editing helpers', () => {
  it('linked editing finds the pair', () => {
    const t = '<div class="a"><hk-stack gap="4">{{ a > b }}</hk-stack></div>';
    const r = tagPair(t, t.indexOf('hk-stack') + 2)!;
    expect(r.map(([s, e]) => t.slice(s, e))).toEqual(['hk-stack', 'hk-stack']);
    expect(r[1]![0]).toBe(t.indexOf('/hk-stack') + 1);
  });
  it('closing tags', () => {
    expect(closingTagFor('<hk-stack gap="{{ a }}">', '')).toBe('</hk-stack>');
    expect(closingTagFor('<hk-image src="a" />', '')).toBeUndefined();
    expect(closingTagFor('<br>', '')).toBeUndefined();
    expect(closingTagFor('<div>', '</div>')).toBeUndefined();
  });
  it('context: expression inside an attribute value', () => {
    const c = contextAt('<hk-heading text="{{ section.', 29);
    expect(c).toMatchObject({ k: 'expr', inAttr: { tag: 'hk-heading', attr: 'text' } });
  });
});
